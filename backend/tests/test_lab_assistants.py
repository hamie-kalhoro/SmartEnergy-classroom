"""Run from backend/: python -m unittest tests.test_lab_assistants"""
import os
import sys
import unittest
from datetime import timedelta
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from email_templates import build_energy_report_message, report_subject
from models import db, AssistantMailLog, Classroom, Notification, RoomAssistant, RoomLiveState, User
from room_catalog import energy_report
from routes.auth import auth_bp
from routes.facility import facility_bp
from services import PasswordService

SEND_REPORT = 'services.EmailService.send_energy_report'
SEND_ACTIVATION = 'services.EmailService.send_activation_email'
LAB = {'lights': 12, 'fans': 6, 'acs': 4}
EMAIL = '/api/map/rooms/cs-01/assistant/email'
ASSIGN = '/api/map/rooms/cs-01/assistant'
CALM = {'mode': 'auto', 'present': 18, 'lights': 8, 'fans': 4, 'acs': 3, 'temp': 24, 'severity': None}


class EnergyReportTest(unittest.TestCase):
    """Expected values were read from the campus map, so the two calculations must agree."""

    def test_matches_the_map_for_extra_ac(self):
        report = energy_report('lab', LAB, 35, 18, 8, 4, 4, 24)
        self.assertEqual((report['plan_kw'], report['live_kw'], report['excess_kw']), (5.54, 7.22, 1.68))
        self.assertEqual([(r['device'], r['live'], r['required'], r['extra']) for r in report['extras']], [('AC units', 4, 3, 1)])
        self.assertEqual(report['extras'][0]['extra_kw'], 1.68)

    def test_matches_the_map_for_every_device_and_low_set_point(self):
        report = energy_report('lab', LAB, 40, 22, 12, 6, 4, 18)
        self.assertEqual((report['plan_kw'], report['live_kw'], report['excess_kw']), (5.56, 9.61, 4.05))
        self.assertEqual([r['device'] for r in report['extras']], ['Lights', 'Fans', 'AC units'])
        self.assertTrue(report['overcooling'])

    def test_empty_room_requires_only_standby(self):
        report = energy_report('classroom', {'lights': 10, 'fans': 8, 'acs': 0}, 48, 0, 10, 8, 0, 24)
        self.assertEqual((report['plan_kw'], report['live_kw'], report['excess_kw']), (0.04, 0.84, 0.8))

    def test_room_on_plan_has_no_extras(self):
        report = energy_report('lab', LAB, 35, 18, 8, 4, 3, 24)
        self.assertEqual((report['excess_kw'], report['extras'], report['overcooling']), (0, [], False))

    def test_utility_room_keeps_its_lights(self):
        report = energy_report('utility', {'lights': 2, 'fans': 0, 'acs': 0}, 0, 0, 2, 0, 0, 24)
        self.assertEqual(report['excess_kw'], 0)


class EnergyEmailTest(unittest.TestCase):
    REPORT = energy_report('lab', LAB, 40, 22, 12, 6, 4, 18)

    def build(self, assistant='Sara', note='Please check before 2 PM.'):
        return build_energy_report_message('a@x.test', 'sender@x.test', 'boss@x.test', assistant, 'Lab CS-04', self.REPORT, 'Boss', note,
                                           '31 Oct 2026, 05:00 PM PKT', 'http://localhost:5173/map')

    def body(self, message, content_type):
        part = next(p for p in message.walk() if p.get_content_type() == content_type)
        return part.get_payload(decode=True).decode('utf-8')

    def test_headers(self):
        message = self.build()
        self.assertEqual(message['Subject'], 'Action required: Lab CS-04 is using 4.05 kW more than required')
        self.assertEqual(message['To'], 'a@x.test')
        self.assertEqual(message['Reply-To'], 'boss@x.test')

    def test_both_versions_carry_the_facts(self):
        message = self.build()
        for content_type in ('text/plain', 'text/html'):
            body = self.body(message, content_type)
            for fact in ('Lab CS-04', '5.56', '9.61', '4.05', 'Sara', 'Please check before 2 PM.', 'http://localhost:5173/map',
                         'Turn off 3 lights', 'Turn off 2 fans', 'Turn off 1 AC unit', 'Raise the AC set-point from 18'):
                self.assertIn(fact, body, content_type)

    def test_user_text_cannot_inject_html(self):
        html = self.body(self.build(assistant='<b>x</b>', note='<script>alert(1)</script>\nline two'), 'text/html')
        self.assertNotIn('<script>', html)
        self.assertNotIn('<b>x</b>', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertIn('<br>line two', html)

    def test_no_note_block_without_a_note(self):
        self.assertNotIn('Note from', self.body(self.build(note=''), 'text/html'))

    def test_subject_uses_two_decimals(self):
        self.assertIn('4.05 kW', report_subject('Lab', self.REPORT))


class LabAssistantRoutesTest(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            JWT_SECRET_KEY='test-secret-key-that-is-long-enough-for-hs256',
        )
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(facility_bp)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.lab = Classroom(name='Lab CS-01', map_id='cs-01', room_type='lab', building='B', capacity=35, num_lights=12, num_fans=6, num_acs=4)
        self.lab2 = Classroom(name='Lab CS-02', map_id='cs-02', room_type='lab', building='B', capacity=35, num_lights=12, num_fans=6, num_acs=4)
        self.office = Classroom(name='Office', map_id='office', room_type='office', building='B', capacity=1, num_lights=2, num_fans=1, num_acs=1)
        db.session.add_all([self.lab, self.lab2, self.office])
        self.users = {}
        for name, role in (('admin1', 'admin'), ('fac1', 'faculty'), ('stu1', 'user'), ('asst1', 'assistant')):
            self.users[name] = User(username=name, email=f'{name}@x.test', password_hash=PasswordService.hash_password('secret1'), role=role, is_active_account=True)
            db.session.add(self.users[name])
        db.session.commit()
        self.tokens = {name: create_access_token(identity=str(u.id)) for name, u in self.users.items()}
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def auth(self, name):
        return {'Authorization': f'Bearer {self.tokens[name]}'}

    def signup(self, **changes):
        body = {'username': 'new1', 'email': 'new1@x.test', 'password': 'secret1', 'role': 'assistant', 'classroom_id': self.lab.id, **changes}
        return self.client.post('/api/signup', json=body)

    def assign(self, name='asst1'):
        db.session.add(RoomAssistant(classroom_id=self.lab.id, user_id=self.users[name].id, status='active'))
        db.session.commit()

    def overuse(self, acs=4):
        db.session.add(RoomLiveState(map_id='cs-01', mode='manual', present=18, lights=8, fans=4, acs=acs, temp=24))
        db.session.commit()

    def login(self, username='new1', password='secret1'):
        return self.client.post('/api/login', json={'username': username, 'password': password})

    # ---------------------------------------------------------------- signup and login
    def test_vacant_rooms_lists_teaching_rooms_without_an_assistant(self):
        self.assign()
        names = [r['name'] for r in self.client.get('/api/signup/vacant-rooms').get_json()]
        self.assertEqual(names, ['Lab CS-02'])

    def test_assistant_signup_is_locked_until_approved_then_gets_the_lab(self):
        self.assertEqual(self.signup().get_json()['pending'], True)
        self.assertEqual(self.login().status_code, 401)
        self.assertIn('new1', Notification.query.one().message)
        self.assertIn('Lab CS-01', Notification.query.one().message)

        pending = self.client.get('/api/users/pending-admins', headers=self.auth('admin1')).get_json()
        self.assertEqual(pending[0]['assistant_room'], 'Lab CS-01')
        self.assertIsNone(self.client.get('/api/map/assistants', headers=self.auth('admin1')).get_json().get('cs-01'))

        new_id = User.query.filter_by(username='new1').one().id
        self.assertEqual(self.client.post(f'/api/users/approve-admin/{new_id}', headers=self.auth('admin1')).status_code, 200)
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['user']['role'], 'assistant')
        self.assertEqual(self.client.get('/api/map/assistants', headers=self.auth('stu1')).get_json()['cs-01']['username'], 'new1')

    def test_signup_needs_a_valid_free_lab(self):
        self.assign()
        for changes in ({'classroom_id': self.lab.id}, {'classroom_id': self.office.id}, {'classroom_id': 'x'}, {'classroom_id': None}, {'classroom_id': 999}):
            self.assertEqual(self.signup(**changes).status_code, 400, changes)
        self.assertIsNone(User.query.filter_by(username='new1').first())

    def test_signup_validates_details(self):
        for changes in ({'password': '123'}, {'email': 'stu1@x.test'}, {'username': 'stu1'}, {'username': ''}):
            self.assertEqual(self.signup(**changes).status_code, 400, changes)

    def test_approval_fails_when_the_lab_was_taken_meanwhile(self):
        self.signup()
        self.assign()
        new_user = User.query.filter_by(username='new1').one()
        self.assertEqual(self.client.post(f'/api/users/approve-admin/{new_user.id}', headers=self.auth('admin1')).status_code, 409)
        db.session.expire_all()
        self.assertTrue(db.session.get(User, new_user.id).is_pending_admin)

    # ---------------------------------------------------------------- assigning
    def test_only_admin_can_assign_or_remove(self):
        for name in ('fac1', 'stu1', 'asst1'):
            self.assertEqual(self.client.post(ASSIGN, json={'user_id': self.users['stu1'].id}, headers=self.auth(name)).status_code, 403)
        self.assign()
        for name in ('fac1', 'stu1', 'asst1'):
            self.assertEqual(self.client.delete(ASSIGN, headers=self.auth(name)).status_code, 403)
        self.assertEqual(RoomAssistant.query.count(), 1)

    def test_admin_assigns_existing_user_and_student_becomes_assistant(self):
        response = self.client.post(ASSIGN, json={'user_id': self.users['stu1'].id}, headers=self.auth('admin1'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.users['stu1'].role, 'assistant')
        self.assertEqual(RoomAssistant.query.one().assigned_by, 'admin1')

    def test_faculty_keeps_their_role_when_assigned(self):
        self.client.post(ASSIGN, json={'user_id': self.users['fac1'].id}, headers=self.auth('admin1'))
        self.assertEqual(self.users['fac1'].role, 'faculty')

    def test_admin_adds_a_new_person(self):
        with mock.patch(SEND_ACTIVATION, return_value=True) as send:
            response = self.client.post(ASSIGN, json={'username': 'fresh', 'email': 'fresh@x.test', 'password': 'secret1'}, headers=self.auth('admin1'))
        self.assertEqual(response.status_code, 200)
        send.assert_called_once()
        fresh = User.query.filter_by(username='fresh').one()
        self.assertEqual((fresh.role, RoomAssistant.query.one().user_id), ('assistant', fresh.id))

    def test_assigning_new_person_reports_failed_activation_email(self):
        with mock.patch(SEND_ACTIVATION, return_value=False):
            response = self.client.post(ASSIGN, json={'username': 'fresh', 'email': 'fresh@x.test', 'password': 'secret1'}, headers=self.auth('admin1'))
        self.assertIn('could not be sent', response.get_json()['message'])

    def test_a_room_with_an_assistant_cannot_get_another(self):
        self.assign()
        self.assertEqual(self.client.post(ASSIGN, json={'user_id': self.users['stu1'].id}, headers=self.auth('admin1')).status_code, 409)

    def test_assign_refuses_bad_input(self):
        bodies = ({'user_id': 'x'}, {'user_id': 999}, {'username': 'a', 'email': 'bad', 'password': 'secret1'}, {'username': 'a', 'email': 'a@x', 'password': '1'},
                  {'username': 'stu1', 'email': 'other@x.test', 'password': 'secret1'}, {'username': 'other', 'email': 'stu1@x.test', 'password': 'secret1'})
        for body in bodies:
            self.assertEqual(self.client.post(ASSIGN, json=body, headers=self.auth('admin1')).status_code, 400, body)

    def test_removing_returns_assistant_to_user_but_keeps_other_roles(self):
        self.assign()
        self.assertEqual(self.client.delete(ASSIGN, headers=self.auth('admin1')).status_code, 200)
        self.assertEqual(self.users['asst1'].role, 'user')
        self.client.post(ASSIGN, json={'user_id': self.users['fac1'].id}, headers=self.auth('admin1'))
        self.client.delete(ASSIGN, headers=self.auth('admin1'))
        self.assertEqual(self.users['fac1'].role, 'faculty')

    def test_only_admins_see_contact_details(self):
        self.assign()
        self.assertIn('email', self.client.get('/api/map/assistants', headers=self.auth('admin1')).get_json()['cs-01'])
        for name in ('fac1', 'stu1', 'asst1'):
            self.assertNotIn('email', self.client.get('/api/map/assistants', headers=self.auth(name)).get_json()['cs-01'])

    def test_deleting_an_assistant_frees_the_lab(self):
        self.assign()
        self.assertEqual(self.client.delete(f"/api/users/{self.users['asst1'].id}", headers=self.auth('admin1')).status_code, 200)
        self.assertEqual(RoomAssistant.query.count(), 0)

    # ---------------------------------------------------------------- room control
    def test_assistant_controls_only_their_own_room(self):
        self.assign()
        own = self.client.put('/api/map/room-states/cs-01', json=CALM, headers=self.auth('asst1'))
        other = self.client.put('/api/map/room-states/cs-02', json=CALM, headers=self.auth('asst1'))
        self.assertEqual((own.status_code, other.status_code), (200, 403))

    def test_assistant_without_a_room_controls_nothing(self):
        self.assertEqual(self.client.put('/api/map/room-states/cs-01', json=CALM, headers=self.auth('asst1')).status_code, 403)

    def test_deactivated_assistant_controls_nothing(self):
        self.assign()
        self.users['asst1'].is_active_account = False
        db.session.commit()
        self.assertEqual(self.client.put('/api/map/room-states/cs-01', json=CALM, headers=self.auth('asst1')).status_code, 403)

    # ---------------------------------------------------------------- email
    def test_only_admin_can_send(self):
        self.assign()
        self.overuse()
        with mock.patch(SEND_REPORT, return_value=True) as send:
            for name in ('fac1', 'stu1', 'asst1'):
                self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth(name)).status_code, 403)
        send.assert_not_called()

    def test_report_uses_server_figures_and_is_logged(self):
        self.assign()
        self.overuse()
        with mock.patch(SEND_REPORT, return_value=True) as send:
            response = self.client.post(EMAIL, json={'note': 'Soon please', 'excess_kw': 99}, headers=self.auth('admin1'))
        self.assertEqual(response.status_code, 200)
        to_email, assistant, room, report, admin, reply_to, note, _ = send.call_args.args
        self.assertEqual((to_email, assistant, room, admin, reply_to, note), ('asst1@x.test', 'asst1', 'Lab CS-01', 'admin1', 'admin1@x.test', 'Soon please'))
        self.assertEqual(report['excess_kw'], 1.68)
        log = AssistantMailLog.query.one()
        self.assertEqual((log.sent_to, log.sent_by, log.excess_kw), ('asst1@x.test', 'admin1', 1.68))
        self.assertEqual(self.client.get('/api/map/assistants', headers=self.auth('admin1')).get_json()['cs-01']['last_report']['sent_by'], 'admin1')

    def test_no_report_without_an_assistant_or_extra_use(self):
        self.overuse()
        with mock.patch(SEND_REPORT, return_value=True) as send:
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 409)
            self.assign()
            RoomLiveState.query.delete()
            db.session.commit()
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 409)
            self.overuse(acs=3)
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 409)
        send.assert_not_called()

    def test_repeat_report_waits_but_failed_send_does_not_count(self):
        self.assign()
        self.overuse()
        with mock.patch(SEND_REPORT, return_value=False):
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 502)
        self.assertEqual(AssistantMailLog.query.count(), 0)
        with mock.patch(SEND_REPORT, return_value=True) as send:
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 200)
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 429)
            log = AssistantMailLog.query.one()
            log.sent_at -= timedelta(seconds=121)
            db.session.commit()
            self.assertEqual(self.client.post(EMAIL, json={}, headers=self.auth('admin1')).status_code, 200)
        self.assertEqual(send.call_count, 2)

    def test_long_note_is_cut(self):
        self.assign()
        self.overuse()
        with mock.patch(SEND_REPORT, return_value=True) as send:
            self.client.post(EMAIL, json={'note': 'x' * 900}, headers=self.auth('admin1'))
        self.assertEqual(len(send.call_args.args[6]), 500)


if __name__ == '__main__':
    unittest.main()
