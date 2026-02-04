from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False) # Hashed password
    role = db.Column(db.String(20), default='user') # 'admin', 'faculty', 'user'
    is_active_account = db.Column(db.Boolean, default=False)
    is_pending_admin = db.Column(db.Boolean, default=False)
    activation_token = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    building = db.Column(db.String(50))
    capacity = db.Column(db.Integer, nullable=False)
    num_lights = db.Column(db.Integer, default=8)
    num_acs = db.Column(db.Integer, default=2)
    is_active = db.Column(db.Boolean, default=True)

class Timetable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    day_of_week = db.Column(db.String(20), nullable=False)
    time_slot = db.Column(db.String(20), nullable=False)
    subject = db.Column(db.String(100))
    subject_type = db.Column(db.String(20))
    teacher_name = db.Column(db.String(100))
    teacher_email = db.Column(db.String(120))
    expected_attendance = db.Column(db.Float)
    
    classroom = db.relationship('Classroom', backref=db.backref('schedules', lazy=True))

class AttendanceHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timetable_id = db.Column(db.Integer, db.ForeignKey('timetable.id'), nullable=False)
    date = db.Column(db.Date, default=datetime.utcnow)
    actual_attendance = db.Column(db.Float)
    
    timetable = db.relationship('Timetable', backref=db.backref('history', lazy=True))

# NEW: Decision History for AI explainability
class EnergyDecision(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey('classroom.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    predicted_occupancy = db.Column(db.String(20)) # Low, Medium, High
    lights_action = db.Column(db.String(10)) # ON, OFF, DIM
    ac_action = db.Column(db.String(10)) # ON, OFF
    energy_saved_kwh = db.Column(db.Float, default=0)
    
    classroom = db.relationship('Classroom', backref=db.backref('decisions', lazy=True))

# NEW: Energy Analytics for reporting
class DailyEnergyLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, default=datetime.utcnow, unique=True)
    total_consumption_kwh = db.Column(db.Float, default=0)
    total_savings_kwh = db.Column(db.Float, default=0)
    avg_occupancy_percent = db.Column(db.Float, default=0)
    total_decisions = db.Column(db.Integer, default=0)
