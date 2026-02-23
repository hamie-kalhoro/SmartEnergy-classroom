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
            <body style="font-family: 'Inter', -apple-system, sans-serif; background-color: #050505; padding: 40px; color: #ffffff;">
                <div style="max-width: 600px; margin: auto; background-color: #0f172a; border-radius: 24px; overflow: hidden; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05);">
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #10b981 100%); padding: 40px; text-align: center; border-bottom: 4px solid #10b981;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em;">SmartEnergy</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 700;">Intelligent Control Hub</p>
                    </div>
                    <div style="padding: 50px; color: #e2e8f0; line-height: 1.8;">
                        <h2 style="color: #ffffff; margin-top: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">Welcome to the Platform, {username}</h2>
                        <p style="font-size: 16px;">You have been granted access to the next generation of energy management. Your account is ready for activation.</p>
                        
                        <div style="text-align: center; margin: 45px 0;">
                            <a href="{activation_link}" style="background: #10b981; color: #ffffff; padding: 18px 35px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 16px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);">Activate My Access</a>
                        </div>
                        
                        <p style="font-size: 13px; color: #64748b; text-align: center;">By clicking above, you'll be redirected to the secure portal for final verification.</p>
                    </div>
                    <div style="background-color: rgba(0,0,0,0.2); padding: 25px; text-align: center; font-size: 11px; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">
                        Identity Verified &bull; SmartEnergy System &bull; 2026
                    </div>
                </div>
            </body>
        </html>
        """

        try:
            msg = MIMEMultipart()
            # Professional sender name with brand
            msg['From'] = f"SmartEnergy Identity <{sender}>"
            msg['To'] = to_email
            msg['Subject'] = "🔑 Finalize Your SmartEnergy Identity Activation"
            msg.attach(MIMEText(html_body, 'html'))

            if port == 465:
                smtp = smtplib.SMTP_SSL(server, port, timeout=10)
            else:
                smtp = smtplib.SMTP(server, port, timeout=10)
                smtp.starttls()

            smtp.login(username_smtp, password)
            smtp.send_message(msg)
            smtp.quit()
            print(f"✅ EMAIL SUCCESS: Sent to {to_email}")
            return True
        except Exception as e:
            print(f"❌ EMAIL ERROR: {e}")
            return False

    @staticmethod
    def notify_admins_of_pending_registration(new_admin_username, new_admin_email):
        """Notify existing admins about a new admin registration attempt."""
        admins = User.query.filter_by(role='admin', is_pending_admin=False, is_active_account=True).all()
        if not admins:
            return
            
        server = os.getenv('MAIL_SERVER')
        port = int(os.getenv('MAIL_PORT', 587))
        username_smtp = os.getenv('MAIL_USERNAME')
        password = os.getenv('MAIL_PASSWORD')
        sender = os.getenv('MAIL_DEFAULT_SENDER')

        admin_emails = [a.email for a in admins]
        
        html_body = f"""
        <html>
            <body style="font-family: 'Inter', sans-serif; padding: 40px; background-color: #0f172a; color: #ffffff;">
                <div style="max-width: 550px; margin: auto; border: 1px solid #334155; border-radius: 20px; padding: 40px; background: #020617;">
                    <h2 style="color: #f59e0b; margin-top: 0; font-size: 20px; font-weight: 800;">⚠️ Admin Privilege Request</h2>
                    <p style="color: #94a3b8;">A new user is requesting <strong style="color: #ffffff;">Elevated Administrative Access</strong>.</p>
                    
                    <div style="background: rgba(245, 158, 11, 0.05); padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid rgba(245, 158, 11, 0.1);">
                        <p style="margin: 0; color: #f59e0b; font-size: 14px; font-weight: 700;">USER IDENTITY:</p>
                        <p style="margin: 5px 0 0 0; color: #ffffff; font-size: 18px;">{new_admin_username}</p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">{new_admin_email}</p>
                    </div>
                    
                    <p style="font-size: 14px; color: #475569;">Security Protocol: The account remains locked until manual verification via the Dashboard.</p>
                </div>
            </body>
        </html>
        """

        try:
            msg = MIMEMultipart()
            msg['From'] = f"SmartEnergy Security <{sender}>"
            msg['To'] = ", ".join(admin_emails)
            msg['Subject'] = "⚠️ ACTION REQUIRED: New Elevated Access Request"
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(server, port) as smtp:
                smtp.starttls()
                smtp.login(username_smtp, password)
                smtp.send_message(msg)
            print(f"🔒 Security Alert: Admins notified of {new_admin_username} request")
        except Exception as e:
            print(f"❌ Failed to notify admins: {e}")

    @staticmethod
    def notify_superior_of_deletion(superior_email, admin_name, target_user_name, target_role):
        """Send a specialized alert to the Superior Admin about user deletions."""
        server = os.getenv('MAIL_SERVER')
        port = int(os.getenv('MAIL_PORT', 587))
        username_smtp = os.getenv('MAIL_USERNAME')
        password = os.getenv('MAIL_PASSWORD')
        sender = os.getenv('MAIL_DEFAULT_SENDER')

        html_body = f"""
        <html>
            <body style="font-family: 'Inter', sans-serif; padding: 40px; background-color: #000000; color: #ffffff;">
                <div style="max-width: 550px; margin: auto; border: 1px solid #ef4444; border-radius: 20px; padding: 40px; background: #0a0a0a;">
                    <h2 style="color: #ef4444; margin-top: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em;">🚨 SECURITY LOG: User Deletion</h2>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 25px; border-radius: 12px; border-left: 5px solid #ef4444; margin: 30px 0;">
                        <p style="margin: 0; font-size: 14px; color: #ef4444; font-weight: 700;">ACTION PERFORMED BY:</p>
                        <p style="margin: 5px 0 15px 0; font-size: 18px;">Admin {admin_name}</p>
                        
                        <p style="margin: 0; font-size: 14px; color: #ef4444; font-weight: 700;">TARGET USER:</p>
                        <p style="margin: 5px 0 0 0; font-size: 18px;">{target_user_name} ({target_role})</p>
                    </div>
                    
                    <p style="font-size: 12px; color: #475569; text-transform: uppercase;">Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
            </body>
        </html>
        """

        try:
            msg = MIMEMultipart()
            msg['From'] = f"SmartEnergy Identity <{sender}>"
            msg['To'] = superior_email
            msg['Subject'] = f"⚠️ SECURE LOG: Faculty User Removed by {admin_name}"
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(server, port) as smtp:
                smtp.starttls()
                smtp.login(username_smtp, password)
                smtp.send_message(msg)
            print(f"🚨 Superior Admin Alert: Sent to {superior_email}")
        except Exception as e:
            print(f"❌ Failed to notify superior admin: {e}")

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
        
        # Security Policy: Admins must be approved
        is_pending = (role == 'admin')
        
        new_user = User(
            username=username, 
            email=email, 
            password_hash=hashed_pw, 
            role=role, 
            activation_token=token, 
            is_active_account=False,
            is_pending_admin=is_pending
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        if is_pending:
            # Create notification for admins
            notif = Notification(
                type='admin_request',
                message=f'{username} has requested admin access',
                target_role='admin',
                related_user_id=new_user.id
            )
            db.session.add(notif)
            db.session.commit()
            EmailService.notify_admins_of_pending_registration(username, email)
            return new_user, "Admin registration submitted. Access is pending approval from an existing administrator."
        else:
            email_sent = EmailService.send_activation_email(email, username, token)
            if not email_sent:
                return new_user, "Registration successful, but the activation email could not be sent. Please contact an administrator to activate your account manually."
            return new_user, None

    @staticmethod
    def admin_create_user(username, email, password, role, auto_activate=False):
        """Allow an admin to create a user directly."""
        if User.query.filter_by(email=email).first():
            return None, "Email already exists"
            
        hashed_pw = PasswordService.hash_password(password)
        token = str(uuid.uuid4()) if not auto_activate else None
        
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_pw,
            role=role,
            is_active_account=auto_activate,
            activation_token=token
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        if not auto_activate:
            EmailService.send_activation_email(email, username, token)
            
        return new_user, None

    @staticmethod
    def login_user(login_id, password):
        user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
        
        if not user:
            return None, "Account not found. Please sign up."
        
        if not PasswordService.verify_password(password, user.password_hash):
            return None, "Incorrect password. Please try again."
        
        if user.is_pending_admin:
            return None, "Your administrative access is still pending approval. You will receive an email once an administrator verifies your account."

        if not user.is_active_account:
            return None, "Account not activated. Please check your email."
            
        return user, None

    @staticmethod
    def approve_admin(user_id, approved_by=None):
        """Approve a pending admin then send activation email."""
        user = User.query.get(user_id)
        if user and user.is_pending_admin:
            user.is_pending_admin = False
            # Generate new token just in case
            token = str(uuid.uuid4())
            user.activation_token = token
            db.session.commit()
            
            # Create notification for faculty (and admins) about the approval
            notif = Notification(
                type='admin_approved',
                message=f'Admin request from {user.username} was approved by {approved_by or "an administrator"}',
                target_role='faculty',
                related_user_id=user.id,
                created_by=approved_by
            )
            db.session.add(notif)
            db.session.commit()
            
            # Now they get the email
            EmailService.send_activation_email(user.email, user.username, token)
            return True, None
        return False, "User not found or not a pending admin."

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
