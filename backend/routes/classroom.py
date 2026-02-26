from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Classroom, Notification, User
import pandas as pd

classroom_bp = Blueprint('classroom', __name__)

@classroom_bp.route('/api/classrooms', methods=['GET'])
def get_classrooms():
    classes = Classroom.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': c.id, 'name': c.name, 'building': c.building, 
        'capacity': c.capacity, 'lights': c.num_lights, 
        'acs': c.num_acs, 'fans': c.num_fans
    } for c in classes])

@classroom_bp.route('/api/classrooms', methods=['POST'])
@jwt_required()
def add_classroom():
    data = request.json
    new_room = Classroom(
        name=data['name'], building=data['building'], 
        capacity=data['capacity'], num_lights=data.get('lights', 8),
        num_acs=data.get('acs', 2), num_fans=data.get('fans', 4)
    )
    db.session.add(new_room)
    
    # System Tracking Notification
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    notif = Notification(
        type='system_update',
        message=f"New classroom '{new_room.name}' added to {new_room.building} building by {user.username if user else 'Admin'}",
        target_role='admin'
    )
    db.session.add(notif)
    
    db.session.commit()
    return jsonify({'success': True, 'id': new_room.id})

@classroom_bp.route('/api/classrooms/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_classroom(id):
    room = Classroom.query.get(id)
    if room:
        room.is_active = False
        
        # System Tracking Notification
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        notif = Notification(
            type='system_update',
            message=f"Classroom '{room.name}' (ID: {room.id}) was deactivated by {user.username if user else 'Admin'}",
            target_role='admin'
        )
        db.session.add(notif)
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False}), 404

@classroom_bp.route('/api/classrooms/<int:id>', methods=['PUT'])
@jwt_required()
def update_classroom(id):
    room = Classroom.query.get(id)
    if not room:
        return jsonify({'success': False, 'message': 'Room not found'}), 404
        
    data = request.json
    room.name = data.get('name', room.name)
    room.building = data.get('building', room.building)
    room.capacity = data.get('capacity', room.capacity)
    room.num_lights = data.get('lights', room.num_lights)
    room.num_acs = data.get('acs', room.num_acs)
    room.num_fans = data.get('fans', room.num_fans)
    
    # System Tracking Notification
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    notif = Notification(
        type='system_update',
        message=f"Configuration for '{room.name}' was updated by {user.username if user else 'Admin'}",
        target_role='admin'
    )
    db.session.add(notif)
    
    db.session.commit()
    return jsonify({'success': True})

@classroom_bp.route('/api/classrooms/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_classrooms():
    """Upload CSV to add multiple classrooms at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
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
            existing = Classroom.query.filter_by(name=str(row['name'])).first()
            if existing:
                skipped += 1
                continue
            
            room = Classroom(
                name=str(row['name']),
                building=str(row['building']),
                capacity=int(row['capacity']),
                num_lights=int(row.get('lights', 8)),
                num_acs=int(row.get('acs', 2)),
                num_fans=int(row.get('fans', 4))
            )
            db.session.add(room)
            added += 1
        
        
        # System Tracking Notification
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        notif = Notification(
            type='system_update',
            message=f"Bulk onboarded {added} classrooms to the system database.",
            target_role='admin'
        )
        db.session.add(notif)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Imported {added} classrooms, skipped {skipped} duplicates',
            'added': added,
            'skipped': skipped
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
