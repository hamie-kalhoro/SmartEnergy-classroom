"""Forecasts the classroom board's load stage from its live sensor events.

This model is independent of ml_engine.py. That model predicts timetable attendance
from academic history; this one predicts the next minute from sensor activity. They
share no data or files, so neither can affect the other. The forecast is advisory:
the board's firmware alone decides what switches.

Until enough real sessions are recorded, training relies on simulated sessions, and
the model's metadata says so.
"""
import bisect
import logging
import os
import random
import threading
import time
from datetime import datetime, timezone

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import GroupShuffleSplit

from hardware_bridge import load_for_students
from hardware_store import DATA_DIR, store as default_store

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(DATA_DIR, 'forecast_model.joblib')
MODEL_VERSION = 1
HORIZON_SECONDS = 60
SAMPLE_STEP_SECONDS = 10
RECENT_SHORT_SECONDS = 60
RECENT_LONG_SECONDS = 300
MAX_IDLE_SECONDS = 900
IDLE_PADDING_SECONDS = 300
FULL_LOAD_STUDENTS = 6
SIMULATED_SESSIONS = 300
REAL_SAMPLE_WEIGHT = 3
FORECAST_CACHE_SECONDS = 2

FEATURES = [
    'students', 'load_percent', 'students_to_full_load',
    'entries_last_minute', 'exits_last_minute', 'net_flow_last_minute',
    'entries_last_5_minutes', 'exits_last_5_minutes', 'seconds_since_last_event',
]


def _recent(times, now, window):
    return bisect.bisect_right(times, now) - bisect.bisect_left(times, now - window)


def build_features(now, students, entry_times, exit_times, last_event_time):
    entries_short = _recent(entry_times, now, RECENT_SHORT_SECONDS)
    exits_short = _recent(exit_times, now, RECENT_SHORT_SECONDS)
    idle = MAX_IDLE_SECONDS if last_event_time is None else min(now - last_event_time, MAX_IDLE_SECONDS)
    return [
        students, load_for_students(students), max(0, FULL_LOAD_STUDENTS - students),
        entries_short, exits_short, entries_short - exits_short,
        _recent(entry_times, now, RECENT_LONG_SECONDS), _recent(exit_times, now, RECENT_LONG_SECONDS), idle,
    ]


def samples_from_session(events):
    """Turn one session's events into (features, load one horizon later, current load)."""
    moves = [e for e in events if e[1] in ('entry', 'exit')]
    if not moves:
        return []

    first_time, first_type, first_students = moves[0]
    initial = first_students - 1 if first_type == 'entry' else first_students + 1
    change_times = [e[0] for e in moves]
    counts = [e[2] for e in moves]

    def students_at(moment):
        index = bisect.bisect_right(change_times, moment) - 1
        return max(0, initial if index < 0 else counts[index])

    entry_times = [e[0] for e in moves if e[1] == 'entry']
    exit_times = [e[0] for e in moves if e[1] == 'exit']

    # Include the quiet time around the activity, or the model never learns what an
    # idle room looks like and invents changes when nothing is happening.
    samples = []
    moment = first_time - IDLE_PADDING_SECONDS
    while moment <= change_times[-1] + IDLE_PADDING_SECONDS:
        index = bisect.bisect_right(change_times, moment) - 1
        last_event = change_times[index] if index >= 0 else None
        students = students_at(moment)
        samples.append((
            build_features(moment, students, entry_times, exit_times, last_event),
            load_for_students(students_at(moment + HORIZON_SECONDS)),
            load_for_students(students),
        ))
        moment += SAMPLE_STEP_SECONDS
    return samples


def _simulate_class(rng):
    """A class gathers, stays, then leaves, at a pace that differs per session."""
    events, now, students = [], 0.0, 0
    arrival_gap = rng.choice([3, 8, 20, 45])
    for _ in range(rng.randint(1, 25)):
        now += rng.expovariate(1 / arrival_gap)
        students += 1
        events.append((now, 'entry', students))
    now += rng.uniform(60, 300)
    leave_gap = rng.choice([2, 5, 15])
    while students > 0:
        now += rng.expovariate(1 / leave_gap)
        students -= 1
        events.append((now, 'exit', students))
    return events


def _simulate_walkthrough(rng):
    """Small groups passing the sensors in quick bursts, as in a live demonstration."""
    events, now, students = [], 0.0, 0
    for _ in range(rng.randint(1, 4)):
        for _ in range(rng.randint(1, 8)):
            now += rng.expovariate(1 / rng.uniform(3, 10))
            students += 1
            events.append((now, 'entry', students))
        now += rng.uniform(5, 40)
        for _ in range(rng.randint(0, students)):
            now += rng.expovariate(1 / rng.uniform(3, 10))
            students -= 1
            events.append((now, 'exit', students))
        now += rng.uniform(5, 40)
    return events


def _simulate_trickle(rng):
    """People wandering in and out with no clear pattern."""
    events, now, students = [], 0.0, 0
    gap = rng.uniform(20, 90)
    for _ in range(rng.randint(20, 60)):
        now += rng.expovariate(1 / gap)
        if students > 0 and rng.random() < 0.45:
            students -= 1
            events.append((now, 'exit', students))
        else:
            students += 1
            events.append((now, 'entry', students))
    return events


def simulate_sessions(count=SIMULATED_SESSIONS, seed=42):
    rng = random.Random(seed)
    generators = (_simulate_class, _simulate_walkthrough, _simulate_trickle)
    return [generators[i % len(generators)](rng) for i in range(count)]


def _score(y_true, y_pred):
    return {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'macro_f1': float(f1_score(y_true, y_pred, average='macro', zero_division=0)),
    }


def _new_model():
    return RandomForestClassifier(
        n_estimators=120, max_depth=14, min_samples_leaf=20, random_state=42, n_jobs=-1,
    )


def train_model(real_sessions, simulated_sessions=None):
    """Train on simulated and recorded sessions and score against a no-change baseline.

    Whole sessions are held out, so test samples are never neighbours of training samples.
    """
    simulated = simulate_sessions() if simulated_sessions is None else simulated_sessions
    X, y, current, groups, is_real = [], [], [], [], []
    for group, (session, real) in enumerate([(s, False) for s in simulated] + [(s, True) for s in real_sessions]):
        for features, future_load, current_load in samples_from_session(session):
            X.append(features)
            y.append(future_load)
            current.append(current_load)
            groups.append(group)
            is_real.append(real)
    if not X:
        raise ValueError('No training samples available.')

    train_idx, test_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(X, y, groups))
    weights = [REAL_SAMPLE_WEIGHT if real else 1 for real in is_real]

    evaluator = _new_model()
    evaluator.fit([X[i] for i in train_idx], [y[i] for i in train_idx], sample_weight=[weights[i] for i in train_idx])
    y_test = [y[i] for i in test_idx]
    predicted = list(evaluator.predict([X[i] for i in test_idx]))
    baseline = [current[i] for i in test_idx]

    changes = [n for n, i in enumerate(test_idx) if y[i] != current[i]]
    changes_caught = sum(predicted[n] == y_test[n] for n in changes) / len(changes) if changes else None
    steady = [n for n, i in enumerate(test_idx) if y[i] == current[i]]
    false_alarms = sum(predicted[n] != y_test[n] for n in steady) / len(steady) if steady else None

    real_test = [n for n, i in enumerate(test_idx) if is_real[i]]
    real_scores = None
    if real_test:
        real_y = [y_test[n] for n in real_test]
        real_scores = {
            'samples': len(real_test),
            'model': _score(real_y, [predicted[n] for n in real_test]),
            'baseline': _score(real_y, [baseline[n] for n in real_test]),
        }

    model = _new_model()
    model.fit(X, y, sample_weight=weights)
    model.n_jobs = 1  # Live forecasts score one row, where extra threads only add delay.

    return {
        'version': MODEL_VERSION,
        'features': FEATURES,
        'model': model,
        'meta': {
            'algorithm': 'Random forest',
            'horizon_seconds': HORIZON_SECONDS,
            'trained_at': datetime.now(timezone.utc).isoformat(),
            'simulated_sessions': len(simulated),
            'real_sessions': len(real_sessions),
            'samples': len(X),
            'test_samples': len(test_idx),
            'metrics': {
                'model': _score(y_test, predicted),
                'baseline': _score(y_test, baseline),
                'changes_caught': changes_caught,
                'change_samples': len(changes),
                'false_alarms': false_alarms,
                'real': real_scores,
            },
        },
    }


def _events_since_boot(snapshot):
    """Split the bridge's newest-first events into entry and exit times since the last restart."""
    entries, exits = [], []
    for event in snapshot.get('events', []):
        if event['type'] == 'boot':
            break
        if event['type'] in ('entry', 'exit'):
            at = datetime.fromisoformat(event['at']).timestamp()
            (entries if event['type'] == 'entry' else exits).append(at)
    return sorted(entries), sorted(exits)


class HardwareForecaster:
    def __init__(self, model_path=MODEL_PATH, event_store=default_store):
        self.model_path = model_path
        self.event_store = event_store
        self._lock = threading.Lock()
        self._bundle = None
        self._training = False
        self._error = None
        self._cache_key = None
        self._cache_value = None
        self._cache_time = 0

    def start(self):
        """Load the saved model, or train one in the background if there is none."""
        threading.Thread(target=self._load_or_train, daemon=True, name='hardware-ml-start').start()

    def retrain(self):
        """Begin background training. Returns False if training is already running."""
        with self._lock:
            if self._training:
                return False
            self._training = True
            self._error = None
        threading.Thread(target=self._train, daemon=True, name='hardware-ml-train').start()
        return True

    def _load_or_train(self):
        if os.path.exists(self.model_path):
            try:
                bundle = joblib.load(self.model_path)
                if bundle.get('version') == MODEL_VERSION and bundle.get('features') == FEATURES:
                    with self._lock:
                        self._bundle = bundle
                    return
                logger.info('Hardware forecast model is out of date; retraining.')
            except Exception:
                logger.exception('Could not load the hardware forecast model; retraining.')
        self.retrain()

    def _train(self):
        try:
            bundle = train_model(self.event_store.load_sessions())
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            temp_path = f'{self.model_path}.tmp'
            joblib.dump(bundle, temp_path)
            os.replace(temp_path, self.model_path)
            with self._lock:
                self._bundle = bundle
                self._training = False
                self._cache_key = None
        except Exception as e:
            logger.exception('Hardware forecast training failed.')
            with self._lock:
                self._training = False
                self._error = str(e)

    def forecast(self, snapshot):
        with self._lock:
            bundle, training, error = self._bundle, self._training, self._error
        meta = bundle['meta'] if bundle else None
        base = {'training': training, 'error': error, 'model': meta, 'horizon_seconds': HORIZON_SECONDS}

        if not bundle:
            return {**base, 'status': 'training' if training else 'unavailable'}
        if not snapshot.get('connected') or snapshot.get('students') is None:
            return {**base, 'status': 'waiting'}

        key = (id(bundle), snapshot['students'], snapshot.get('last_event_at'))
        now = time.time()
        if key == self._cache_key and now - self._cache_time < FORECAST_CACHE_SECONDS:
            return {**self._cache_value, **base}

        students = snapshot['students']
        entries, exits = _events_since_boot(snapshot)
        last_event = max(entries[-1:] + exits[-1:], default=None)
        features = build_features(now, max(0, students), entries, exits, last_event)

        model = bundle['model']
        probabilities = model.predict_proba([features])[0]
        by_load = {int(load): float(p) for load, p in zip(model.classes_, probabilities)}
        predicted = max(by_load, key=by_load.get)
        current = snapshot.get('load_percent')

        result = {
            'status': 'ready',
            'current_load': current,
            'predicted_load': predicted,
            'probabilities': {str(load): by_load.get(load, 0.0) for load in (0, 50, 100)},
            'signals': {'entries_last_minute': features[3], 'exits_last_minute': features[4]},
        }
        self._cache_key, self._cache_value, self._cache_time = key, result, now
        return {**result, **base}


forecaster = HardwareForecaster()
