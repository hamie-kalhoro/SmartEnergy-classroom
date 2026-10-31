from datetime import timezone
import logging
import os
import uuid
import smtplib
import bcrypt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from email_templates import build_activation_message, build_energy_report_message
from models import db, User, Classroom, RoomAssistant, EnergyDecision, DailyEnergyLog, Notification
from room_catalog import SCHEDULABLE_TYPES

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_activation_email(to_email, username, token):
        server = os.getenv('MAIL_SERVER')
        port = int(os.getenv('MAIL_PORT', 587))
        username_smtp = os.getenv('MAIL_USERNAME')
        password = os.getenv('MAIL_PASSWORD')
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        activation_link = f"{backend_url}/api/activate?token={token}"

        try:
            msg = build_activation_message(to_email, sender, username, activation_link)
            with smtplib.SMTP(server, port, timeout=10) as smtp:
                smtp.starttls(); smtp.login(username_smtp, password); smtp.send_message(msg)
            return True
        except Exception as e:
            logger.error("Activation email to %s failed: %s", to_email, e)
            return False

    @staticmethod
    def send_energy_report(to_email, assistant, room_name, report, admin_name, reply_to, note, sent_at):
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/map"
        try:
            msg = build_energy_report_message(to_email, sender, reply_to, assistant, room_name, report, admin_name, note, sent_at, link)
            with smtplib.SMTP(os.getenv('MAIL_SERVER'), int(os.getenv('MAIL_PORT', 587)), timeout=10) as smtp:
                smtp.starttls(); smtp.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD')); smtp.send_message(msg)
            return True
        except Exception as e:
            logger.error("Energy report to %s failed: %s", to_email, e)
            return False

    @staticmethod
    def notify_superior_of_deletion(superior_email, admin_name, target_user_name, target_role):
        html = f"<h3>Security Alert: User Deleted</h3><p>Admin {admin_name} removed {target_user_name} ({target_role}).</p>"
        try:
            msg = MIMEMultipart(); msg['From'] = os.getenv('MAIL_DEFAULT_SENDER'); msg['To'] = superior_email; msg['Subject'] = "⚠️ SECURITY LOG: User Deletion"; msg.attach(MIMEText(html, 'html'))
            with smtplib.SMTP(os.getenv('MAIL_SERVER'), int(os.getenv('MAIL_PORT', 587))) as smtp:
                smtp.starttls(); smtp.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD')); smtp.send_message(msg)
        except: pass

class PasswordService:
    @staticmethod
    def hash_password(pw): return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    @staticmethod
    def verify_password(pw, hashed): return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))

class AuthService:
    @staticmethod
    def register_user(username, email, password, role):
        if User.query.filter_by(email=email).first(): return None, "Email exists"
        token = str(uuid.uuid4()); is_pending = (role == 'admin')
        new_user = User(username=username, email=email, password_hash=PasswordService.hash_password(password), role=role, activation_token=token, is_active_account=False, is_pending_admin=is_pending)
        db.session.add(new_user); db.session.commit()
        if is_pending:
            db.session.add(Notification(type='admin_request', message=f'{username} requested access', target_role='admin', related_user_id=new_user.id))
            db.session.commit(); return new_user, "Admin access pending approval."
        # Not a database column: tells the signup route whether to promise an email.
        new_user.activation_email_sent = EmailService.send_activation_email(email, username, token)
        return new_user, None

    @staticmethod
    def vacant_rooms():
        """Rooms on the map that can take an assistant and do not have one yet."""
        taken = db.session.query(RoomAssistant.classroom_id).filter_by(status='active')
        return Classroom.query.filter(
            Classroom.is_active.is_(True), Classroom.map_id.isnot(None),
            Classroom.room_type.in_(SCHEDULABLE_TYPES), Classroom.id.notin_(taken)
        ).order_by(Classroom.name).all()

    @staticmethod
    def register_assistant(username, email, password, classroom_id):
        """A self-signup stays locked until an administrator approves it, like an admin request."""
        if not username or not email or not password or len(password) < 6:
            return None, "Enter your name, email and a password of at least 6 characters."
        if User.query.filter_by(email=email).first(): return None, "Email exists"
        if User.query.filter_by(username=username).first(): return None, "Username is already taken"
        room = next((r for r in AuthService.vacant_rooms() if r.id == classroom_id), None)
        if not room: return None, "That lab is not available. Please choose another."
        new_user = User(username=username, email=email, password_hash=PasswordService.hash_password(password), role='assistant', is_active_account=False, is_pending_admin=True)
        db.session.add(new_user); db.session.flush()
        db.session.add(RoomAssistant(classroom_id=room.id, user_id=new_user.id, status='pending'))
        db.session.add(Notification(type='admin_request', message=f'{username} requested lab assistant access for {room.name}', target_role='admin', related_user_id=new_user.id))
        db.session.commit()
        return new_user, None

    @staticmethod
    def resend_activation(login_id):
        """Send a new activation email. Returns None when the account does not need one."""
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        if not user or user.is_active_account or user.is_pending_admin:
            return None
        if not user.activation_token:
            user.activation_token = str(uuid.uuid4())
            db.session.commit()
        return EmailService.send_activation_email(user.email, user.username, user.activation_token)

    @staticmethod
    def admin_create_user(username, email, password, role, auto_activate=False):
        if User.query.filter_by(email=email).first(): return None, "Email exists"
        token = str(uuid.uuid4()) if not auto_activate else None
        new_user = User(username=username, email=email, password_hash=PasswordService.hash_password(password), role=role, is_active_account=auto_activate, activation_token=token)
        db.session.add(new_user); db.session.commit()
        # Not a database column: tells the caller whether the activation email went out.
        new_user.activation_email_sent = auto_activate or EmailService.send_activation_email(email, username, token)
        return new_user, None

    @staticmethod
    def login_user(login_id, password):
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        if not user or not PasswordService.verify_password(password, user.password_hash): return None, "Invalid login"
        if user.is_pending_admin: return None, "Admin approval pending"
        if not user.is_active_account: return None, "Account not activated"
        return user, None

    @staticmethod
    def activate_user(token):
        user = User.query.filter_by(activation_token=token).first()
        if not user: return False
        user.is_active_account = True; user.activation_token = None
        db.session.commit(); return True

    @staticmethod
    def approve_admin(user_id, approved_by=None):
        user = db.session.get(User, user_id)
        if not user: return False, "User not found"
        user.is_pending_admin = False; user.is_active_account = True
        access = 'lab assistant' if user.role == 'assistant' else 'admin'
        db.session.add(Notification(type='admin_approved', message=f'Your {access} access was approved by {approved_by}', target_role='faculty', related_user_id=user.id))
        db.session.commit(); return True, None

class EnergyService:
    @staticmethod
    def log_decision(room_id, occupancy, lights, ac, saved, commit=True):
        db.session.add(EnergyDecision(classroom_id=room_id, predicted_occupancy=occupancy, lights_action=lights, ac_action=ac, energy_saved_kwh=saved))
        if commit:
            db.session.commit()

    @staticmethod
    def get_daily_summary():
        from sqlalchemy import func
        today = datetime.now(timezone.utc).date()
        savings = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(func.date(EnergyDecision.timestamp) == today).scalar() or 0
        decisions = EnergyDecision.query.filter(func.date(EnergyDecision.timestamp) == today).count()
        return {'savings': round(float(savings), 2), 'decisions': decisions}

class ReportingService:
    @staticmethod
    def get_today_estimation():
        from ml_engine import get_ml_engine
        from sqlalchemy import func
        from models import Timetable
        now = datetime.now(timezone.utc) # Needs UTC+5 logic in production
        actual = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(func.date(EnergyDecision.timestamp) == now.date()).scalar() or 0
        ml = get_ml_engine(); future_slots = Timetable.query.all(); projected = 0
        for slot in future_slots:
            try:
                if int(slot.time_slot.split(':')[0]) > now.hour:
                    _, idx, _, _ = ml.predict(slot.day_of_week, slot.time_slot, slot.subject_type, slot.expected_attendance, subject=slot.subject)
                    if idx < 3: projected += 1.5 # Empty/Trace/Light all provide significant savings
            except: continue
        return round(float(actual) + projected, 1)

    @staticmethod
    def generate_weekly_stats():
        from sqlalchemy import func
        from datetime import timedelta
        ago = datetime.now(timezone.utc) - timedelta(days=7); prev = datetime.now(timezone.utc) - timedelta(days=14)
        current = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= ago).scalar() or 0
        decisions = EnergyDecision.query.filter(EnergyDecision.timestamp >= ago).count()
        prev_s = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= prev, EnergyDecision.timestamp < ago).scalar() or 0
        growth = round(((current - prev_s) / prev_s) * 100, 1) if prev_s > 0 else 0
        return {'total_savings': round(float(current), 2), 'total_decisions': decisions, 'growth': growth, 'growth_label': 'higher' if growth >= 0 else 'lower'}

    @staticmethod
    def trigger_weekend_briefing():
        admins = User.query.filter_by(role='admin', is_active_account=True).all(); stats = ReportingService.generate_weekly_stats()
        for admin in admins:
            db.session.add(Notification(type='energy_report', message=f"Weekly stats: {stats['total_savings']} kWh saved.", target_role='admin'))
        db.session.commit(); return len(admins)
