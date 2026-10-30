from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from models import db, User
from hardware_bridge import bridge

hardware_bp = Blueprint('hardware', __name__)

def admin_only(view):
    @wraps(view)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, get_jwt_identity())
        if not user or user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        return view(*args, **kwargs)
    return wrapper

@hardware_bp.route('/api/hardware/status', methods=['GET'])
@admin_only
def get_status():
    """Latest occupancy, relay states and events reported by the board."""
    return jsonify({'success': True, **bridge.snapshot()})

@hardware_bp.route('/api/hardware/reset', methods=['POST'])
@admin_only
def reset_board():
    """Restart the board so its count and the portal both start from zero."""
    if not bridge.request_reset():
        return jsonify({'success': False, 'message': 'The board is not connected.'}), 409
    return jsonify({'success': True, 'message': 'Board is restarting.'})
