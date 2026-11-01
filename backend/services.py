from datetime import timezone
import logging
import os
import re
import uuid
import smtplib
import bcrypt
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr
from datetime import datetime
from flask import current_app
from itsdangerous import BadSignature, URLSafeTimedSerializer
from email_templates import LOGO_CID, build_activation_message, build_energy_report_message, build_password_reset_message
from models import db, User, Classroom, RoomAssistant, EnergyDecision, DailyEnergyLog, Notification
from room_catalog import SCHEDULABLE_TYPES

logger = logging.getLogger(__name__)

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # bcrypt only reads this many bytes
RESET_TOKEN_MAX_AGE_SECONDS = 3600
INVALID_LOGIN = "Incorrect email, username or password."
EMAIL_PATTERN = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'
MAIL_TIMEOUT_SECONDS = 10

def _message_body(message, content_type):
    part = next((p for p in message.walk() if p.get_content_type() == content_type), None)
    return part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8') if part else None

def _send_through_brevo(message, api_key):
    name, sender = parseaddr(message['From'])
    payload = {
        'sender': {'name': name or 'SmartClass', 'email': sender},
        'to': [{'email': message['To']}],
        'subject': message['Subject'],
    }
    html = _message_body(message, 'text/html')
    text = _message_body(message, 'text/plain')
    if html:
        # The API takes no inline images, so the logo comes from the website instead.
        logo_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/email-logo.gif"
        payload['htmlContent'] = html.replace(f'cid:{LOGO_CID}', logo_url)
    if text:
        payload['textContent'] = text
    if message['Reply-To']:
        payload['replyTo'] = {'email': parseaddr(message['Reply-To'])[1]}
    response = requests.post(BREVO_SEND_URL, json=payload, headers={'api-key': api_key}, timeout=MAIL_TIMEOUT_SECONDS)
    response.raise_for_status()

def _deliver(message):
    """Free hosts commonly block the SMTP ports, so a Brevo API key takes priority when set."""
    api_key = os.getenv('BREVO_API_KEY')
    if api_key:
        _send_through_brevo(message, api_key)
        return
    with smtplib.SMTP(os.getenv('MAIL_SERVER'), int(os.getenv('MAIL_PORT', 587)), timeout=MAIL_TIMEOUT_SECONDS) as smtp:
        smtp.starttls(); smtp.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD')); smtp.send_message(message)

class EmailService:
    @staticmethod
    def send_activation_email(to_email, username, token):
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')
        activation_link = f"{backend_url}/api/activate?token={token}"

        try:
            msg = build_activation_message(to_email, sender, username, activation_link)
            _deliver(msg)
            return True
        except Exception as e:
            logger.error("Activation email to %s failed: %s", to_email, e)
            return False

    @staticmethod
    def send_password_reset_email(to_email, username, link):
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        try:
            msg = build_password_reset_message(to_email, sender, username, link)
            _deliver(msg)
            return True
        except Exception as e:
            logger.error("Password reset email to %s failed: %s", to_email, e)
            return False

    @staticmethod
    def send_energy_report(to_email, assistant, room_name, report, admin_name, reply_to, note, sent_at):
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/map"
        try:
            msg = build_energy_report_message(to_email, sender, reply_to, assistant, room_name, report, admin_name, note, sent_at, link)
            _deliver(msg)
            return True
        except Exception as e:
            logger.error("Energy report to %s failed: %s", to_email, e)
            return False

    @staticmethod
    def notify_superior_of_deletion(superior_email, admin_name, target_user_name, target_role):
        html = f"<h3>Security Alert: User Deleted</h3><p>Admin {admin_name} removed {target_user_name} ({target_role}).</p>"
        try:
            msg = MIMEMultipart(); msg['From'] = os.getenv('MAIL_DEFAULT_SENDER'); msg['To'] = superior_email; msg['Subject'] = "⚠️ SECURITY LOG: User Deletion"; msg.attach(MIMEText(html, 'html'))
            _deliver(msg)
        except: pass

class PasswordService:
    @staticmethod
    def hash_password(pw): return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    @staticmethod
    def verify_password(pw, hashed): return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))

class AuthService:
    @staticmethod
    def password_error(password):
        if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
            return f"Use a password of at least {MIN_PASSWORD_LENGTH} characters."
        if len(password.encode('utf-8')) > MAX_PASSWORD_BYTES:
            return f"Use a password of at most {MAX_PASSWORD_BYTES} characters."
        return None

    @staticmethod
    def signup_error(username, email, password):
        """The reason a public signup cannot be accepted, or None. The browser checks are not enough."""
        if not isinstance(username, str) or not username.strip() or len(username) > 80:
            return "Enter your full name."
        if not isinstance(email, str) or not EMAIL_PATTERN.match(email) or len(email) > 120:
            return "Enter a valid email address."
        password_problem = AuthService.password_error(password)
        if password_problem: return password_problem
        if User.query.filter_by(email=email).first(): return "An account with this email already exists."
        if User.query.filter_by(username=username).first(): return "This name is already taken. Add an initial to make it unique."
        return None

    @staticmethod
    def register_user(username, email, password, role):
        """Public signup for students and faculty. Administrators create other administrators."""
        if role not in ('user', 'faculty'): return None, "Choose student, faculty or lab assistant."
        error = AuthService.signup_error(username, email, password)
        if error: return None, error
        needs_approval = (role == 'faculty')
        token = None if needs_approval else str(uuid.uuid4())
        new_user = User(username=username, email=email, password_hash=PasswordService.hash_password(password), role=role, activation_token=token, is_active_account=False, is_pending_admin=needs_approval)
        db.session.add(new_user); db.session.commit()
        if needs_approval:
            db.session.add(Notification(type='admin_request', message=f'{username} requested faculty access', target_role='admin', related_user_id=new_user.id))
            db.session.commit(); return new_user, None
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
        error = AuthService.signup_error(username, email, password)
        if error: return None, error
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
        if not isinstance(login_id, str) or not isinstance(password, str): return None, INVALID_LOGIN
        if len(password.encode('utf-8')) > MAX_PASSWORD_BYTES: return None, INVALID_LOGIN
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        if not user or not PasswordService.verify_password(password, user.password_hash): return None, INVALID_LOGIN
        if user.is_pending_admin: return None, "Your account is waiting for administrator approval."
        if not user.is_active_account: return None, "Account not activated"
        return user, None

    @staticmethod
    def _reset_serializer(user):
        # Signed with the password hash, so a link stops working once the password changes.
        secret = f"{current_app.config['SECRET_KEY']}{user.password_hash}"
        return URLSafeTimedSerializer(secret, salt='password-reset')

    @staticmethod
    def password_reset_token(user):
        return f"{user.id}.{AuthService._reset_serializer(user).dumps(user.id)}"

    @staticmethod
    def request_password_reset(login_id):
        """Email a reset link to an account that can sign in. Callers reply the same either way."""
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        if not user or not user.is_active_account or user.is_pending_admin:
            return
        link = f"{current_app.config.get('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={AuthService.password_reset_token(user)}"
        EmailService.send_password_reset_email(user.email, user.username, link)

    @staticmethod
    def reset_password(token, password):
        """Returns (user, None) after changing the password, or (None, reason)."""
        invalid = "This reset link is invalid or has expired. Request a new one."
        user_id, separator, signed = token.partition('.') if isinstance(token, str) else ('', '', '')
        user = db.session.get(User, int(user_id)) if separator and user_id.isdigit() else None
        if not user or not user.is_active_account or user.is_pending_admin: return None, invalid
        try:
            token_user_id = AuthService._reset_serializer(user).loads(signed, max_age=RESET_TOKEN_MAX_AGE_SECONDS)
        except BadSignature:
            return None, invalid
        if token_user_id != user.id: return None, invalid
        password_problem = AuthService.password_error(password)
        if password_problem: return None, password_problem
        user.password_hash = PasswordService.hash_password(password)
        db.session.commit()
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
        access = {'assistant': 'lab assistant', 'faculty': 'faculty'}.get(user.role, 'admin')
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
