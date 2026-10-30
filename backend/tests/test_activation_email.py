"""Run from backend/: python -m unittest tests.test_activation_email"""
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager

import email_templates
from email_templates import LOGO_CID, build_activation_message
from models import db, User
from routes.auth import auth_bp, resend_available_at
from services import EmailService

SEND = 'services.EmailService.send_activation_email'
SIGNUP = {'username': 'new', 'email': 'new@x.test', 'password': 'pw', 'role': 'user'}
MAIL_ENV = {'MAIL_SERVER': 'smtp.x.test', 'MAIL_USERNAME': 'u', 'MAIL_PASSWORD': 'p', 'MAIL_DEFAULT_SENDER': 'sender@x.test'}


class ActivationTemplateTest(unittest.TestCase):
    LINK = 'http://localhost:5000/api/activate?token=abc-123'

    def build(self, username='Neo'):
        return build_activation_message('a@x.test', 'sender@x.test', username, self.LINK)

    def part(self, message, content_type):
        return next(p for p in message.walk() if p.get_content_type() == content_type)

    def body(self, message, content_type):
        return self.part(message, content_type).get_payload(decode=True).decode('utf-8')

    def test_headers(self):
        message = self.build()
        self.assertEqual(message['Subject'], 'Activate your SmartEnergy account')
        self.assertEqual(message['From'], 'SmartEnergy <sender@x.test>')
        self.assertEqual(message['To'], 'a@x.test')

    def test_both_versions_carry_the_link_and_name(self):
        message = self.build()
        for content_type in ('text/plain', 'text/html'):
            body = self.body(message, content_type)
            self.assertIn(self.LINK, body)
            self.assertIn('Neo', body)

    def test_wording_suits_every_role(self):
        self.assertNotIn('administrative', self.body(self.build(), 'text/html').lower())

    def test_username_cannot_inject_html(self):
        html = self.body(self.build('<a href="http://evil.test">x</a>'), 'text/html')
        self.assertNotIn('http://evil.test">', html)
        self.assertIn('&lt;a href=', html)

    def test_inline_logo_matches_the_html_reference(self):
        message = self.build()
        logo = self.part(message, 'image/gif')
        self.assertEqual(logo['Content-ID'], f'<{LOGO_CID}>')
        self.assertIn(f'cid:{LOGO_CID}', self.body(message, 'text/html'))
        self.assertTrue(logo.get_payload(decode=True).startswith(b'GIF89a'))

    def test_logo_is_small_enough_for_email(self):
        self.assertLess(os.path.getsize(email_templates.LOGO_PATH), 150 * 1024)

    def test_missing_logo_does_not_stop_the_email(self):
        with mock.patch.object(email_templates, 'LOGO_PATH', 'does-not-exist.gif'):
            message = self.build()
        self.assertNotIn(f'cid:{LOGO_CID}', self.body(message, 'text/html'))
        self.assertFalse([p for p in message.walk() if p.get_content_type() == 'image/gif'])
        self.assertIn(self.LINK, self.body(message, 'text/html'))

    def test_service_sends_the_built_message(self):
        with mock.patch('services.smtplib.SMTP') as smtp, mock.patch.dict(os.environ, MAIL_ENV):
            self.assertTrue(EmailService.send_activation_email('a@x.test', 'Neo', 'token'))
        sent = smtp.return_value.__enter__.return_value.send_message.call_args[0][0]
        self.assertEqual(sent['Subject'], 'Activate your SmartEnergy account')


class ActivationEmailTest(unittest.TestCase):
    def setUp(self):
        resend_available_at.clear()
        self.app = Flask(__name__)
        self.app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            JWT_SECRET_KEY='test-secret-key-that-is-long-enough-for-hs256',
        )
        db.init_app(self.app)
        JWTManager(self.app)
        self.app.register_blueprint(auth_bp)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def add_user(self, **fields):
        values = {'username': 'stuck', 'email': 'stuck@x.test', 'password_hash': 'x', 'role': 'user',
                  'is_active_account': False, 'activation_token': 'old-token', **fields}
        db.session.add(User(**values))
        db.session.commit()

    def resend(self, login='stuck'):
        return self.client.post('/api/resend-activation', json={'login': login})

    def test_signup_reports_a_sent_email(self):
        with mock.patch(SEND, return_value=True):
            data = self.client.post('/api/signup', json=SIGNUP).get_json()
        self.assertTrue(data['email_sent'])

    def test_signup_does_not_claim_a_failed_email_was_sent(self):
        with mock.patch(SEND, return_value=False):
            res = self.client.post('/api/signup', json=SIGNUP)
        data = res.get_json()
        self.assertEqual(res.status_code, 200)
        self.assertFalse(data['email_sent'])
        self.assertNotIn('has been sent', data['message'])
        self.assertIsNotNone(User.query.filter_by(email=SIGNUP['email']).first())

    def test_smtp_failure_returns_false_and_is_logged(self):
        with mock.patch('services.smtplib.SMTP', side_effect=OSError('rejected')), mock.patch.dict(os.environ, MAIL_ENV), self.assertLogs('services', level='ERROR') as logs:
            sent = EmailService.send_activation_email('a@x.test', 'a', 'token')
        self.assertFalse(sent)
        self.assertIn('rejected', logs.output[0])

    def test_stuck_user_can_get_a_new_email_by_username_or_email(self):
        self.add_user()
        with mock.patch(SEND, return_value=True) as send:
            self.assertEqual(self.resend('stuck').status_code, 200)
            self.assertEqual(self.resend('stuck@x.test').status_code, 200)
        send.assert_called_with('stuck@x.test', 'stuck', 'old-token')
        self.assertEqual(send.call_count, 2)

    def test_missing_token_is_replaced(self):
        self.add_user(activation_token=None)
        with mock.patch(SEND, return_value=True) as send:
            self.resend()
        self.assertTrue(send.call_args[0][2])
        self.assertEqual(User.query.first().activation_token, send.call_args[0][2])

    def test_resend_reports_when_email_service_is_down(self):
        self.add_user()
        with mock.patch(SEND, return_value=False):
            self.assertEqual(self.resend().status_code, 503)

    def test_resend_is_limited_per_account(self):
        self.add_user()
        with mock.patch(SEND, return_value=True) as send:
            self.resend()
            self.assertEqual(self.resend('STUCK').status_code, 429)
        send.assert_called_once()

    def test_unknown_account_gets_the_same_reply_and_no_email(self):
        self.add_user()
        with mock.patch(SEND, return_value=True) as send:
            known = self.resend('stuck').get_json()
            unknown = self.resend('nobody@x.test')
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(unknown.get_json(), known)
        send.assert_called_once()

    def test_active_and_pending_admin_accounts_get_no_email(self):
        self.add_user(username='active', email='active@x.test', is_active_account=True)
        self.add_user(username='pending', email='pending@x.test', is_pending_admin=True, role='admin')
        with mock.patch(SEND, return_value=True) as send:
            self.resend('active')
            self.resend('pending')
        send.assert_not_called()

    def test_empty_login_is_rejected(self):
        self.assertEqual(self.resend('  ').status_code, 400)


if __name__ == '__main__':
    unittest.main()
