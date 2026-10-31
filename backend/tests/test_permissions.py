"""Run from backend/: python -m unittest tests.test_permissions"""
import io
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from models import db, Classroom, Timetable, User
from routes.auth import auth_bp
from routes.ml import ml_bp
from routes.timetable import timetable_bp

NEW_CLASS = {
    'classroom_id': 1, 'day': 'Monday', 'time': '09:00', 'subject': 'New', 'type': 'theory',
    'teacher': 'T', 'email': 't@x.test', 'attendance': 50
}
TIMETABLE_CSV = b'classroom_id,day,time,subject,type,teacher,email,attendance\n1,Monday,10:00,CSV,theory,T,t@x.test,50\n'
NEW_ADMIN = {'username': 'sneaky', 'email': 'sneaky@x.test', 'password': 'pw', 'role': 'admin', 'auto_activate': True}


def csv_upload(content=b'day,hour,type,attendance\nMonday,9,theory,50\n'):
    return {'file': (io.BytesIO(content), 'data.csv')}


class PermissionsTest(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SQLALCHEMY_DATABASE_URI='sqlite:///:memory:',
            JWT_SECRET_KEY='test-secret-key-that-is-long-enough-for-hs256',
            UPLOAD_FOLDER=os.path.join(os.path.dirname(__file__), '__pycache__'),
        )
        db.init_app(self.app)
        JWTManager(self.app)
        for blueprint in (auth_bp, ml_bp, timetable_bp):
            self.app.register_blueprint(blueprint)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        db.session.add(Classroom(id=1, name='Room', building='B', capacity=30))
        db.session.add(Timetable(
            id=1, classroom_id=1, day_of_week='Monday', time_slot='08:00', subject='Existing', subject_type='theory',
            teacher_name='T', teacher_email='t@x.test', expected_attendance=50
        ))
        self.pending = User(username='pending', email='pending@x.test', password_hash='x', role='admin', is_pending_admin=True)
        db.session.add(self.pending)
        self.tokens = {role: self.make_token(role) for role in ('user', 'faculty', 'admin')}
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def make_token(self, role, active=True):
        user = User(username=f'{role}-{active}', email=f'{role}-{active}@x.test', password_hash='x', role=role, is_active_account=active)
        db.session.add(user)
        db.session.flush()
        return create_access_token(identity=str(user.id))

    def auth(self, role):
        return {'Authorization': f'Bearer {self.tokens[role]}'}

    def post_file(self, url, role, content=None):
        data = csv_upload(content) if content else csv_upload()
        return self.client.post(url, data=data, headers=self.auth(role), content_type='multipart/form-data')

    def test_only_admin_can_delete_a_class(self):
        for role in ('user', 'faculty'):
            self.assertEqual(self.client.delete('/api/timetable/1', headers=self.auth(role)).status_code, 403)
        self.assertIsNotNone(db.session.get(Timetable, 1))
        self.assertEqual(self.client.delete('/api/timetable/1', headers=self.auth('admin')).status_code, 200)
        db.session.expire_all()
        self.assertIsNone(db.session.get(Timetable, 1))

    def test_only_admin_can_add_a_class(self):
        for role in ('user', 'faculty'):
            self.assertEqual(self.client.post('/api/timetable', json=NEW_CLASS, headers=self.auth(role)).status_code, 403)
        self.assertEqual(Timetable.query.count(), 1)
        self.assertEqual(self.client.post('/api/timetable', json=NEW_CLASS, headers=self.auth('admin')).status_code, 200)
        self.assertEqual(Timetable.query.count(), 2)

    def test_only_admin_can_bulk_import_classes(self):
        for role in ('user', 'faculty'):
            self.assertEqual(self.post_file('/api/timetable/bulk-import', role, TIMETABLE_CSV).status_code, 403)
        self.assertEqual(Timetable.query.count(), 1)
        self.assertEqual(self.post_file('/api/timetable/bulk-import', 'admin', TIMETABLE_CSV).status_code, 200)
        self.assertEqual(Timetable.query.count(), 2)

    def test_only_admin_can_record_attendance(self):
        body = {'timetable_id': 1, 'actual_attendance': 10}
        for role in ('user', 'faculty'):
            self.assertEqual(self.client.post('/api/timetable/attendance', json=body, headers=self.auth(role)).status_code, 403)

    def test_everyone_can_read_the_timetable(self):
        self.assertEqual(len(self.client.get('/api/timetable').get_json()), 1)

    def test_only_admin_can_train(self):
        with mock.patch('routes.ml.get_ml_engine') as engine:
            engine.return_value.digest_and_train.return_value = ({'accuracy': 1}, None)
            for role in ('user', 'faculty'):
                self.assertEqual(self.post_file('/api/ml/upload-train', role).status_code, 403)
            engine.return_value.digest_and_train.assert_not_called()
            self.assertEqual(self.post_file('/api/ml/upload-train', 'admin').status_code, 200)
            engine.return_value.digest_and_train.assert_called_once()

    def test_students_cannot_batch_predict(self):
        with mock.patch('routes.ml.get_ml_engine') as engine, mock.patch('routes.ml.get_climate_context', return_value={}):
            engine.return_value.predict.side_effect = ValueError('rows are skipped')
            self.assertEqual(self.post_file('/api/ml/predict-batch', 'user').status_code, 403)
            for role in ('faculty', 'admin'):
                self.assertEqual(self.post_file('/api/ml/predict-batch', role).status_code, 200)

    def test_student_cannot_become_admin(self):
        pending_id = self.pending.id
        headers = self.auth('user')
        self.assertEqual(self.client.post('/api/users/create-single', json=NEW_ADMIN, headers=headers).status_code, 403)
        self.assertEqual(self.client.post(f'/api/users/approve-admin/{pending_id}', headers=headers).status_code, 403)
        self.assertEqual(self.client.post(f'/api/users/activate-manual/{pending_id}', headers=headers).status_code, 403)
        self.assertEqual(self.post_file('/api/users/bulk-import', 'user').status_code, 403)
        self.assertIsNone(User.query.filter_by(username='sneaky').first())
        db.session.expire_all()
        self.assertTrue(db.session.get(User, pending_id).is_pending_admin)

    def test_admin_can_approve_a_pending_admin(self):
        response = self.client.post(f'/api/users/approve-admin/{self.pending.id}', headers=self.auth('admin'))
        self.assertEqual(response.status_code, 200)

    def test_deactivated_admin_is_refused(self):
        token = self.make_token('admin', active=False)
        db.session.commit()
        response = self.client.delete('/api/timetable/1', headers={'Authorization': f'Bearer {token}'})
        self.assertEqual(response.status_code, 403)

    def test_request_without_a_token_is_refused(self):
        self.assertEqual(self.client.delete('/api/timetable/1').status_code, 401)
        self.assertEqual(self.client.post('/api/ml/upload-train').status_code, 401)


if __name__ == '__main__':
    unittest.main()
