from functools import wraps

from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User


def roles_required(*roles):
    """Allow a route only for active accounts whose current role is listed."""
    def decorator(view):
        @wraps(view)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = db.session.get(User, int(get_jwt_identity()))
            if not user or not user.is_active_account or user.role not in roles:
                return jsonify({'success': False, 'message': 'You do not have permission to do this.'}), 403
            return view(*args, **kwargs)
        return wrapper
    return decorator
