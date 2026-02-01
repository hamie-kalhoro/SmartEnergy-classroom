import os
import uuid
import smtplib
import bcrypt
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from models import db, User, EnergyDecision, DailyEnergyLog

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
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px;">
                <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔋 SmartEnergy Portal</h1>
                    </div>
                    <div style="padding: 40px; color: #333333; line-height: 1.6;">
                        <h2 style="color: #4f46e5; margin-top: 0;">Welcome, {username}!</h2>
                        <p>You've been granted access to the Smart Classroom Energy Optimization System. Activate your account to start contributing to sustainable energy management.</p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="{activation_link}" style="background: #4f46e5; color: #ffffff; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Activate Your Account</a>
                        </div>
                        <p style="font-size: 14px; color: #64748b;">If button doesn't work: <a href="{activation_link}" style="color: #4f46e5;">{activation_link}</a></p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                        &copy; 2026 FYP SmartEnergy Project. Powered by AI.
                    </div>
                </div>
            </body>
        </html>
        """

        try:
            msg = MIMEMultipart()
            msg['From'] = f"SmartEnergy <{sender}>"
            msg['To'] = to_email
            msg['Subject'] = "🔑 Activate Your SmartEnergy Portal Access"
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(server, port) as smtp:
                smtp.starttls()
                smtp.login(username_smtp, password)
                smtp.send_message(msg)
            print(f"✅ EMAIL SUCCESS: Sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ EMAIL ERROR: {e}")
            return False

class PasswordService:
    @staticmethod
    def hash_password(plain_password):
        return bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password, hashed_password):
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

class AuthService:
    @staticmethod
    def register_user(username, email, password, role):
        if User.query.filter_by(email=email).first():
            return None, "Email already exists"
        if User.query.filter_by(username=username).first():
            return None, "Username already taken"
        
        token = str(uuid.uuid4())
        hashed_pw = PasswordService.hash_password(password)
        
        new_user = User(
            username=username, 
            email=email, 
            password_hash=hashed_pw, 
            role=role, 
            activation_token=token, 
            is_active_account=False
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        EmailService.send_activation_email(email, username, token)
        return new_user, None

    @staticmethod
    def login_user(login_id, password):
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        
        if not user:
            return None, "Account not found. Please sign up."
        
        if not PasswordService.verify_password(password, user.password_hash):
            return None, "Incorrect password. Please try again."
        
        if not user.is_active_account:
            return None, "Account not activated. Please check your email."
            
        return user, None

    @staticmethod
    def activate_user(token):
        user = User.query.filter_by(activation_token=token).first()
        if user:
            user.is_active_account = True
            user.activation_token = None
            db.session.commit()
            return True
        return False

class EnergyService:
    @staticmethod
    def log_decision(classroom_id, predicted_occupancy, lights_action, ac_action, energy_saved):
        decision = EnergyDecision(
            classroom_id=classroom_id,
            predicted_occupancy=predicted_occupancy,
            lights_action=lights_action,
            ac_action=ac_action,
            energy_saved_kwh=energy_saved
        )
        db.session.add(decision)
        db.session.commit()
        return decision

    @staticmethod
    def get_daily_summary():
        today = datetime.utcnow().date()
        log = DailyEnergyLog.query.filter_by(date=today).first()
        if not log:
            return {'savings': 0, 'decisions': 0, 'avg_occupancy': 0}
        return {
            'savings': log.total_savings_kwh,
            'decisions': log.total_decisions,
            'avg_occupancy': log.avg_occupancy_percent
        }
    
    @staticmethod
    def get_recent_decisions(limit=10):
        decisions = EnergyDecision.query.order_by(EnergyDecision.timestamp.desc()).limit(limit).all()
        return [{
            'id': d.id,
            'classroom': d.classroom.name,
            'occupancy': d.predicted_occupancy,
            'lights': d.lights_action,
            'ac': d.ac_action,
            'saved': d.energy_saved_kwh,
            'time': d.timestamp.strftime('%H:%M')
        } for d in decisions]
