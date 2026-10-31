"""Run from backend/: python -m unittest tests.test_auth_flows"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager
from itsdangerous import URLSafeTimedSerializer

from email_templates import build_password_reset_message
from models import db, User, Notification
from routes.auth import auth_bp, failed_logins, resend_available_at, MAX_LOGIN_FAILURES, LOGIN_LOCK_SECONDS
from services import AuthService, PasswordService

SEND_ACTIVATION = 'services.EmailService.send_activation_email'
SEND_RESET = 'services.EmailService.send_password_reset_email'
PASSWORD = 'correct-pass'


class AuthFlowCase(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.config.update(TESTING=True, SQLALCHEMY_DATABASE_URI='sqlite:///:memory:', SQLALCHEMY_TRACK_MODIFICATIONS=False,
                          JWT_SECRET_KEY='test-jwt-secret-key-long-enough-for-hs256', SECRET_KEY='test-secret',
                          FRONTEND_URL='http://front.test')
        db.init_app(app)
        JWTManager(app)
        app.register_blueprint(auth_bp)
        self.ctx = app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = app.test_client()
        failed_logins.clear()
        resend_available_at.clear()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def add_user(self, **fields):
        values = {'username': 'member', 'email': 'member@x.test', 'password_hash': PasswordService.hash_password(PASSWORD),
                  'role': 'user', 'is_active_account': True, **fields}
        user = User(**values)
        db.session.add(user)
        db.session.commit()
        return user

    def signup(self, **changes):
        body = {'username': 'New Person', 'email': 'new@x.test', 'password': PASSWORD, 'role': 'user', **changes}
        with mock.patch(SEND_ACTIVATION, return_value=True):
            return self.client.post('/api/signup', json=body)

    def login(self, username='member', password=PASSWORD):
        return self.client.post('/api/login', json={'username': username, 'password': password})


class SignupRulesTest(AuthFlowCase):
    def test_student_is_activated_by_email(self):
        with mock.patch(SEND_ACTIVATION, return_value=True) as send:
            data = self.client.post('/api/signup', json={'username': 'Stu', 'email': 's@x.test', 'password': PASSWORD, 'role': 'user'}).get_json()
        self.assertTrue(data['success'])
        self.assertNotIn('pending', data)
        send.assert_called_once()

    def test_faculty_waits_for_approval_and_gets_no_activation_email(self):
        with mock.patch(SEND_ACTIVATION) as send:
            response = self.client.post('/api/signup', json={'username': 'Prof', 'email': 'p@x.test', 'password': PASSWORD, 'role': 'faculty'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()['pending'])
        send.assert_not_called()
        user = User.query.filter_by(email='p@x.test').one()
        self.assertTrue(user.is_pending_admin)
        self.assertIsNone(user.activation_token)
        self.assertEqual(Notification.query.filter_by(related_user_id=user.id).one().message, 'Prof requested faculty access')

    def test_pending_faculty_cannot_sign_in_until_approved(self):
        self.signup(role='faculty')
        response = self.login('new@x.test')
        self.assertEqual(response.status_code, 401)
        self.assertIn('approval', response.get_json()['message'])
        user = User.query.filter_by(email='new@x.test').one()
        AuthService.approve_admin(user.id, approved_by='boss')
        self.assertEqual(self.login('new@x.test').status_code, 200)
        self.assertEqual(Notification.query.filter_by(type='admin_approved').one().message, 'Your faculty access was approved by boss')

    def test_public_signup_cannot_choose_admin_or_invent_a_role(self):
        for role in ('admin', 'superuser', '', None, ['admin']):
            response = self.signup(role=role)
            self.assertEqual(response.status_code, 400, role)
        self.assertEqual(User.query.count(), 0)

    def test_server_rejects_bad_details(self):
        cases = ({'password': 'short'}, {'password': None}, {'password': 12345678}, {'password': 'x' * 73},
                 {'email': 'not-an-email'}, {'email': None}, {'username': '   '}, {'username': None})
        for changes in cases:
            for role in ('user', 'faculty'):
                self.assertEqual(self.signup(role=role, **changes).status_code, 400, changes)
        self.assertEqual(User.query.count(), 0)

    def test_duplicates_are_refused_with_a_clear_reason(self):
        self.signup()
        same_email = self.signup(username='Other')
        self.assertEqual(same_email.status_code, 400)
        self.assertIn('already exists', same_email.get_json()['message'])
        same_name = self.signup(email='other@x.test')
        self.assertEqual(same_name.status_code, 400)
        self.assertIn('already taken', same_name.get_json()['message'])

    def test_malformed_request_does_not_crash(self):
        response = self.client.post('/api/signup', data='not json', content_type='text/plain')
        self.assertEqual(response.status_code, 400)


class LoginLimitTest(AuthFlowCase):
    def test_success_and_generic_failure(self):
        self.add_user()
        self.assertEqual(self.login().status_code, 200)
        wrong = self.login(password='wrong-pass').get_json()['message']
        unknown = self.login(username='nobody').get_json()['message']
        self.assertEqual(wrong, unknown)

    def test_odd_values_are_a_failed_login_not_a_crash(self):
        self.add_user()
        for body in ({'username': 'member', 'password': None}, {'username': None, 'password': 'x'},
                     {'username': 'member', 'password': 123}, {'username': 'member', 'password': 'x' * 100}, {}):
            self.assertEqual(self.client.post('/api/login', json=body).status_code, 401, body)

    def test_account_locks_after_repeated_failures_even_with_the_right_password(self):
        self.add_user()
        for _ in range(MAX_LOGIN_FAILURES):
            self.assertEqual(self.login(password='wrong-pass').status_code, 401)
        locked = self.login()
        self.assertEqual(locked.status_code, 429)
        self.assertIn('Try again in 5 minutes', locked.get_json()['message'])

    def test_lock_ends_after_the_wait(self):
        self.add_user()
        with mock.patch('routes.auth.time.monotonic', return_value=1000):
            for _ in range(MAX_LOGIN_FAILURES):
                self.login(password='wrong-pass')
            self.assertEqual(self.login().status_code, 429)
        with mock.patch('routes.auth.time.monotonic', return_value=1000 + LOGIN_LOCK_SECONDS + 1):
            self.assertEqual(self.login().status_code, 200)

    def test_success_clears_earlier_failures(self):
        self.add_user()
        for _ in range(MAX_LOGIN_FAILURES - 1):
            self.login(password='wrong-pass')
        self.assertEqual(self.login().status_code, 200)
        for _ in range(MAX_LOGIN_FAILURES - 1):
            self.assertEqual(self.login(password='wrong-pass').status_code, 401)

    def test_case_and_spaces_do_not_avoid_the_limit(self):
        self.add_user()
        for name in ('member', 'MEMBER', ' member', 'Member ', 'mEmBeR'):
            self.login(username=name, password='wrong-pass')
        self.assertEqual(self.login().status_code, 429)

    def test_another_account_is_not_locked(self):
        self.add_user()
        self.add_user(username='other', email='other@x.test')
        for _ in range(MAX_LOGIN_FAILURES):
            self.login(password='wrong-pass')
        self.assertEqual(self.login(username='other').status_code, 200)

    def test_admin_check_cannot_be_used_to_avoid_the_limit(self):
        self.add_user(username='boss', email='boss@x.test', role='admin')
        for _ in range(MAX_LOGIN_FAILURES):
            response = self.client.post('/api/verify-admin', json={'username': 'boss', 'password': 'wrong-pass'})
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.client.post('/api/verify-admin', json={'username': 'boss', 'password': PASSWORD}).status_code, 429)
        self.assertEqual(self.login(username='boss').status_code, 429)


class PasswordResetTest(AuthFlowCase):
    def request_reset(self, login='member'):
        with mock.patch(SEND_RESET, return_value=True) as send:
            response = self.client.post('/api/forgot-password', json={'login': login})
        return response, send

    def token_for(self, user):
        return AuthService.password_reset_token(user)

    def reset(self, token, password='brand-new-pass'):
        return self.client.post('/api/reset-password', json={'token': token, 'password': password})

    def test_email_goes_to_the_account_with_a_frontend_link(self):
        self.add_user()
        _, send = self.request_reset()
        to_email, username, link = send.call_args.args
        self.assertEqual((to_email, username), ('member@x.test', 'member'))
        self.assertTrue(link.startswith('http://front.test/reset-password?token='))
        self.assertEqual(self.reset(link.split('token=')[1]).status_code, 200)

    def test_reply_does_not_reveal_whether_an_account_exists(self):
        self.add_user()
        self.add_user(username='inactive', email='i@x.test', is_active_account=False)
        self.add_user(username='waiting', email='w@x.test', is_pending_admin=True, is_active_account=False)
        replies = []
        for login, emailed in (('member', True), ('nobody', False), ('inactive', False), ('waiting', False)):
            response, send = self.request_reset(login)
            self.assertEqual(send.called, emailed, login)
            replies.append((response.status_code, response.get_json()['message']))
        self.assertEqual(len(set(replies)), 1)

    def test_a_failed_email_gives_the_same_reply(self):
        self.add_user()
        with mock.patch(SEND_RESET, return_value=False):
            response = self.client.post('/api/forgot-password', json={'login': 'member'})
        self.assertEqual(response.status_code, 200)

    def test_requests_are_limited_per_account(self):
        self.add_user()
        self.request_reset()
        response, send = self.request_reset()
        self.assertEqual(response.status_code, 429)
        send.assert_not_called()

    def test_blank_request_is_refused(self):
        self.assertEqual(self.client.post('/api/forgot-password', json={'login': '  '}).status_code, 400)

    def test_reset_changes_the_password(self):
        user = self.add_user()
        self.assertEqual(self.reset(self.token_for(user)).status_code, 200)
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login(password='brand-new-pass').status_code, 200)

    def test_link_works_only_once(self):
        user = self.add_user()
        token = self.token_for(user)
        self.assertEqual(self.reset(token).status_code, 200)
        self.assertEqual(self.reset(token, 'another-new-pass').status_code, 400)
        self.assertEqual(self.login(password='brand-new-pass').status_code, 200)

    def test_link_expires_after_an_hour(self):
        user = self.add_user()
        with mock.patch('itsdangerous.timed.time.time', return_value=1_000_000):
            token = self.token_for(user)
        with mock.patch('itsdangerous.timed.time.time', return_value=1_000_000 + 3601):
            self.assertEqual(self.reset(token).status_code, 400)
        with mock.patch('itsdangerous.timed.time.time', return_value=1_000_000 + 3599):
            self.assertEqual(self.reset(token).status_code, 200)

    def test_bad_tokens_are_refused(self):
        user = self.add_user()
        other = self.add_user(username='other', email='other@x.test')
        good = self.token_for(user)
        _, _, signed = good.partition('.')
        forged_without_hash = URLSafeTimedSerializer('test-secret', salt='password-reset').dumps(user.id)
        for token in (None, '', 123, 'garbage', '.', f'{user.id}.', f'{user.id}.bad', f'{other.id}.{signed}',
                      f'{user.id}.{forged_without_hash}', f'999.{signed}', f'abc.{signed}', ['x']):
            self.assertEqual(self.reset(token).status_code, 400, token)
        self.assertEqual(self.login().status_code, 200)

    def test_weak_password_is_refused_and_link_stays_usable(self):
        user = self.add_user()
        token = self.token_for(user)
        for password in ('short', None, 12345678, 'x' * 73):
            self.assertEqual(self.reset(token, password).status_code, 400, password)
        self.assertEqual(self.reset(token).status_code, 200)

    def test_inactive_account_cannot_reset(self):
        user = self.add_user(is_active_account=False)
        self.assertEqual(self.reset(self.token_for(user)).status_code, 400)

    def test_reset_clears_the_login_lock(self):
        user = self.add_user()
        for _ in range(MAX_LOGIN_FAILURES):
            self.login(password='wrong-pass')
        self.assertEqual(self.login().status_code, 429)
        self.reset(self.token_for(user))
        self.assertEqual(self.login(password='brand-new-pass').status_code, 200)

    def test_email_escapes_the_name_and_carries_the_link(self):
        link = 'http://front.test/reset-password?token=abc'
        message = build_password_reset_message('a@x.test', 'sender@x.test', '<b>Neo</b>', link)
        self.assertEqual(message['Subject'], 'Reset your SmartClass password')
        self.assertEqual(message['From'], 'SmartClass <sender@x.test>')
        parts = {p.get_content_type(): p.get_payload(decode=True).decode('utf-8') for p in message.walk() if p.get_content_maintype() == 'text'}
        self.assertIn(link, parts['text/plain'])
        self.assertIn(link, parts['text/html'])
        self.assertIn('&lt;b&gt;Neo&lt;/b&gt;', parts['text/html'])
        self.assertNotIn('<b>Neo</b>', parts['text/html'])


if __name__ == '__main__':
    unittest.main()
