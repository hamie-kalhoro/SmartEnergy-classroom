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
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="color-scheme" content="light dark"/>
            <meta name="supported-color-schemes" content="light dark"/>
            <style>
                /* ── Light mode defaults ── */
                body, .email-wrapper  {{ background-color: #ffffff !important; }}
                .email-body           {{ color: #1a1a1a !important; }}
                .email-muted          {{ color: #6b7280 !important; }}
                .email-link           {{ color: #1a1a1a !important; }}
                .email-divider        {{ border-top-color: #e5e7eb !important; }}
                .email-footer-divider {{ border-top-color: #e5e7eb !important; }}
                .email-footer-text    {{ color: #9ca3af !important; }}
                .bullet-text          {{ color: #6b7280 !important; }}
                .bullet-link          {{ color: #1a1a1a !important; }}

                /* ── Dark mode overrides ── */
                @media (prefers-color-scheme: dark) {{
                    body, .email-wrapper  {{ background-color: #1c1c1c !important; }}
                    .email-body           {{ color: #ededef !important; }}
                    .email-muted          {{ color: #717179 !important; }}
                    .email-link           {{ color: #ededef !important; }}
                    .email-divider        {{ border-top-color: #2e2e2e !important; }}
                    .email-footer-divider {{ border-top-color: #2e2e2e !important; }}
                    .email-footer-text    {{ color: #717179 !important; }}
                    .bullet-text          {{ color: #a0a0ab !important; }}
                    .bullet-link          {{ color: #ededef !important; }}
                }}
            </style>
        </head>
        <body class="email-wrapper" style="font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0;">
            <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

                            <!-- Logo / Brand mark -->
                            <tr>
                                <td style="padding: 0 0 32px 0;">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13 2L4.09 12.11a1 1 0 0 0-.09 1.07A1 1 0 0 0 5 14h7l-1 8 8.91-10.11a1 1 0 0 0 .09-1.07A1 1 0 0 0 19 10h-7l1-8z" fill="#3ecf8e"/>
                                    </svg>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td class="email-body" style="color: #1a1a1a; font-size: 15px; line-height: 1.75;">
                                    <p style="margin: 0 0 16px 0;">Hey {username},</p>
                                    <p style="margin: 0 0 16px 0;">Welcome to <strong>SmartEnergy</strong>, the Smart Classroom Energy Optimization Platform.</p>
                                    <p style="margin: 0 0 32px 0;">Your account has been created and is ready to activate. Click the button below to confirm your email address and get started.</p>

                                    <!-- CTA Button -->
                                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                                        <tr>
                                            <td style="background-color: #3ecf8e; border-radius: 6px;">
                                                <a href="{activation_link}"
                                                   style="display: inline-block; padding: 12px 28px; color: #1a1a1a; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.01em; border-radius: 6px;">
                                                    Activate Your Account
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Tips section -->
                                    <p class="email-body" style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 14px;">
                                        &#x1F512; Once activated, you can:
                                    </p>
                                    <ul class="bullet-text" style="margin: 0 0 32px 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                                        <li><a class="bullet-link" href="#" style="color: #1a1a1a; text-decoration: underline;">View live classroom energy data</a> &mdash; monitor occupancy and device states in real time.</li>
                                        <li><a class="bullet-link" href="#" style="color: #1a1a1a; text-decoration: underline;">Review AI-driven decisions</a> &mdash; see how the ML engine optimises energy usage.</li>
                                        <li><a class="bullet-link" href="#" style="color: #1a1a1a; text-decoration: underline;">Access weekly efficiency reports</a> &mdash; track kWh savings delivered to your inbox every weekend.</li>
                                    </ul>

                                    <!-- Divider -->
                                    <table class="email-divider" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                                        <tr>
                                            <td style="border-top: 1px solid #e5e7eb; font-size: 0; line-height: 0;">&nbsp;</td>
                                        </tr>
                                    </table>

                                    <!-- Footer note -->
                                    <p class="email-muted" style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                        If you didn't create a SmartEnergy account, you can safely ignore this email.
                                    </p>
                                    <p class="email-muted" style="margin: 16px 0 40px 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                        If the button above does not work, paste this link into your browser:<br/>
                                        <a href="{activation_link}" style="color: #3ecf8e; text-decoration: none; word-break: break-all;">{activation_link}</a>
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer brand line -->
                            <tr>
                                <td class="email-footer-divider" style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                                    <p class="email-footer-text" style="margin: 0; color: #9ca3af; font-size: 12px;">
                                        SmartEnergy &mdash; Intelligent Classroom Energy Platform &copy; 2026
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
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
    def send_weekend_report(to_email, stats):
        """Send a weekly briefing to admins summarizing energy savings and efficiency."""
        server = os.getenv('MAIL_SERVER')
        port = int(os.getenv('MAIL_PORT', 587))
        username_smtp = os.getenv('MAIL_USERNAME')
        password = os.getenv('MAIL_PASSWORD')
        sender = os.getenv('MAIL_DEFAULT_SENDER')
        
        html_body = f"""
        <html>
            <body style="font-family: 'Inter', sans-serif; background-color: #050505; color: #ffffff; padding: 30px;">
                <div style="max-width: 600px; margin: auto; background-color: #0f172a; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #00d26a 0%, #06b6d4 100%); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900;">Weekly Efficiency Briefing</h1>
                        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">System Performance Report</p>
                    </div>
                    <div style="padding: 40px; line-height: 1.6;">
                        <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                            <div style="flex: 1; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 700;">TOTAL SAVED</p>
                                <h2 style="margin: 5px 0 0 0; color: #00d26a; font-size: 28px;">{stats['total_savings']} kWh</h2>
                            </div>
                            <div style="flex: 1; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 700;">DECISIONS</p>
                                <h2 style="margin: 5px 0 0 0; color: #06b6d4; font-size: 28px;">{stats['total_decisions']}</h2>
                            </div>
                        </div>
                        
                        <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 15px;">Historical Comparison</h3>
                        <p style="color: #94a3b8; font-size: 14px;">This week's optimization performance is <strong style="color: #10b981;">{stats['growth']}%</strong> {stats['growth_label']} than the previous period.</p>
                        
                        <div style="margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                            <p style="font-size: 12px; color: #475569; text-align: center;">Artificial Intelligence Engine Integration &bull; 2026</p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        try:
            msg = MIMEMultipart()
            msg['From'] = f"SmartEnergy Analytics <{sender}>"
            msg['To'] = to_email
            msg['Subject'] = f"📊 Weekend Report: {stats['total_savings']} kWh Saved This Week"
            msg.attach(MIMEText(html_body, 'html'))

            with smtplib.SMTP(server, port) as smtp:
                smtp.starttls()
                smtp.login(username_smtp, password)
                smtp.send_message(msg)
            return True
        except Exception as e:
            print(f"❌ Failed to send weekend report: {e}")
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

class ReportingService:
    @staticmethod
    def get_today_savings():
        from sqlalchemy import func
        from datetime import datetime
        today = datetime.utcnow().date()
        savings = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(func.date(EnergyDecision.timestamp) == today).scalar() or 0
        return round(float(savings), 2)

    @staticmethod
    def generate_weekly_stats():
        from sqlalchemy import func
        from datetime import datetime, timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        prev_seven_days = datetime.utcnow() - timedelta(days=14)
        
        current_week_savings = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= seven_days_ago).scalar() or 0
        current_week_decisions = EnergyDecision.query.filter(EnergyDecision.timestamp >= seven_days_ago).count()
        
        prev_week_savings = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= prev_seven_days, EnergyDecision.timestamp < seven_days_ago).scalar() or 0
        
        growth = 0
        if prev_week_savings > 0:
            growth = round(((current_week_savings - prev_week_savings) / prev_week_savings) * 100, 1)
        
        return {
            'total_savings': round(float(current_week_savings), 2),
            'total_decisions': current_week_decisions,
            'growth': growth,
            'growth_label': 'higher' if growth >= 0 else 'lower'
        }

    @staticmethod
    def trigger_weekend_briefing():
        """Logic to send reports to all admins."""
        admins = User.query.filter_by(role='admin', is_active_account=True).all()
        stats = ReportingService.generate_weekly_stats()
        
        success_count = 0
        for admin in admins:
            # Send Email
            if EmailService.send_weekend_report(admin.email, stats):
                success_count += 1
            
            # Send In-App Notification
            notif = Notification(
                type='energy_report',
                message=f"Weekly report ready: {stats['total_savings']} kWh saved. Efficiency is {stats['growth']}% {stats['growth_label']}.",
                target_role='admin'
            )
            db.session.add(notif)
        
        db.session.commit()
        return success_count
