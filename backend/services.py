from datetime import timezone
import os
import uuid
import smtplib
import bcrypt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from models import db, User, EnergyDecision, DailyEnergyLog, Notification

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

        html_body = f"""
        <html>
            <body style="background-color: #0f172a; color: #ffffff; padding: 40px; font-family: sans-serif;">
                <div style="background: #020617; border-radius: 20px; padding: 40px; border: 1px solid #1e293b;">
                    <h2 style="color: #3ecf8e;">Welcome to SmartEnergy, {username}!</h2>
                    <p style="color: #94a3b8;">Click below to activate your administrative identity:</p>
                    <a href="{activation_link}" style="background: #3ecf8e; color: #020617; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Activate Account</a>
                </div>
            </body>
        </html>
        """
        try:
            msg = MIMEMultipart(); msg['From'] = f"SmartEnergy <{sender}>"; msg['To'] = to_email; msg['Subject'] = "Activate Your Account"; msg.attach(MIMEText(html_body, 'html'))
            with smtplib.SMTP(server, port, timeout=10) as smtp:
                smtp.starttls(); smtp.login(username_smtp, password); smtp.send_message(msg)
            return True
        except Exception as e: print(f"[ERROR] EMAIL: {e}"); return False

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
        EmailService.send_activation_email(email, username, token); return new_user, None

    @staticmethod
    def admin_create_user(username, email, password, role, auto_activate=False):
        if User.query.filter_by(email=email).first(): return None, "Email exists"
        token = str(uuid.uuid4()) if not auto_activate else None
        new_user = User(username=username, email=email, password_hash=PasswordService.hash_password(password), role=role, is_active_account=auto_activate, activation_token=token)
        db.session.add(new_user); db.session.commit()
        if not auto_activate: EmailService.send_activation_email(email, username, token)
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
        db.session.add(Notification(type='admin_approved', message=f'Your admin access was approved by {approved_by}', target_role='faculty', related_user_id=user.id))
        db.session.commit(); return True, None

class EnergyService:
    @staticmethod
    def log_decision(room_id, occupancy, lights, ac, saved):
        db.session.add(EnergyDecision(classroom_id=room_id, predicted_occupancy=occupancy, lights_action=lights, ac_action=ac, energy_saved_kwh=saved))
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
        from ml_engine import MLEngine
        from sqlalchemy import func
        from models import Timetable
        now = datetime.now(timezone.utc) # Needs UTC+5 logic in production
        actual = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(func.date(EnergyDecision.timestamp) == now.date()).scalar() or 0
        ml = MLEngine(); future_slots = Timetable.query.all(); projected = 0
        for slot in future_slots:
            try:
                if int(slot.time_slot.split(':')[0]) > now.hour:
                    _, idx, _, _ = ml.predict(slot.day_of_week, slot.time_slot, slot.subject_type, slot.expected_attendance)
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
