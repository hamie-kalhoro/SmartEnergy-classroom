from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Timetable, Classroom, Notification, User
import pandas as pd

timetable_bp = Blueprint('timetable', __name__)

@timetable_bp.route('/api/timetable', methods=['GET'])
def get_timetable():
    entries = Timetable.query.all()
    return jsonify([{
        'id': e.id, 'classroom': e.classroom.name, 'classroom_id': e.classroom_id,
        'day': e.day_of_week, 'time': e.time_slot, 'subject': e.subject,
        'type': e.subject_type, 'teacher': e.teacher_name, 
        'email': e.teacher_email, 'attendance': e.expected_attendance
    } for e in entries])

@timetable_bp.route('/api/timetable', methods=['POST'])
@jwt_required()
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
    
    # System Tracking Notification
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    notif = Notification(
        type='schedule_update',
        message=f"Schedule updated: {new_entry.subject} in {new_entry.classroom.name} on {new_entry.day_of_week} by {user.username if user else 'Admin'}",
        target_role='admin'
    )
    db.session.add(notif)
    
    db.session.commit()
    return jsonify({'success': True, 'id': new_entry.id})

@timetable_bp.route('/api/timetable/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_timetable(id):
    entry = Timetable.query.get(id)
    if entry:
        subj = entry.subject
        room = entry.classroom.name
        db.session.delete(entry)
        
        # System Tracking Notification
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        notif = Notification(
            type='schedule_update',
            message=f"Cancelled/Removed {subj} from {room} timetable by {user.username if user else 'Admin'}",
            target_role='admin'
        )
        db.session.add(notif)
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

@timetable_bp.route('/api/timetable/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_timetable():
    """Upload CSV to add multiple timetable entries at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
        return jsonify({'success': False, 'message': 'Only CSV files allowed'}), 400
    
    try:
        df = pd.read_csv(file)
        required_cols = ['classroom_id', 'day', 'time', 'subject', 'type', 'teacher', 'email', 'attendance']
        
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return jsonify({'success': False, 'message': f'Missing columns: {", ".join(missing)}'}), 400
        
        added = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
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
        
        # System Tracking Notification
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        notif = Notification(
            type='schedule_update',
            message=f"Bulk imported {added} timetable entries to the system schedule.",
            target_role='admin'
        )
        db.session.add(notif)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully imported {added} timetable entries',
            'added': added,
            'errors': errors[:10]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
@timetable_bp.route('/api/timetable/attendance', methods=['POST'])
@jwt_required()
def record_attendance():
    """Record actual attendance and feed it to the self-learning ML model."""
    data = request.json
    timetable_id = data.get('timetable_id')
    actual_attendance = data.get('actual_attendance')
    
    entry = Timetable.query.get(timetable_id)
    if not entry:
        return jsonify({'success': False, 'message': 'Schedule entry not found'}), 404
        
    from models import AttendanceHistory
    from ml_engine import MLEngine
    
    # Create Ground Truth record (Feedback Loop)
    history = AttendanceHistory(
        timetable_id=timetable_id,
        actual_attendance=actual_attendance,
        day_of_week=entry.day_of_week,
        hour=int(entry.time_slot.split(':')[0]) if ':' in entry.time_slot else 8,
        subject_type=entry.subject_type,
        expected_attendance=entry.expected_attendance
    )
    db.session.add(history)
    db.session.commit()
    
    # 🧠 Trigger Self-Learning: Immediate digestion of this real-world feedback
    ml = MLEngine()
    ml.digest_and_train(pd.DataFrame([{
        'day': history.day_of_week,
        'hour': history.hour,
        'type': history.subject_type,
        'attendance': history.actual_attendance
    }]))
    
    return jsonify({
        'success': True, 
        'message': 'Attendance recorded and integrated into system intelligence.'
    })
