import logging
import time
from functools import wraps

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from hardware_bridge import bridge
from hardware_ml import forecaster
from hardware_store import store
from models import db, User

logger = logging.getLogger(__name__)

hardware_bp = Blueprint('hardware', __name__)

# The portal polls every second. Remembering a confirmed admin briefly keeps that polling
# off the main database, at the cost of a role change taking up to this long to apply here.
ADMIN_CHECK_SECONDS = 60
confirmed_admins = {}


def start_hardware_services():
    """Start the USB bridge, event recording and forecast model."""
    bridge.add_listener(store.append)
    bridge.start()
    forecaster.start()


def admin_only(view):
    @wraps(view)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        if confirmed_admins.get(user_id, 0) < time.monotonic():
            user = db.session.get(User, user_id)
            if not user or user.role != 'admin':
                confirmed_admins.pop(user_id, None)
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            confirmed_admins[user_id] = time.monotonic() + ADMIN_CHECK_SECONDS
        return view(*args, **kwargs)
    return wrapper


@hardware_bp.route('/api/hardware/status', methods=['GET'])
@admin_only
def get_status():
    """Latest occupancy, relay states and events from the board, plus the forecast."""
    snapshot = bridge.snapshot()
    try:
        forecast = forecaster.forecast(snapshot)
    except Exception:
        # A forecast problem must not take the live hardware view down with it.
        logger.exception('Hardware forecast failed.')
        forecast = {'status': 'unavailable', 'error': 'The forecast could not be calculated.', 'model': None, 'training': False}
    return jsonify({'success': True, **snapshot, 'forecast': forecast})


@hardware_bp.route('/api/hardware/reset', methods=['POST'])
@admin_only
def reset_board():
    """Restart the board so its count and the portal both start from zero."""
    if not bridge.request_reset():
        return jsonify({'success': False, 'message': 'The board is not connected.'}), 409
    return jsonify({'success': True, 'message': 'Board is restarting.'})


@hardware_bp.route('/api/hardware/forecast/retrain', methods=['POST'])
@admin_only
def retrain_forecast():
    """Retrain the forecast model in the background, including recorded sessions."""
    if not forecaster.retrain():
        return jsonify({'success': False, 'message': 'Training is already running.'}), 409
    return jsonify({'success': True, 'message': 'Training started.'}), 202
