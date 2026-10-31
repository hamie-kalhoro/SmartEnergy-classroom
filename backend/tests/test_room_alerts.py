"""Run from backend/: python -m unittest tests.test_room_alerts"""
import os
import sys
import unittest
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from models import db, Classroom, Notification, RoomLiveState, User
from routes.facility import facility_bp

URL = '/api/map/room-states/cs-01'
CALM = {'mode': 'auto', 'present': 18, 'lights': 8, 'fans': 4, 'acs': 2, 'temp': 24, 'severity': None}
WARNING = {**CALM, 'mode': 'manual', 'fans': 6, 'severity': 'warning', 'excess_kw': 0.15}
CRITICAL = {**CALM, 'mode': 'manual', 'acs': 4, 'severity': 'critical', 'excess_kw': 3.36}


class RoomAlertsTest(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            JWT_SECRET_KEY='test-secret-key-that-is-long-enough-for-hs256',
        )
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(facility_bp)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        db.session.add(Classroom(name='Lab CS-01', map_id='cs-01', room_type='lab', building='B', capacity=35,
                                 num_lights=12, num_fans=6, num_acs=4))
        self.tokens = {}
        for role in ('user', 'faculty', 'admin'):
            account = User(username=role, email=f'{role}@x.test', password_hash='x', role=role, is_active_account=True)
            db.session.add(account)
            db.session.flush()
            self.tokens[role] = create_access_token(identity=str(account.id))
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def auth(self, role):
        return {'Authorization': f'Bearer {self.tokens[role]}'}

    def put(self, body, role='admin'):
        return self.client.put(URL, json=body, headers=self.auth(role))

    def acknowledge(self, role='admin'):
        return self.client.post(f'{URL}/acknowledge', headers=self.auth(role))

    def room(self):
        db.session.expire_all()
        return db.session.get(RoomLiveState, 'cs-01')

    def test_every_role_sees_room_states_but_students_cannot_change_them(self):
        self.put(CRITICAL)
        self.assertEqual(self.client.get('/api/map/room-states').status_code, 401)
        seen = self.client.get('/api/map/room-states', headers=self.auth('user')).get_json()
        self.assertEqual(seen['cs-01']['acs'], 4)
        self.assertEqual(self.put(CALM, role='user').status_code, 403)
        self.assertEqual(self.acknowledge(role='user').status_code, 403)
        self.assertEqual(self.room().acs, 4)

    def test_change_records_who_made_it(self):
        self.assertEqual(self.put(CRITICAL, role='faculty').status_code, 200)
        self.assertEqual(self.room().updated_by, 'faculty')
        self.assertIsNotNone(self.room().updated_at)

    def test_values_stay_inside_installed_devices(self):
        self.put({**CALM, 'present': 900, 'lights': 900, 'fans': -5, 'acs': 900, 'temp': 2})
        room = self.room()
        self.assertEqual((room.present, room.lights, room.fans, room.acs, room.temp), (35, 12, 0, 4, 16))

    def test_invalid_requests_are_refused(self):
        for body in ({**CALM, 'mode': 'off'}, {**CALM, 'severity': 'high'}, {**CALM, 'acs': 'many'},
                     {**CALM, 'acs': True}, {'mode': 'auto'}, {**CRITICAL, 'excess_kw': 'x'}):
            self.assertEqual(self.put(body).status_code, 400, body)
        self.assertEqual(self.client.put('/api/map/room-states/nowhere', json=CALM, headers=self.auth('admin')).status_code, 404)

    def test_alert_notifies_admins_with_room_and_person(self):
        self.put(CRITICAL, role='faculty')
        notification = Notification.query.one()
        self.assertEqual((notification.type, notification.target_role), ('load_alert', 'admin'))
        for text in ('Critical', 'Lab CS-01', '3.36 kW', 'faculty'):
            self.assertIn(text, notification.message)

    def test_calm_room_does_not_notify(self):
        self.put(CALM)
        self.assertEqual(Notification.query.count(), 0)

    def test_worsening_notifies_at_once_but_repeats_wait(self):
        self.put(WARNING)
        self.put(CRITICAL)
        self.assertEqual(Notification.query.count(), 2)
        self.put(CRITICAL)
        self.put(CALM)
        self.put(CRITICAL)
        self.assertEqual(Notification.query.count(), 2)

        room = self.room()
        room.notified_at -= timedelta(seconds=61)
        db.session.commit()
        self.put(CALM)
        self.put(CRITICAL)
        self.assertEqual(Notification.query.count(), 3)

    def test_acknowledge_records_person_and_needs_an_active_alert(self):
        self.put(CALM)
        self.assertEqual(self.acknowledge().status_code, 409)
        self.put(WARNING)
        self.assertEqual(self.acknowledge(role='faculty').status_code, 200)
        room = self.room()
        self.assertEqual((room.ack_severity, room.ack_by), ('warning', 'faculty'))
        self.assertIsNotNone(room.ack_at)

    def test_acknowledgement_survives_same_level_but_not_worse_or_resolved(self):
        self.put(WARNING)
        self.acknowledge()
        self.put({**WARNING, 'lights': 12})
        self.assertEqual(self.room().ack_severity, 'warning')
        self.put(CRITICAL)
        self.assertIsNone(self.room().ack_severity)
        self.acknowledge()
        self.put(WARNING)
        self.assertEqual(self.room().ack_severity, 'critical')
        self.put(CALM)
        self.assertIsNone(self.room().ack_severity)


if __name__ == '__main__':
    unittest.main()
