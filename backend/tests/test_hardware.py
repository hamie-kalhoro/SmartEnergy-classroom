"""Run from backend/: python -m unittest tests.test_hardware"""
import ast
import os
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

import hardware_ml
from hardware_bridge import HardwareBridge, bridge, devices_for_load, load_for_students
from hardware_ml import FEATURES, HardwareForecaster, build_features, samples_from_session, simulate_sessions, train_model
from hardware_store import HardwareEventStore
from models import db, User
from routes.hardware import confirmed_admins, hardware_bp

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = '[+ ENTRY] Student Entered | Total Students: {}'
EXIT = '[- EXIT] Student Exited | Total Students: {}'


class BridgeParsingTest(unittest.TestCase):
    def setUp(self):
        self.bridge = HardwareBridge(port='TEST')

    def feed(self, *lines):
        for line in lines:
            self.bridge.handle_line(line)
        return self.bridge.snapshot()

    def test_state_is_unknown_before_any_message(self):
        state = self.bridge.snapshot()
        self.assertIsNone(state['students'])
        self.assertIsNone(state['devices'])

    def test_first_entry_runs_first_light_and_fan(self):
        state = self.feed(
            '[+ ENTRY] Student Entered | Total Students: 1',
            '--> Load: 50% | Light 1 & Fan 1 ON (Light 2 & Fan 2 OFF)',
        )
        self.assertEqual(state['students'], 1)
        self.assertEqual(state['load_percent'], 50)
        self.assertEqual(state['devices'], {'light_1': True, 'fan_1': True, 'light_2': False, 'fan_2': False})

    def test_sixth_entry_runs_everything(self):
        state = self.feed(
            '[+ ENTRY] Student Entered | Total Students: 6',
            '--> Load: 100% | ALL Lights & Fans ON',
        )
        self.assertEqual(state['load_percent'], 100)
        self.assertTrue(all(state['devices'].values()))

    def test_exit_updates_count_and_firmware_load_wins(self):
        state = self.feed(
            '--> Load: 100% | ALL Lights & Fans ON',
            '[- EXIT] Student Exited | Total Students: 5',
            '--> Load: 50% | Light 1 & Fan 1 ON (Light 2 & Fan 2 OFF)',
        )
        self.assertEqual((state['students'], state['exits'], state['load_percent']), (5, 1, 50))

    def test_load_is_filled_in_when_joining_mid_session(self):
        state = self.feed('[+ ENTRY] Student Entered | Total Students: 3')
        self.assertEqual(state['load_percent'], 50)

    def test_boot_banner_zeroes_state(self):
        self.feed('[+ ENTRY] Student Entered | Total Students: 4')
        state = self.feed(' SMART CLASSROOM LOAD MANAGEMENT INITIALIZED  ')
        self.assertEqual((state['students'], state['load_percent']), (0, 0))

    def test_unrelated_lines_are_ignored(self):
        state = self.feed('entry 0x400805b4', 'ets Jul 29 2019 12:21:46', '��')
        self.assertEqual(state['events'], [])

    def test_newest_event_comes_first_with_rising_ids(self):
        events = self.feed(
            '[+ ENTRY] Student Entered | Total Students: 1',
            '[- EXIT] Student Exited | Total Students: 0',
        )['events']
        self.assertEqual([e['type'] for e in events], ['exit', 'entry'])
        self.assertGreater(events[0]['id'], events[1]['id'])

    def test_stage_rule_edges(self):
        self.assertEqual([load_for_students(n) for n in (0, 1, 5, 6, 40)], [0, 50, 50, 100, 100])
        self.assertIsNone(devices_for_load(None))

    def test_reset_refused_while_disconnected(self):
        self.assertFalse(self.bridge.request_reset())


class IsolationTest(unittest.TestCase):
    def test_hardware_modules_do_not_import_the_main_application(self):
        forbidden = {'models', 'ml_engine', 'services', 'app', 'flask_sqlalchemy'}
        for filename in ('hardware_bridge.py', 'hardware_store.py', 'hardware_ml.py'):
            with open(os.path.join(BACKEND_DIR, filename), encoding='utf-8') as f:
                tree = ast.parse(f.read())
            imported = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    imported.update(alias.name.split('.')[0] for alias in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module:
                    imported.add(node.module.split('.')[0])
            self.assertFalse(imported & forbidden, filename)

    def test_a_failing_listener_does_not_stop_the_bridge(self):
        board = HardwareBridge(port='TEST')
        board.add_listener(mock.Mock(side_effect=OSError('disk full')))
        with self.assertLogs('hardware_bridge', level='ERROR'):
            board.handle_line(ENTRY.format(1))
        self.assertEqual(board.snapshot()['students'], 1)


class EventStoreTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.store = HardwareEventStore(os.path.join(self.dir.name, 'nested', 'events.db'))

    def tearDown(self):
        self.dir.cleanup()

    def add(self, at, event_type, students=None):
        self.store.append({'at': at, 'type': event_type, 'students': students})

    def test_no_file_means_no_sessions(self):
        self.assertEqual(self.store.load_sessions(), [])

    def test_restart_and_long_silence_split_sessions(self):
        for i in range(5):
            self.add(f'2026-10-30T10:00:{i:02d}+00:00', 'entry', i + 1)
        self.add('2026-10-30T10:01:00+00:00', 'boot')
        for i in range(5):
            self.add(f'2026-10-30T10:02:{i:02d}+00:00', 'entry', i + 1)
        for i in range(5):
            self.add(f'2026-10-30T12:00:{i:02d}+00:00', 'entry', i + 1)
        self.assertEqual([len(s) for s in self.store.load_sessions()], [5, 6, 5])

    def test_too_short_sessions_and_load_events_are_left_out(self):
        self.add('2026-10-30T10:00:00+00:00', 'entry', 1)
        self.add('2026-10-30T10:00:01+00:00', 'load')
        self.assertEqual(self.store.load_sessions(), [])


class ForecastModelTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        real = [[(float(i * 5), 'entry', i + 1) for i in range(8)]]
        cls.bundle = train_model(real, simulate_sessions(count=30))
        cls.dir = tempfile.TemporaryDirectory()
        cls.path = os.path.join(cls.dir.name, 'model.joblib')

    @classmethod
    def tearDownClass(cls):
        cls.dir.cleanup()

    def forecaster_with_model(self):
        forecaster = HardwareForecaster(model_path=self.path, event_store=HardwareEventStore(os.path.join(self.dir.name, 'e.db')))
        forecaster._bundle = self.bundle
        return forecaster

    def live_snapshot(self, students=3, load=50):
        board = HardwareBridge(port='TEST')
        for count in range(1, students + 1):
            board.handle_line(ENTRY.format(count))
        snapshot = board.snapshot()
        return {**snapshot, 'connected': True, 'load_percent': load}

    def test_features_match_their_names(self):
        self.assertEqual(len(build_features(100.0, 3, [90.0], [], 90.0)), len(FEATURES))

    def test_only_recent_events_count(self):
        features = dict(zip(FEATURES, build_features(1000.0, 2, [100.0, 950.0, 990.0], [995.0], 995.0)))
        self.assertEqual(features['entries_last_minute'], 2)
        self.assertEqual(features['exits_last_minute'], 1)
        self.assertEqual(features['net_flow_last_minute'], 1)
        self.assertEqual(features['entries_last_5_minutes'], 2)
        self.assertEqual(features['seconds_since_last_event'], 5.0)

    def test_labels_look_one_horizon_ahead(self):
        session = [(float(i), 'entry', i + 1) for i in range(6)]
        first_person = next(s for s in samples_from_session(session) if s[0][0] == 1)
        self.assertEqual(first_person[1:], (100, 50))

    def test_samples_include_the_idle_room_before_activity(self):
        session = [(float(i), 'entry', i + 1) for i in range(6)]
        features, future_load, current_load = samples_from_session(session)[0]
        self.assertEqual((features[0], future_load, current_load), (0, 0, 0))
        self.assertEqual(features[FEATURES.index('seconds_since_last_event')], 900)

    def test_quiet_empty_room_is_forecast_to_stay_empty(self):
        forecaster = self.forecaster_with_model()
        board = HardwareBridge(port='TEST')
        board.handle_line(' SMART CLASSROOM LOAD MANAGEMENT INITIALIZED  ')
        result = forecaster.forecast({**board.snapshot(), 'connected': True})
        self.assertEqual(result['predicted_load'], 0)

    def test_simulated_counts_are_never_negative(self):
        for session in simulate_sessions(count=60):
            self.assertTrue(all(students >= 0 for _, _, students in session))

    def test_scores_come_with_baseline_and_data_source(self):
        meta = self.bundle['meta']
        self.assertEqual((meta['simulated_sessions'], meta['real_sessions']), (30, 1))
        self.assertIn('accuracy', meta['metrics']['baseline'])
        self.assertLessEqual(meta['metrics']['false_alarms'], 1)

    def test_forecast_probabilities_cover_every_stage(self):
        result = self.forecaster_with_model().forecast(self.live_snapshot())
        self.assertEqual(result['status'], 'ready')
        self.assertEqual(set(result['probabilities']), {'0', '50', '100'})
        self.assertAlmostEqual(sum(result['probabilities'].values()), 1.0)
        self.assertIn(result['predicted_load'], (0, 50, 100))

    def test_forecast_waits_while_count_is_unknown_or_board_offline(self):
        forecaster = self.forecaster_with_model()
        self.assertEqual(forecaster.forecast({'connected': True, 'students': None})['status'], 'waiting')
        self.assertEqual(forecaster.forecast({**self.live_snapshot(), 'connected': False})['status'], 'waiting')

    def test_no_model_reports_status_instead_of_failing(self):
        forecaster = HardwareForecaster(model_path=self.path)
        self.assertEqual(forecaster.forecast(self.live_snapshot())['status'], 'unavailable')

    def test_corrupt_saved_model_triggers_retraining(self):
        path = os.path.join(self.dir.name, 'corrupt.joblib')
        with open(path, 'wb') as f:
            f.write(b'not a model')
        forecaster = HardwareForecaster(model_path=path)
        with mock.patch.object(forecaster, 'retrain') as retrain, self.assertLogs('hardware_ml', level='ERROR'):
            forecaster._load_or_train()
        retrain.assert_called_once()

    def test_failed_training_is_reported_and_can_be_retried(self):
        forecaster = HardwareForecaster(model_path=self.path)
        with mock.patch.object(hardware_ml, 'train_model', side_effect=ValueError('no data')), self.assertLogs('hardware_ml', level='ERROR'):
            forecaster._training = True
            forecaster._train()
        result = forecaster.forecast(self.live_snapshot())
        self.assertEqual((result['error'], result['training']), ('no data', False))


class HardwareAccessTest(unittest.TestCase):
    def setUp(self):
        confirmed_admins.clear()
        self.app = Flask(__name__)
        self.app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            JWT_SECRET_KEY='test-secret-key-that-is-long-enough-for-hs256',
        )
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(hardware_bp)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        db.session.add(User(id=1, username='a', email='a@x', password_hash='x', role='admin'))
        db.session.add(User(id=2, username='f', email='f@x', password_hash='x', role='faculty'))
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def auth(self, user_id):
        return {'Authorization': f'Bearer {create_access_token(identity=str(user_id))}'}

    def test_anonymous_is_rejected(self):
        self.assertEqual(self.client.get('/api/hardware/status').status_code, 401)
        self.assertEqual(self.client.post('/api/hardware/reset').status_code, 401)

    def test_faculty_is_rejected(self):
        self.assertEqual(self.client.get('/api/hardware/status', headers=self.auth(2)).status_code, 403)
        self.assertEqual(self.client.post('/api/hardware/reset', headers=self.auth(2)).status_code, 403)

    def test_admin_reads_status(self):
        res = self.client.get('/api/hardware/status', headers=self.auth(1))
        self.assertEqual(res.status_code, 200)
        self.assertIn('connected', res.get_json())

    def test_status_keeps_working_when_the_forecast_fails(self):
        with mock.patch('routes.hardware.forecaster.forecast', side_effect=RuntimeError('boom')):
            res = self.client.get('/api/hardware/status', headers=self.auth(1))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['forecast']['status'], 'unavailable')
        self.assertNotIn('boom', res.get_data(as_text=True))

    def test_faculty_cannot_retrain(self):
        self.assertEqual(self.client.post('/api/hardware/forecast/retrain', headers=self.auth(2)).status_code, 403)

    def test_admin_retrain_conflicts_while_training(self):
        with mock.patch('routes.hardware.forecaster.retrain', return_value=False):
            res = self.client.post('/api/hardware/forecast/retrain', headers=self.auth(1))
        self.assertEqual(res.status_code, 409)

    def test_polling_does_not_query_the_main_database_each_time(self):
        headers = self.auth(1)
        self.client.get('/api/hardware/status', headers=headers)
        with mock.patch('routes.hardware.db.session.get') as lookup:
            self.assertEqual(self.client.get('/api/hardware/status', headers=headers).status_code, 200)
        lookup.assert_not_called()

    def test_reset_reports_conflict_when_board_is_absent(self):
        self.assertFalse(bridge.snapshot()['connected'])
        self.assertEqual(self.client.post('/api/hardware/reset', headers=self.auth(1)).status_code, 409)


if __name__ == '__main__':
    unittest.main()
