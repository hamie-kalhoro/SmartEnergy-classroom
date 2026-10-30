"""Run from backend/: python -m unittest tests.test_hardware"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from hardware_bridge import HardwareBridge, bridge, devices_for_load, load_for_students
from models import db, User
from routes.hardware import hardware_bp


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


class HardwareAccessTest(unittest.TestCase):
    def setUp(self):
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

    def test_reset_reports_conflict_when_board_is_absent(self):
        self.assertFalse(bridge.snapshot()['connected'])
        self.assertEqual(self.client.post('/api/hardware/reset', headers=self.auth(1)).status_code, 409)


if __name__ == '__main__':
    unittest.main()
