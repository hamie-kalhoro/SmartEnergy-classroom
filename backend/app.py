import os
import logging
from logging.handlers import RotatingFileHandler
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
                c1 = Classroom(name='Room 101', building='A', capacity=50)
                c2 = Classroom(name='Lab 202', building='B', capacity=30)
                db.session.add_all([c1, c2])
                db.session.commit()
                
                db.session.add(Timetable(
                    classroom_id=c1.id, day_of_week='Monday', time_slot='08:00', 
                    subject='Advanced Databases', subject_type='theory', 
                    teacher_name='Dr. Hamid Raza', teacher_email='hamid.raza@university.edu', 
                    expected_attendance=85
                ))
                db.session.add(Timetable(
                    classroom_id=c2.id, day_of_week='Tuesday', time_slot='10:30', 
                    subject='AI & Robotics Lab', subject_type='lab', 
                    teacher_name='Engr. Aisha Khan', teacher_email='aisha.k@university.edu', 
                    expected_attendance=40
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
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        try:
            from waitress import serve
            serve(app, host='0.0.0.0', port=port)
        except ImportError:
            app.run(host='0.0.0.0', port=port)
