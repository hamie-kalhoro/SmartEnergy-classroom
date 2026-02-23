from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import pandas as pd
import os
from models import db, User, Notification
from services import AuthService, PasswordService, EmailService

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/signup', methods=['POST'])
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

@auth_bp.route('/api/activate', methods=['GET'])
def activate():
    token = request.args.get('token')
    if AuthService.activate_user(token):
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        return redirect(f"{frontend_url}/login?activated=true")
    return "Invalid or expired activation token.", 400

@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user, error = AuthService.login_user(data.get('username'), data.get('password'))
    
    if error:
        return jsonify({'success': False, 'message': error}), 401
    
    # Create JWT Access Token
    access_token = create_access_token(identity=str(user.id))
        
    return jsonify({
        'success': True,
        'token': access_token,
        'user': {
            'id': user.id, 
            'username': user.username, 
            'role': user.role, 
            'email': user.email
        }
    })

@auth_bp.route('/api/verify-admin', methods=['POST'])
def verify_admin():
    data = request.json
    user = User.query.filter_by(username=data.get('username'), role='admin').first()
    if user and PasswordService.verify_password(data.get('password'), user.password_hash):
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Admin verification failed'}), 401

@auth_bp.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get list of all users."""
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'is_active': u.is_active_account,
        'is_pending_admin': u.is_pending_admin,
        'is_permanent': u.is_permanent
    } for u in users])

@auth_bp.route('/api/users/pending-admins', methods=['GET'])
@jwt_required()
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

@auth_bp.route('/api/users/approve-admin/<int:id>', methods=['POST'])
@jwt_required()
def approve_admin(id):
    """Approve a pending admin registration."""
    current_user_id = get_jwt_identity()
    approver = User.query.get(int(current_user_id))
    approved_by = approver.username if approver else None
    
    success, error = AuthService.approve_admin(id, approved_by=approved_by)
    if not success:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'message': 'Admin approved and activation email sent.'})

@auth_bp.route('/api/users/activate-manual/<int:id>', methods=['POST'])
@jwt_required()
def activate_user_manual(id):
    """Manually activate a user (failover for email service)."""
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    user.is_active_account = True
    user.activation_token = None
    db.session.commit()
    return jsonify({'success': True, 'message': f'User {user.username} activated manually.'})

@auth_bp.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Retrieve notifications relevant to the user's role."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify([]), 401
    
    # Logic: admins see admin, faculty, and 'all' notifications. Faculty see faculty and 'all'.
    if user.role == 'admin':
        notifs = Notification.query.filter(
            (Notification.target_role == 'admin') | 
            (Notification.target_role == 'faculty') |
            (Notification.target_role == 'all')
        ).order_by(Notification.created_at.desc()).all()
    else:
        notifs = Notification.query.filter(
            (Notification.target_role == user.role) | 
            (Notification.target_role == 'all')
        ).order_by(Notification.created_at.desc()).all()

    return jsonify([{
        'id': n.id,
        'type': n.type,
        'message': n.message,
        'target_role': n.target_role,
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat() + 'Z'
    } for n in notifs])

@auth_bp.route('/api/notifications/<int:id>/read', methods=['POST'])
@jwt_required()
def next_notification_read(id):
    """Mark a notification as read."""
    notif = Notification.query.get(id)
    if notif:
        notif.is_read = True
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Notification not found'}), 404

@auth_bp.route('/api/users/create-single', methods=['POST'])
@jwt_required()
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

@auth_bp.route('/api/users/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_users():
    """Upload CSV to add multiple faculty/users at once."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    # Note: allowed_file check should be handled or imported. 
    # For now, I'll assume csv as per the original logic but refactored.
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
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
                existing = User.query.filter_by(email=str(row['email'])).first()
                if existing:
                    skipped += 1
                    continue
                
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

@auth_bp.route('/api/users/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    if not current_user or current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
    target_user = User.query.get(id)
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    # identify superior admin
    SUPERIOR_EMAIL = 'admin@smart.com'
    is_current_superior = (current_user.email == SUPERIOR_EMAIL)
    is_target_superior = (target_user.email == SUPERIOR_EMAIL)

    # Rule 1: Cannot delete permanent admins
    if target_user.is_permanent:
        return jsonify({
            'success': False, 
            'message': 'This account is permanent and cannot be deleted.'
        }), 403

    # Rule 2: Only Superior Admin can delete other admins
    if target_user.role == 'admin' and not is_current_superior:
        return jsonify({
            'success': False, 
            'message': 'Only the Superior Administrator has authority to remove other administrators.'
        }), 403

    # Rule 3: If a normal admin deletes a faculty member, notify superior
    if not is_current_superior and target_user.role == 'faculty':
        try:
            notification = Notification(
                type='user_deletion_alert',
                message=f"Admin '{current_user.username}' deleted faculty member: {target_user.username} ({target_user.email})",
                target_role='admin',
                created_by=current_user.username
            )
            db.session.add(notification)
            
            # Send Email Notification to Superior Admin
            EmailService.notify_superior_of_deletion(
                superior_email=SUPERIOR_EMAIL,
                admin_name=current_user.username,
                target_user_name=target_user.username,
                target_role=target_user.role
            )
            # We don't commit yet, we'll commit with the deletion
        except Exception as e:
            current_app.logger.error(f"Failed to create notification: {str(e)}")

    try:
        db.session.delete(target_user)
        db.session.commit()
        return jsonify({'success': True, 'message': f'User {target_user.username} deleted successfully.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@auth_bp.route('/api/users/<int:id>', methods=['PUT'])
@jwt_required()
def update_user(id):
    """Admin edits a user's profile, role, status, or password."""
    current_user_id = get_jwt_identity()
    editor = User.query.get(int(current_user_id))
    
    if not editor or editor.role != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    user = User.query.get(id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    data = request.json
    is_self_edit = (str(editor.id) == str(user.id))
    changes = []
    
    # Logic same as original app.py
    new_username = data.get('username', '').strip()
    if new_username and new_username != user.username:
        existing = User.query.filter(User.username == new_username, User.id != id).first()
        if existing:
            return jsonify({'success': False, 'message': f'Username "{new_username}" is already taken.'}), 400
        changes.append(f'Username: {user.username} → {new_username}')
        user.username = new_username
    
    new_email = data.get('email', '').strip()
    if new_email and new_email != user.email:
        # Protection for Superior Admin email
        if user.email == 'admin@smart.com':
             return jsonify({'success': False, 'message': 'The Superior Admin email address is permanent and cannot be changed.'}), 403
             
        existing = User.query.filter(User.email == new_email, User.id != id).first()
        if existing:
            return jsonify({'success': False, 'message': f'Email "{new_email}" is already in use.'}), 400
        changes.append(f'Email updated')
        user.email = new_email
    
    new_role = data.get('role', '').strip()
    if new_role and new_role != user.role:
        if is_self_edit:
            return jsonify({'success': False, 'message': 'You cannot change your own role.'}), 400
        
        # Protection for Superior Admin role
        if user.email == 'admin@smart.com':
             return jsonify({'success': False, 'message': 'The Superior Admin role cannot be modified.'}), 403
             
        if new_role not in ('admin', 'faculty', 'user'):
            return jsonify({'success': False, 'message': 'Invalid role.'}), 400
        changes.append(f'Role: {user.role} → {new_role}')
        user.role = new_role
        if new_role == 'admin':
            user.is_pending_admin = False
    
    new_status = data.get('is_active')
    if new_status is not None and new_status != user.is_active_account:
        if is_self_edit:
            return jsonify({'success': False, 'message': 'You cannot deactivate your own account.'}), 400
        # Protect permanent users from deactivation
        if user.is_permanent and not new_status:
             return jsonify({'success': False, 'message': 'Permanent accounts cannot be deactivated.'}), 403
             
        changes.append(f'Status: {"Active" if new_status else "Inactive"}')
        user.is_active_account = new_status
        if new_status:
            user.activation_token = None

    # New: Toggle Permanent Status (Only Superior Admin can do this)
    new_permanent = data.get('is_permanent')
    if new_permanent is not None and new_permanent != user.is_permanent:
        if not is_current_superior:
            return jsonify({'success': False, 'message': 'Only the Superior Admin can change permanence status.'}), 403
        
        # Superior Admin cannot make themselves non-permanent (safety)
        if is_self_edit and not new_permanent:
             return jsonify({'success': False, 'message': 'You cannot remove your own permanent status.'}), 400
             
        user.is_permanent = new_permanent
        changes.append(f'Permanence: {"Permanent" if new_permanent else "Regular"}')
    
    new_password = data.get('new_password', '').strip()
    if new_password:
        if len(new_password) < 4:
            return jsonify({'success': False, 'message': 'Password must be at least 4 characters.'}), 400
        user.password_hash = PasswordService.hash_password(new_password)
        changes.append('Password reset')
    
    if not changes:
        return jsonify({'success': True, 'message': 'No changes detected.'})
    
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'User updated successfully. Changes: {", ".join(changes)}'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
