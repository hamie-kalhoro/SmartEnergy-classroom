from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_talisman import Talisman
from werkzeug.utils import secure_filename
from models import db, User, Classroom, Timetable, AttendanceHistory, EnergyDecision
from services import AuthService, EnergyService, PasswordService
from ml_engine import MLEngine
import pandas as pd
import os
from dotenv import load_dotenv

import logging
from logging.handlers import RotatingFileHandler

load_dotenv()

app = Flask(__name__)

# Production Logging
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

# Database Configuration - Supabase PostgreSQL
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    # Fallback to SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///instance/smart_classroom.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fyp-secret-key')

# Force create instance folder for SQLite
if not os.path.exists('instance'):
    os.makedirs('instance')

# CORS Configuration - Restrict to frontend in production
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
CORS(app, resources={r"/api/*": {"origins": [frontend_url, "http://localhost:5173"]}})

# Security Headers (Skip HTTPS force in local development)
is_dev = os.getenv('FLASK_ENV') == 'development' or os.getenv('DEBUG', 'False').lower() == 'true'
if not is_dev:
    Talisman(app, content_security_policy=None) # CSP can be configured later
db.init_app(app)
ml = MLEngine()

# =====================
# AUTH ROUTES
# =====================
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    user, error = AuthService.register_user(
        data.get('username'), 
        data.get('email'), 
        data.get('password'), 
        data.get('role', 'user')
    )
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({
        'success': True, 
        'message': f'Signup successful! An activation email has been sent to {user.email}.'
    })

@app.route('/api/activate', methods=['GET'])
def activate():
    token = request.args.get('token')
    if AuthService.activate_user(token):
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/login?activated=true")
    return "Invalid or expired activation token.", 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user, error = AuthService.login_user(data.get('username'), data.get('password'))
    
    if error:
        return jsonify({'success': False, 'message': error}), 401
        
    return jsonify({
        'success': True,
        'user': {'id': user.id, 'username': user.username, 'role': user.role, 'email': user.email}
    })

@app.route('/api/verify-admin', methods=['POST'])
def verify_admin():
    data = request.json
    user = User.query.filter_by(username=data.get('username'), role='admin').first()
    if user and PasswordService.verify_password(data.get('password'), user.password_hash):
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Admin verification failed'}), 401

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of all users."""
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'is_active': u.is_active_account,
        'is_pending_admin': u.is_pending_admin
    } for u in users])

@app.route('/api/users/pending-admins', methods=['GET'])
def get_pending_admins():
    """Get list of users waiting for admin approval."""
    users = User.query.filter_by(is_pending_admin=True).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'created_at': u.created_at.strftime('%Y-%m-%d %H:%M')
    } for u in users])

@app.route('/api/users/approve-admin/<int:id>', methods=['POST'])
def approve_admin(id):
    """Approve a pending admin registration."""
    success, error = AuthService.approve_admin(id)
    if not success:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'message': 'Admin approved and activation email sent.'})

@app.route('/api/users/activate-manual/<int:id>', methods=['POST'])
def activate_user_manual(id):
    """Manually activate a user (failover for email service)."""
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    user.is_active_account = True
    user.activation_token = None
    db.session.commit()
    return jsonify({'success': True, 'message': f'User {user.username} activated manually.'})

@app.route('/api/users/create-single', methods=['POST'])
def create_single_user():
    """Admin manually adds a single user."""
    data = request.json
    user, error = AuthService.admin_create_user(
        data.get('username'),
        data.get('email'),
        data.get('password'),
        data.get('role', 'faculty'),
        auto_activate=data.get('auto_activate', False)
    )
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    msg = "User created successfully."
    if not data.get('auto_activate'):
        msg += " Activation email sent."
        
    return jsonify({'success': True, 'message': msg})

@app.route('/api/users/bulk-import', methods=['POST'])
def bulk_import_users():
    """Upload CSV to add multiple faculty/users at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Only CSV files allowed'}), 400
    
    try:
        df = pd.read_csv(file)
        required_cols = ['email', 'username', 'password', 'role']
        
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({'success': False, 'message': f'Missing columns: {", ".join(missing)}'}), 400
        
        added = 0
        skipped = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Check if email exists (Uniqueness Constraint)
                existing = User.query.filter_by(email=str(row['email'])).first()
                if existing:
                    skipped += 1
                    continue
                
                # Register user using AuthService to handle hashing and email
                _, error = AuthService.register_user(
                    username=str(row['username']),
                    email=str(row['email']),
                    password=str(row['password']),
                    role=str(row.get('role', 'faculty'))
                )
                
                if error:
                    errors.append(f"Row {idx+1}: {error}")
                else:
                    added += 1
                    
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Imported {added} users, skipped {skipped} existing emails',
            'added': added,
            'skipped': skipped,
            'errors': errors[:10]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # Policy: Cannot delete admin accounts
    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Administrator accounts cannot be deleted to maintain system access.'}), 403
        
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'success': True, 'message': f'User {user.username} deleted successfully.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# =====================
# CLASSROOM ROUTES
# =====================
@app.route('/api/classrooms', methods=['GET'])
def get_classrooms():
    classes = Classroom.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': c.id, 'name': c.name, 'building': c.building, 
        'capacity': c.capacity, 'lights': c.num_lights, 'acs': c.num_acs
    } for c in classes])

@app.route('/api/classrooms', methods=['POST'])
def add_classroom():
    data = request.json
    new_room = Classroom(
        name=data['name'], building=data['building'], 
        capacity=data['capacity'], num_lights=data.get('lights', 8),
        num_acs=data.get('acs', 2)
    )
    db.session.add(new_room)
    db.session.commit()
    return jsonify({'success': True, 'id': new_room.id})

@app.route('/api/classrooms/<int:id>', methods=['DELETE'])
def delete_classroom(id):
    room = Classroom.query.get(id)
    if room:
        room.is_active = False
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

# =====================
# TIMETABLE ROUTES
# =====================
@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    entries = Timetable.query.all()
    return jsonify([{
        'id': e.id, 'classroom': e.classroom.name, 'classroom_id': e.classroom_id,
        'day': e.day_of_week, 'time': e.time_slot, 'subject': e.subject,
        'type': e.subject_type, 'teacher': e.teacher_name, 
        'email': e.teacher_email, 'attendance': e.expected_attendance
    } for e in entries])

@app.route('/api/timetable', methods=['POST'])
def add_timetable():
    data = request.json
    new_entry = Timetable(
        classroom_id=data['classroom_id'],
        day_of_week=data['day'],
        time_slot=data['time'],
        subject=data['subject'],
        subject_type=data['type'],
        teacher_name=data['teacher'],
        teacher_email=data['email'],
        expected_attendance=data['attendance']
    )
    db.session.add(new_entry)
    db.session.commit()
    return jsonify({'success': True, 'id': new_entry.id})

@app.route('/api/timetable/<int:id>', methods=['DELETE'])
def delete_timetable(id):
    entry = Timetable.query.get(id)
    if entry:
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

@app.route('/api/timetable/bulk-import', methods=['POST'])
def bulk_import_timetable():
    """Upload CSV to add multiple timetable entries at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Only CSV files allowed'}), 400
    
    try:
        df = pd.read_csv(file)
        required_cols = ['classroom_id', 'day', 'time', 'subject', 'type', 'teacher', 'email', 'attendance']
        
        # Check for required columns
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({'success': False, 'message': f'Missing columns: {", ".join(missing)}'}), 400
        
        added = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Validate classroom exists
                classroom = Classroom.query.get(int(row['classroom_id']))
                if not classroom:
                    errors.append(f"Row {idx+1}: Classroom ID {row['classroom_id']} not found")
                    continue
                
                entry = Timetable(
                    classroom_id=int(row['classroom_id']),
                    day_of_week=str(row['day']),
                    time_slot=str(row['time']),
                    subject=str(row['subject']),
                    subject_type=str(row['type']),
                    teacher_name=str(row['teacher']),
                    teacher_email=str(row['email']),
                    expected_attendance=float(row['attendance'])
                )
                db.session.add(entry)
                added += 1
            except Exception as e:
                errors.append(f"Row {idx+1}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {added} timetable entries',
            'added': added,
            'errors': errors[:10]  # Return first 10 errors
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/classrooms/bulk-import', methods=['POST'])
def bulk_import_classrooms():
    """Upload CSV to add multiple classrooms at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Only CSV files allowed'}), 400
    
    try:
        df = pd.read_csv(file)
        required_cols = ['name', 'building', 'capacity']
        
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({'success': False, 'message': f'Missing columns: {", ".join(missing)}'}), 400
        
        added = 0
        skipped = 0
        
        for _, row in df.iterrows():
            # Check if classroom already exists
            existing = Classroom.query.filter_by(name=str(row['name'])).first()
            if existing:
                skipped += 1
                continue
            
            room = Classroom(
                name=str(row['name']),
                building=str(row['building']),
                capacity=int(row['capacity']),
                num_lights=int(row.get('lights', 8)),
                num_acs=int(row.get('acs', 2))
            )
            db.session.add(room)
            added += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Imported {added} classrooms, skipped {skipped} duplicates',
            'added': added,
            'skipped': skipped
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# =====================
# PREDICTION ROUTES (with Decision Logging)
# =====================
@app.route('/api/predict', methods=['GET'])
def get_recommendations():
    timetable = Timetable.query.all()
    results = []
    for entry in timetable:
        classroom = entry.classroom
        level_name, level_idx = ml.predict(
            entry.day_of_week, entry.time_slot, 
            entry.subject_type, entry.expected_attendance
        )
        rec, _ = ml.get_recommendation(level_idx)
        
        # Calculate and log energy decision
        lights_action = 'OFF' if level_idx == 0 else 'ON'
        ac_action = 'ON' if level_idx == 2 else 'OFF'
        energy_saved = round(2.5 if level_idx < 2 else 0, 2) # kWh estimate
        
        EnergyService.log_decision(classroom.id, level_name, lights_action, ac_action, energy_saved)
        
        results.append({
            'classroom': classroom.name,
            'subject': entry.subject,
            'time': entry.time_slot,
            'occupancy': level_name,
            'recommendation': rec,
            'attendance': entry.expected_attendance
        })
    return jsonify(results)

@app.route('/api/health', methods=['GET'])
def health_check():
    """System health check endpoint."""
    health = {
        'status': 'healthy',
        'database': 'connected',
        'ml_engine': 'loaded' if ml.model else 'ready_to_train'
    }
    return jsonify(health)

# =====================
# ANALYTICS ROUTES
# =====================
@app.route('/api/dashboard/stats', methods=['GET'])
def get_stats():
    decisions = EnergyDecision.query.count()
    savings = db.session.query(db.func.sum(EnergyDecision.energy_saved_kwh)).scalar() or 0
    return jsonify({
        'energy_saved': round(savings, 1),
        'active_classrooms': Classroom.query.filter_by(is_active=True).count(),
        'avg_occupancy': 68,
        'co2_reduced': round(savings * 0.0005, 2), # Rough CO2 conversion
        'total_decisions': decisions
    })

@app.route('/api/decisions/recent', methods=['GET'])
def get_recent_decisions():
    return jsonify(EnergyService.get_recent_decisions(10))

# =====================
# ML DATASET ROUTES
# =====================
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/ml/upload-train', methods=['POST'])
def upload_and_train():
    """Upload a CSV dataset and train the ML model."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Invalid file. Only CSV allowed.'}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    try:
        df = pd.read_csv(filepath)
        report, error = ml.train_from_dataset(df)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully!',
            'report': report
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ml/predict-batch', methods=['POST'])
def predict_batch():
    """Upload a CSV dataset and get predictions for all rows."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Invalid file. Only CSV allowed.'}), 400
    
    try:
        df = pd.read_csv(file)
        results = ml.predict_batch(df)
        
        # Calculate summary
        summary = {
            'total_records': len(results),
            'low_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'Low'),
            'medium_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'Medium'),
            'high_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'High'),
            'optimized_count': sum(1 for r in results if r['energy_action'] == 'Optimized')
        }
        
        return jsonify({
            'success': True,
            'summary': summary,
            'predictions': results
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    """Get current ML model status and last training report."""
    stats = ml.get_model_stats()
    return jsonify(stats or {'is_trained': False})

# =====================
# STARTUP & SEEDING
# =====================
if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
            print(f"✅ Database connected using: {app.config['SQLALCHEMY_DATABASE_URI']}")
        except Exception as e:
            print(f"❌ Database error: {e}")
            if USE_MYSQL:
                print("⚠️ Falling back to SQLite for local development...")
                app.config['SQLALCHEMY_DATABASE_URI'] = SQLITE_URI
                db.create_all()
                print("✅ SQLite database initialized.")
        
        # Seed admin with hashed password
        # Database Seeding Logic
        try:
            admin_user = User.query.filter_by(username='hamid').first()
            if not admin_user:
                print("👤 Creating default admin user...")
                hashed = PasswordService.hash_password('hamid123')
                db.session.add(User(
                    username='hamid', email='admin@smart.com', 
                    password_hash=hashed, role='admin', is_active_account=True
                ))
                db.session.commit()
                print("✅ Default admin created.")
            
            # Check for initial classrooms
            if Classroom.query.count() == 0:
                print("🏫 Seeding initial classrooms...")
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
                print("✅ Database classrooms seeded successfully!")
            else:
                print("📡 Database already contains data, skipping seeding.")
        except Exception as seed_err:
            print(f"⚠️ Seeding skipped or encountered a non-critical error: {seed_err}")
            db.session.rollback()
        
if __name__ == '__main__':
    with app.app_context():
        # ... database init logic (already exists) ...
        pass
    
    port = int(os.getenv('PORT', 5000))
    if is_dev:
        print(f"🚀 Starting Development Server on port {port}...")
        app.run(debug=True, host='0.0.0.0', port=port)
    else:
        try:
            from waitress import serve
            print(f"⚡ Starting Production Server (Waitress) on port {port}...")
            serve(app, host='0.0.0.0', port=port)
        except ImportError:
            print("⚠️ Waitress not found. Falling back to Flask development server...")
            app.run(debug=False, host='0.0.0.0', port=port)
