from datetime import timezone
import re
import time
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import joblib
import os
import json
from datetime import datetime
from climate_service import get_climate_context, get_device_overrides

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'occupancy_model.pkl')
MASTER_HISTORY_PATH = os.path.join(BASE_DIR, 'data', 'processed_history.csv')
TRAINING_LOG_PATH = os.path.join(BASE_DIR, 'data', 'training_history.json')

# The model predicts the occupancy level of an UPCOMING class. It may only use what is
# known before the class starts: the schedule (day, hour, type, batch, section, week)
# and attendance of the same class in PREVIOUS weeks. The class's own attendance is the
# target, so it must never be a feature (that was the cause of the old ~100% accuracy).
FEATURES = ['day', 'hour', 'type', 'batch', 'section', 'week', 'hist_attendance', 'prev_attendance']
HISTORY_COLUMNS = ['semester', 'week', 'day', 'hour', 'batch', 'section', 'subject', 'type', 'attendance']
CLASS_KEY = ['semester', 'batch', 'section', 'subject']
LEVELS = {0: 'Empty', 1: 'Trace', 2: 'Light', 3: 'Balanced', 4: 'Maximum'}
DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
LAG_WINDOW = 6          # recent class meetings averaged into hist_attendance
DEFAULT_HIST = 75.0     # prior for a class with no attendance history yet
TEST_FRACTION = 0.2     # most recent 20% of records are held out for evaluation
MAX_HISTORY = 10000

_shared_ml_engine = None

def get_ml_engine():
    """Singleton getter to prevent re-loading the model on every request."""
    global _shared_ml_engine
    if _shared_ml_engine is None:
        _shared_ml_engine = MLEngine()
    return _shared_ml_engine


def level_for(pct):
    """5-Level labelling of an attendance percentage."""
    if pct <= 5: return 0    # Empty (0-5%)
    if pct <= 25: return 1   # Trace (6-25%) - Min Comfort Active
    if pct <= 50: return 2   # Light (26-50%)
    if pct <= 75: return 3   # Balanced (51-75%)
    return 4                 # Maximum (76-100%)


def parse_hour(x):
    """'08:00', '2:00 PM', 14, '14.0' -> 24h integer hour."""
    try:
        s = str(x).strip().upper()
        h_str = s.replace('AM', '').replace('PM', '').strip()
        h = int(h_str.split(':')[0]) if ':' in h_str else int(float(h_str))
        if 'PM' in s and h != 12:
            h += 12
        elif 'AM' in s and h == 12:
            h = 0
        return h
    except (ValueError, TypeError):
        return 8


def parse_day(x):
    s = str(x).strip()
    if s.isdigit():
        return int(s)
    return DAY_NAMES.index(s.capitalize()) if s.capitalize() in DAY_NAMES else 0


def parse_batch(value, subject=''):
    """1-4 from 'Batch 3' / 3 / subject text; 0 when unknown."""
    if value is not None and not pd.isna(value):
        m = re.search(r'\d+', str(value))
        if m:
            return int(m.group())
    m = re.search(r'Batch\s*(\d+)', str(subject), re.I)
    return int(m.group(1)) if m else 0


def parse_section(value, subject=''):
    """Section I -> 1, Section II -> 2 (also accepts 1/2); 0 when unknown."""
    roman = {'I': 1, 'II': 2, '1': 1, '2': 2}
    if value is not None and not pd.isna(value):
        token = str(value).upper().replace('SECTION', '').strip(' ()')
        if token.endswith('.0'):
            token = token[:-2]
        if token in roman:
            return roman[token]
    m = re.search(r'Section\s*(II|I|\d)\b', str(subject), re.I)
    return roman.get(m.group(1).upper(), 0) if m else 0


class MLEngine:
    def __init__(self):
        self.model = None
        self.default_week = 8
        self.hist_range = (0.0, 100.0)
        self.last_training_report = None
        self.retrain_threshold = 50 # Retrain every 50 new real-world data points
        self.new_data_count = 0
        self._profile_cache = None
        self._profile_cache_time = 0

        os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)

        if os.path.exists(TRAINING_LOG_PATH):
            try:
                with open(TRAINING_LOG_PATH, 'r') as f:
                    log = json.load(f)
                    if log:
                        self.last_training_report = log[-1]
            except (OSError, ValueError):
                pass

        try:
            bundle = joblib.load(MODEL_PATH)
            if isinstance(bundle, dict) and bundle.get('features') == FEATURES:
                self.model = bundle['model']
                self.default_week = bundle.get('default_week', 8)
                self.hist_range = tuple(bundle.get('hist_range', (0.0, 100.0)))
        except Exception:
            self.model = None

        if self.model is None:
            # Stale model from an older feature set (or missing file): retrain from history
            # when it is in the current format, otherwise seed from the generated dataset.
            report, _ = self.train_from_history()
            if report is None:
                self.train_initial_model()

    # ------------------------------------------------------------------ data prep
    def _normalize(self, df):
        """Map any supported CSV layout onto HISTORY_COLUMNS with numeric encodings."""
        df = df.copy()
        df.columns = [str(c).lower().strip() for c in df.columns]
        if 'occupancy_pct' in df.columns:
            df['attendance'] = df['occupancy_pct']
        if 'hour' not in df.columns:
            df['hour'] = df['start_time'] if 'start_time' in df.columns else df.get('time', 8)

        out = pd.DataFrame(index=df.index)
        subject = df['subject'].fillna('unknown').astype(str) if 'subject' in df.columns else pd.Series('unknown', index=df.index)
        out['semester'] = df['semester'].fillna('unknown').astype(str) if 'semester' in df.columns else 'unknown'
        out['week'] = pd.to_numeric(df['week'], errors='coerce').fillna(0).astype(int) if 'week' in df.columns else 0
        out['day'] = df['day'].apply(parse_day) if 'day' in df.columns else 0
        out['hour'] = df['hour'].apply(parse_hour).astype(int)
        batch_col = df['batch'] if 'batch' in df.columns else pd.Series(None, index=df.index)
        section_col = df['section'] if 'section' in df.columns else pd.Series(None, index=df.index)
        out['batch'] = [parse_batch(b, s) for b, s in zip(batch_col, subject)]
        out['section'] = [parse_section(v, s) for v, s in zip(section_col, subject)]
        out['subject'] = subject
        out['type'] = (df['type'].apply(lambda x: 1 if str(x).lower().strip() in ['lab', 'practical', '1'] else 0)
                       if 'type' in df.columns else 0)
        out['attendance'] = (pd.to_numeric(df['attendance'], errors='coerce').clip(0, 100)
                             if 'attendance' in df.columns else np.nan)
        return out[HISTORY_COLUMNS]

    def _add_lag_features(self, df):
        """hist/prev attendance from earlier meetings of the same class only (rows are chronological)."""
        df = df.copy()
        # Cancelled / holiday meetings (Empty) say nothing about how many students normally come
        held = df['attendance'].where(df['attendance'] > 5)
        g = held.groupby([df[k] for k in CLASS_KEY], sort=False)
        df['prev_attendance'] = g.transform(lambda s: s.shift(1).ffill())
        df['hist_attendance'] = g.transform(lambda s: s.shift(1).rolling(LAG_WINDOW, min_periods=1).mean())
        df['hist_attendance'] = df['hist_attendance'].fillna(DEFAULT_HIST)
        df['prev_attendance'] = df['prev_attendance'].fillna(df['hist_attendance'])
        df['label'] = df['attendance'].apply(level_for)
        return df

    def _load_history(self):
        if not os.path.exists(MASTER_HISTORY_PATH):
            return None
        df = pd.read_csv(MASTER_HISTORY_PATH)
        if not set(HISTORY_COLUMNS).issubset(df.columns):
            return None  # legacy format (attendance used as a feature) - not reusable
        df['semester'] = df['semester'].astype(str)
        df['subject'] = df['subject'].astype(str)
        return df.dropna(subset=['attendance'])

    def _save_history(self, df):
        df.tail(MAX_HISTORY)[HISTORY_COLUMNS].to_csv(MASTER_HISTORY_PATH, index=False)

    # ------------------------------------------------------------------ training
    def train_initial_model(self):
        """Seed the model from the generated morning-shift attendance dataset."""
        from generate_academic_data import generate_datasets
        attendance_df, _ = generate_datasets(write=True)
        self.reset_history_and_train(attendance_df)
        return "Model initialized from generated academic attendance data"

    def reset_history_and_train(self, df):
        """Replace the whole knowledge base with df (e.g. a freshly generated dataset) and retrain."""
        self._save_history(self._normalize(df).dropna(subset=['attendance']))
        if os.path.exists(TRAINING_LOG_PATH):
            os.remove(TRAINING_LOG_PATH)
        self.last_training_report = None
        return self.train_from_history()

    def digest_and_train(self, new_df):
        """Absorb new data into cumulative history and retrain."""
        processed_new = self._normalize(new_df).dropna(subset=['attendance'])
        if processed_new.empty:
            return None, "No usable rows: the CSV needs an 'attendance' column (percentage 0-100)."

        history_df = self._load_history()
        cumulative_df = processed_new if history_df is None else pd.concat([history_df, processed_new], ignore_index=True)
        self._save_history(cumulative_df)
        return self.train_from_history()

    def get_intelligence_profile(self):
        """Retrieve the AI's current knowledge status and experience metrics (cached for 60s)."""
        if self._profile_cache and (time.time() - self._profile_cache_time < 60):
            return self._profile_cache

        history = []
        if os.path.exists(TRAINING_LOG_PATH):
            with open(TRAINING_LOG_PATH, 'r') as f:
                history = json.load(f)

        df = self._load_history()
        if df is None:
            profile = {
                "total_hours": 0,
                "coverage_pct": 0,
                "accuracy": 0,
                "evolution_level": "Observant Seedling",
                "scenarios_mastered": 0,
                "history": [],
                "delta": 0,
                "recommendations": []
            }
            self._profile_cache = profile
            self._profile_cache_time = time.time()
            return profile

        total_hours = len(df)

        # Scenario Coverage: (Day x Hour x Type) within the morning shift
        # 5 weekdays * 7 slots (08:00-14:00) * 2 types (Theory/Lab) = 70 essential scenarios
        essential_scenarios = 5 * 7 * 2
        df_active = df[(df['hour'] >= 8) & (df['hour'] <= 14) & (df['day'] <= 4)]
        mastered_count = len(df_active.groupby(['day', 'hour', 'type']).size())
        coverage_pct = min(100, round((mastered_count / essential_scenarios) * 100, 1))

        # Evolution Level based on knowledge coverage and data depth
        if coverage_pct < 25: level = "Observant Seedling"
        elif coverage_pct < 45: level = "Knowledge Gatherer"
        elif coverage_pct < 65: level = "Pattern Engine"
        elif coverage_pct < 85: level = "Strategic Analyst"
        else: level = "Intelligence Core"

        # Calculate Delta from last training
        delta = 0
        if len(history) >= 2:
            delta = history[-1]['accuracy'] - history[-2]['accuracy']

        # --- PROACTIVE INSIGHT ENGINE ---
        recommendations = []
        report = self.last_training_report or {}
        if report and report.get('accuracy', 0) <= report.get('baseline_history', 0):
            recommendations.append({
                "type": "warning",
                "text": "The model is not beating the simple 'recent average attendance' rule. More weeks of recorded attendance are needed.",
                "priority": "high"
            })
        if coverage_pct < 50:
            recommendations.append({
                "type": "strategy",
                "text": "Model coverage is below 50%. Suggest uploading attendance covering more days and time slots.",
                "priority": "high"
            })
        elif coverage_pct < 85:
            recommendations.append({
                "type": "optimization",
                "text": "Core patterns established. Record attendance for the remaining morning slots to improve coverage.",
                "priority": "medium"
            })

        if delta < -0.5:
            recommendations.append({
                "type": "warning",
                "text": "Recent accuracy dip detected. The latest batch may contain unusual weeks (holidays, exams) or noisy attendance.",
                "priority": "high"
            })

        recommendations.append({
            "type": "status" if total_hours > 2000 else "action",
            "text": (f"Model has learned from {total_hours} class meetings. It retrains automatically every "
                     f"{self.retrain_threshold} newly recorded attendances."),
            "priority": "low"
        })

        profile = {
            "total_hours": total_hours,
            "coverage_pct": coverage_pct,
            "accuracy": round(report.get('accuracy', 0), 1),
            "baseline_history": report.get('baseline_history', 0),
            "baseline_majority": report.get('baseline_majority', 0),
            "evolution_level": level,
            "scenarios_mastered": mastered_count,
            "history": history[-10:], # Last 10 sessions for chart
            "delta": round(delta, 2),
            "recommendations": recommendations[:3] # Latest 3 insights
        }
        self._profile_cache = profile
        self._profile_cache_time = time.time()
        return profile

    def _new_model(self):
        # Depth / leaf limits keep the forest from memorising individual weeks
        return RandomForestClassifier(n_estimators=150, max_depth=10, min_samples_leaf=5,
                                      random_state=42, n_jobs=-1)

    def train_from_history(self):
        """Train on cumulative history; evaluate on the most recent records (chronological hold-out)."""
        self._profile_cache = None
        df = self._load_history()
        if df is None or len(df) < 50:
            return None, "Not enough attendance history to train (need at least 50 records)."

        data = self._add_lag_features(df)
        X, y = data[FEATURES], data['label']

        # Chronological split: train on the past, test on the future. A random split would
        # let the model see the same week of the same class in both sets.
        split = int(len(data) * (1 - TEST_FRACTION))
        X_train, X_test = X.iloc[:split], X.iloc[split:]
        y_train, y_test = y.iloc[:split], y.iloc[split:]

        model = self._new_model().fit(X_train, y_train)
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        train_accuracy = accuracy_score(y_train, model.predict(X_train))
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)

        # Baselines the model has to beat to be useful
        majority = y_train.mode()[0]
        baseline_majority = accuracy_score(y_test, np.full(len(y_test), majority))
        baseline_history = accuracy_score(y_test, X_test['hist_attendance'].apply(level_for))

        # Rolling-origin cross-validation for a more stable estimate
        cv_scores = []
        for tr, te in TimeSeriesSplit(n_splits=5).split(X):
            m = self._new_model().fit(X.iloc[tr], y.iloc[tr])
            cv_scores.append(accuracy_score(y.iloc[te], m.predict(X.iloc[te])))

        labels = sorted(set(y_test) | set(y_pred))
        cm = confusion_matrix(y_test, y_pred, labels=labels)

        # Final model uses all data, so the most recent weeks also inform live predictions
        self.model = self._new_model().fit(X, y)
        self.default_week = int(data['week'].median()) if data['week'].gt(0).any() else 8
        # Range of recent-average attendance the forest has seen enough of to be trusted
        self.hist_range = (float(data['hist_attendance'].quantile(0.01)), float(data['hist_attendance'].quantile(0.99)))
        joblib.dump({'model': self.model, 'features': FEATURES, 'default_week': self.default_week,
                     'hist_range': self.hist_range}, MODEL_PATH)

        pct = lambda v: round(float(v) * 100, 2)
        report = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'total_records': len(data),
            'training_records': len(X_train),
            'test_records': len(X_test),
            'split': 'chronological (most recent 20% held out)',
            'accuracy': pct(accuracy),
            'precision': pct(precision),
            'recall': pct(recall),
            'f1_score': pct(f1),
            'train_accuracy': pct(train_accuracy),
            'cv_accuracy': pct(np.mean(cv_scores)),
            'cv_std': pct(np.std(cv_scores)),
            'baseline_majority': pct(baseline_majority),
            'baseline_history': pct(baseline_history),
            'confusion_matrix': {'labels': [LEVELS[int(l)] for l in labels], 'matrix': cm.tolist()},
            'class_distribution': {LEVELS[int(k)]: int(v) for k, v in y.value_counts().sort_index().items()},
            'feature_importance': dict(zip(FEATURES, [round(float(x), 4) for x in self.model.feature_importances_])),
            'status': 'success',
        }
        report['analysis'] = self._describe_report(report)

        if report['accuracy'] <= report['baseline_history']:
            report['status'] = 'warning'
        elif self.last_training_report and report['accuracy'] < (self.last_training_report['accuracy'] - 0.5):
            report['status'] = 'warning'
            report['analysis'] = self._analyze_accuracy_drop(self.last_training_report, report)

        history = []
        if os.path.exists(TRAINING_LOG_PATH):
            try:
                with open(TRAINING_LOG_PATH, 'r') as f:
                    history = json.load(f)
            except (OSError, ValueError):
                pass
        history.append(report)
        if len(history) > 50: history = history[-50:]
        with open(TRAINING_LOG_PATH, 'w') as f:
            json.dump(history, f, indent=4)

        self.last_training_report = report
        return report, None

    def _describe_report(self, r):
        gain = round(r['accuracy'] - r['baseline_history'], 1)
        text = (f"Tested on the {r['test_records']} most recent classes it never saw: {r['accuracy']}% correct, "
                f"vs {r['baseline_history']}% for 'reuse recent average attendance' and "
                f"{r['baseline_majority']}% for always guessing the most common level ({'+' if gain >= 0 else ''}{gain} pts). ")
        if r['train_accuracy'] - r['accuracy'] > 15:
            text += "Training accuracy is much higher than test accuracy, so the model is overfitting; add more weeks of data."
        else:
            text += ("Accuracy below 100% is expected: cancellations, holidays and day-to-day absence "
                     "cannot be known before a class starts.")
        return text

    def _analyze_accuracy_drop(self, old, new):
        """Intelligently diagnose why model performance decreased."""
        diff = old['accuracy'] - new['accuracy']
        if diff < 1: return "Minor variance detected. Likely due to the new test window containing different weeks."

        reasons = []
        if new['total_records'] < old['total_records']:
            reasons.append("Dataset size decreased, reducing historical reference points.")

        old_fi = old.get('feature_importance', {})
        new_fi = new.get('feature_importance', {})
        if new_fi.get('hist_attendance', 0) < (old_fi.get('hist_attendance', 0) * 0.8):
            reasons.append("Recent attendance is predicting less well than before (attendance became more irregular).")

        if not reasons:
            reasons.append("The latest weeks behave differently from earlier ones (exams, holidays or timetable changes).")

        return "Warning: " + " ".join(reasons) + " Consider reviewing the last uploaded dataset."

    # ------------------------------------------------------------------ inference
    def predict(self, day, hour, sub_type, attendance, subject=None, batch=None, section=None,
                week=None, prev_attendance=None):
        """Predict the occupancy level of an upcoming class.

        `attendance` is the class's historical average attendance % (the timetable's
        expected_attendance), NOT the attendance of the class being predicted.
        """
        if not self.model:
            self.train_initial_model()

        row = self._normalize(pd.DataFrame([{
            'day': day, 'hour': hour, 'type': sub_type, 'subject': subject or '',
            'batch': batch, 'section': section, 'week': week, 'attendance': attendance,
        }]))
        hist = float(row['attendance'].iloc[0]) if not pd.isna(row['attendance'].iloc[0]) else DEFAULT_HIST
        prev = pd.to_numeric(prev_attendance, errors='coerce')
        row['hist_attendance'] = hist
        row['prev_attendance'] = hist if pd.isna(prev) else float(prev)
        if row['week'].iloc[0] <= 0:
            row['week'] = self.default_week

        # Unknown batch/section: average over every batch/section instead of inventing one
        batches = [int(row['batch'].iloc[0])] if row['batch'].iloc[0] > 0 else [1, 2, 3, 4]
        sections = [int(row['section'].iloc[0])] if row['section'].iloc[0] > 0 else [1, 2]
        grid = pd.concat([row.assign(batch=b, section=sec) for b in batches for sec in sections], ignore_index=True)
        probabilities = self.model.predict_proba(grid[FEATURES]).mean(axis=0)
        prediction = int(self.model.classes_[int(np.argmax(probabilities))])
        confidence = round(float(np.max(probabilities)) * 100, 1)

        # Attendance history outside anything the model was trained on: trust the history itself
        out_of_range = not (self.hist_range[0] <= hist <= self.hist_range[1])
        if out_of_range:
            prediction, confidence = level_for(hist), 50.0

        # --- Safety guard: never switch a room fully off when students are expected ---
        safety = False
        if prediction == 0 and hist > 5:
            prediction, safety = 1, True

        result_label = LEVELS[prediction]
        reasoning = self._generate_reasoning(row.iloc[0], result_label, safety, out_of_range)
        return result_label, prediction, reasoning, confidence

    def _generate_reasoning(self, row, label, safety=False, out_of_range=False):
        day = DAY_NAMES[int(row['day'])] if 0 <= int(row['day']) < 7 else 'this day'
        hour = int(row['hour'])
        hist = float(row['hist_attendance'])

        reasons = [f"Recent average attendance for this class is {hist:.0f}%."]
        if hour <= 8:
            reasons.append("First-slot classes usually see late arrivals and lower turnout.")
        elif hour >= 13:
            reasons.append("Post-lunch slot; attendance typically dips.")
        if day == 'Friday':
            reasons.append("Friday attendance is historically lower.")
        if int(row['type']) == 1:
            reasons.append("Lab sessions are mandatory, so turnout is usually higher.")
        if int(row['batch']) == 4:
            reasons.append("Final-year batch has the lowest average attendance.")
        if out_of_range:
            reasons.append("This attendance level is outside the trained range, so the level follows recent history directly.")
        if safety:
            reasons.append("Safety rule: kept at minimum comfort because students are still expected.")
        reasons.append(f"Predicted level: {label}.")
        return " ".join(reasons)

    def get_climate_aware_recommendation(self, level_idx, climate_context=None):
        """Enhanced recommendation that factors in climate conditions.
        
        This method wraps get_recommendation() with climate intelligence.
        If no climate context is provided, falls back to standard logic.
        """
        if not climate_context:
            # Fetch live climate context
            try:
                climate_context = get_climate_context()
            except Exception:
                # Ultimate fallback: standard recommendation
                return self._build_fallback_recommendation(level_idx)
        
        climate_mode = climate_context.get('climate_mode', 'moderate')
        temperature = climate_context.get('temperature', 25)
        
        # Get climate-aware device overrides
        overrides = get_device_overrides(level_idx, climate_mode)
        
        if not overrides:
            return self._build_fallback_recommendation(level_idx)
        
        # Inject actual temperature into reasoning
        reasoning = overrides['reasoning'].format(temp=f"{temperature}")
        
        levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        
        return {
            'occupancy_level': levels.get(int(level_idx), 'Medium'),
            'lights': overrides['lights'],
            'ac': overrides['ac'],
            'fan': overrides['fan'],
            'recommendation': overrides['recommendation'],
            'climate_reasoning': reasoning,
            'energy_mode': overrides['energy_mode'],
            'climate_mode': climate_mode,
            'temperature': temperature,
            'season': climate_context.get('season_label', 'Unknown')
        }

    def _build_fallback_recommendation(self, level_idx):
        """Standard recommendation when climate data is unavailable."""
        level_idx = int(level_idx)
        levels = {0: 'Empty', 1: 'Trace', 2: 'Light', 3: 'Balanced', 4: 'Maximum'}
        if level_idx == 0:
            return {
                'occupancy_level': 'Empty',
                'lights': 'OFF', 'ac': 'OFF', 'fan': 'OFF',
                'recommendation': 'System Dormant (Eco Mode)',
                'climate_reasoning': 'Room is empty. Systems deactivated.',
                'energy_mode': 'eco', 'climate_mode': 'unknown',
                'temperature': None, 'season': 'Unknown'
            }
        elif level_idx == 1:
            return {
                'occupancy_level': 'Trace',
                'lights': 'DIM (50%)', 'ac': 'OFF', 'fan': 'ON',
                'recommendation': 'Trace Presence (Minimal Power)',
                'climate_reasoning': 'Student detected. Ventilation only.',
                'energy_mode': 'eco', 'climate_mode': 'unknown',
                'temperature': None, 'season': 'Unknown'
            }
        elif level_idx == 2:
            return {
                'occupancy_level': 'Light',
                'lights': 'ON', 'ac': 'OFF', 'fan': 'ON',
                'recommendation': 'Light Occupancy (Balanced Mode)',
                'climate_reasoning': 'Comfortable conditions maintained.',
                'energy_mode': 'balanced', 'climate_mode': 'unknown',
                'temperature': None, 'season': 'Unknown'
            }
        elif level_idx == 3:
            return {
                'occupancy_level': 'Balanced',
                'lights': 'ON', 'ac': 'ECO', 'fan': 'ON',
                'recommendation': 'Balanced Occupancy (Comfort Mode)',
                'climate_reasoning': 'Active cooling starting to maintain stability.',
                'energy_mode': 'comfort', 'climate_mode': 'unknown',
                'temperature': None, 'season': 'Unknown'
            }
        else:
            return {
                'occupancy_level': 'Maximum',
                'lights': 'ON', 'ac': 'ON', 'fan': 'HIGH',
                'recommendation': 'Maximum Capacity (Full Power)',
                'climate_reasoning': 'Full room cooling active.',
                'energy_mode': 'full', 'climate_mode': 'unknown',
                'temperature': None, 'season': 'Unknown'
            }

    def get_recommendation(self, level_idx):
        level_idx = int(level_idx)
        if level_idx == 0:
            return "Lights OFF, AC OFF (Eco Mode)", "Empty"
        elif level_idx == 1:
            return "Lights DIM, AC OFF (Trace Mode)", "Trace"
        elif level_idx == 2:
            return "Lights ON, AC OFF (Light Mode)", "Light"
        elif level_idx == 3:
            return "Lights ON, AC ECO (Balanced Mode)", "Balanced"
        else:
            return "Full Power: Lights ON, AC ON", "Maximum"
    
    def add_to_history(self, day, hour, sub_type, attendance, subject=None):
        """Add one recorded class attendance to the history and retrain if threshold met."""
        processed = self._normalize(pd.DataFrame([{
            'semester': 'live', 'day': day, 'hour': hour, 'type': sub_type,
            'attendance': attendance, 'subject': subject or '',
        }]))
        history_df = self._load_history()
        cumulative_df = processed if history_df is None else pd.concat([history_df, processed], ignore_index=True)
        self._save_history(cumulative_df)
        self.new_data_count += 1

        if self.new_data_count >= self.retrain_threshold:
            print(f">>> AUTO-RETRAIN: Reached {self.retrain_threshold} new points. Updating model...")
            self.train_from_history()
            self.new_data_count = 0
            return True
        return False
