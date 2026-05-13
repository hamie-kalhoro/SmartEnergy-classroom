import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Path Guard: Ensure the backend directory is in the system path for sub-modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from flask_talisman import Talisman
from flask_jwt_extended import JWTManager

from config import config_by_name
from models import db, User, Classroom, Timetable
from services import PasswordService

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
        
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # Initialize Extensions
    db.init_app(app)
    jwt = JWTManager(app)
    
    # CORS Configuration
    frontend_url = app.config.get('FRONTEND_URL', 'http://localhost:5173')
    CORS(app, resources={r"/api/*": {"origins": [frontend_url, "http://localhost:5173"]}})
    
    # Security Headers
    is_dev = app.config.get('DEBUG', True)
    Talisman(app, content_security_policy=None, force_https=not is_dev)
    
    # Logging
    configure_logging(app)
    
    # Register Blueprints
    from routes.auth import auth_bp
    from routes.classroom import classroom_bp
    from routes.timetable import timetable_bp
    from routes.ml import ml_bp
    from routes.analytics import analytics_bp
    from routes.system import system_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(classroom_bp)
    app.register_blueprint(timetable_bp)
    app.register_blueprint(ml_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(system_bp)

    # Initialize Automation (Admin Reporting)
    setup_automation(app)
    
    # Global Error Handler
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Unhandled Exception: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": "An internal server error occurred.",
            "error": str(e) if app.config['DEBUG'] else None
        }), 500
        
    return app

def setup_automation(app):
    """Background tasks for scheduled events."""
    import threading
    import time
    from datetime import datetime
    from services import ReportingService

    def run_scheduler():
        while True:
            try:
                # Check every hour
                now = datetime.now()
                # If Sunday at 9 AM, trigger the briefing
                if now.weekday() == 6 and now.hour == 9:
                    with app.app_context():
                         ReportingService.trigger_weekend_briefing()
                         app.logger.info(">>> AUTOMATION: Weekend briefing dispatched.")
                         # Sleep for a bit to avoid double-triggering in the same hour
                         time.sleep(3600) 
            except Exception as e:
                print(f">>> AUTOMATION ERROR: {e}")
            time.sleep(3600) # Re-check every hour

    thread = threading.Thread(target=run_scheduler, daemon=True)
    thread.start()

def configure_logging(app):
    if not app.debug:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/smart_energy.log', maxBytes=10240, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('SmartEnergy Backend Startup')

def seed_database(app):
    """Initialize database and seed initial data."""
    with app.app_context():
        try:
            db.create_all()
            app.logger.info(f"Database connected: {app.config['SQLALCHEMY_DATABASE_URI']}")
            
            # Seed Superior Admin (admin@smart.com - Permanent & Highest Authority)
            superior_admin = User.query.filter_by(email='admin@smart.com').first()
            if not superior_admin:
                hashed = PasswordService.hash_password('admin123')
                db.session.add(User(
                    username='superadmin', email='admin@smart.com', 
                    password_hash=hashed, role='admin', is_active_account=True,
                    is_permanent=True
                ))
                db.session.commit()
            
            # Seed classrooms
            if Classroom.query.count() == 0:
                c1 = Classroom(name='Room 101', building='A', capacity=50, num_lights=8, num_acs=2, num_fans=4)
                c2 = Classroom(name='Lab 202', building='B', capacity=30, num_lights=12, num_acs=3, num_fans=6)
                c3 = Classroom(name='Room 102', building='A', capacity=50, num_lights=8, num_acs=2, num_fans=4)
                c4 = Classroom(name='Lab 301 (AI Lab)', building='C', capacity=40, num_lights=15, num_acs=4, num_fans=8)
                c5 = Classroom(name='Seminar Hall', building='D', capacity=150, num_lights=30, num_acs=8, num_fans=12)
                
                db.session.add_all([c1, c2, c3, c4, c5])
                db.session.commit()
                
                # Monday
                db.session.add(Timetable(
                    classroom_id=c1.id, day_of_week='Monday', time_slot='09:00', 
                    subject='Advanced Databases', subject_type='theory', 
                    teacher_name='Dr. Hamid Raza', teacher_email='hamid.raza@university.edu', 
                    expected_attendance=45
                ))
                db.session.add(Timetable(
                    classroom_id=c4.id, day_of_week='Monday', time_slot='11:00', 
                    subject='Machine Learning Lab', subject_type='lab', 
                    teacher_name='Engr. Aisha Khan', teacher_email='aisha.k@university.edu', 
                    expected_attendance=35
                ))
                
                # Tuesday
                db.session.add(Timetable(
                    classroom_id=c2.id, day_of_week='Tuesday', time_slot='08:30', 
                    subject='Microcontroller Systems', subject_type='lab', 
                    teacher_name='Dr. Yasir Shah', teacher_email='yasir.s@university.edu', 
                    expected_attendance=28
                ))
                db.session.add(Timetable(
                    classroom_id=c5.id, day_of_week='Tuesday', time_slot='14:00', 
                    subject='Orientation Seminar', subject_type='theory', 
                    teacher_name='Dean Faculty', teacher_email='dean@university.edu', 
                    expected_attendance=120
                ))
                
                # Wednesday
                db.session.add(Timetable(
                    classroom_id=c3.id, day_of_week='Wednesday', time_slot='10:00', 
                    subject='Software Engineering', subject_type='theory', 
                    teacher_name='Prof. Zahid Ali', teacher_email='zahid.a@university.edu', 
                    expected_attendance=48
                ))
                
                # Thursday
                db.session.add(Timetable(
                    classroom_id=c4.id, day_of_week='Thursday', time_slot='08:00', 
                    subject='Computer Vision Lab', subject_type='lab', 
                    teacher_name='Dr. Saira Ahmed', teacher_email='saira.a@university.edu', 
                    expected_attendance=38
                ))
                
                db.session.commit()
        except Exception as e:
            app.logger.error(f"Seeding error: {str(e)}")
            app.logger.info("Tip: If you recently added columns, you might need to delete instance/smart_classroom.db to let it recreate.")
            db.session.rollback()

app = create_app()

if __name__ == '__main__':
    seed_database(app)
    port = int(os.getenv('PORT', 5000))
    if app.config['DEBUG']:
        app.run(debug=True, host='0.0.0.0', port=port, use_reloader=False)
    else:
        try:
            from waitress import serve
            serve(app, host='0.0.0.0', port=port)
        except ImportError:
            app.run(host='0.0.0.0', port=port)
