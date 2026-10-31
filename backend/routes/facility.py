from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, AssistantMailLog, Classroom, Notification, RoomAssistant, RoomLiveState, User
from permissions import roles_required
from room_catalog import energy_report
from services import AuthService, EmailService

facility_bp = Blueprint('facility', __name__)

SEVERITY_RANK = {None: 0, 'warning': 1, 'critical': 2}
# Someone moving a slider back and forth must not fill the admins' notifications.
RENOTIFY_AFTER = timedelta(seconds=60)
MIN_TEMP, MAX_TEMP = 16, 30
# One report per room in this time, so a double click cannot send the same email twice.
REPORT_COOLDOWN = timedelta(minutes=2)
MIN_REPORT_EXCESS_KW = 0.01
MAX_NOTE_LENGTH = 500
LOCAL_TIME = timezone(timedelta(hours=5), 'PKT')


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def bounded(value, low, high):
    if isinstance(value, bool):
        raise ValueError
    return max(low, min(high, int(value)))


def serialize(row):
    return {
        'mode': row.mode, 'present': row.present, 'lights': row.lights, 'fans': row.fans,
        'acs': row.acs, 'temp': row.temp, 'updated_by': row.updated_by, 'updated_at': iso(row.updated_at),
        'ack_severity': row.ack_severity, 'ack_by': row.ack_by, 'ack_at': iso(row.ack_at),
    }


def current_username():
    user = db.session.get(User, int(get_jwt_identity()))
    return user.username if user else None


def active_room(map_id):
    return Classroom.query.filter_by(map_id=map_id, is_active=True).first()


def room_controller_required(view):
    """Admins and faculty control any room; a lab assistant only the room assigned to them."""
    @wraps(view)
    @jwt_required()
    def wrapper(map_id, *args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        allowed = user and user.is_active_account and (
            user.role in ('admin', 'faculty')
            or db.session.query(RoomAssistant.id).join(Classroom).filter(
                RoomAssistant.user_id == user.id, RoomAssistant.status == 'active', Classroom.map_id == map_id
            ).first()
        )
        if not allowed:
            return jsonify({'success': False, 'message': 'You do not have permission to do this.'}), 403
        return view(map_id, *args, **kwargs)
    return wrapper


def should_notify(row, severity, now):
    if SEVERITY_RANK[severity] <= SEVERITY_RANK[row.alert_severity]:
        return False
    if SEVERITY_RANK[severity] > SEVERITY_RANK[row.notified_severity]:
        return True
    return not row.notified_at or now - row.notified_at >= RENOTIFY_AFTER


@facility_bp.route('/api/map/room-states', methods=['GET'])
@jwt_required()
def get_room_states():
    """Live device state of every room that has been changed from its default."""
    return jsonify({row.map_id: serialize(row) for row in RoomLiveState.query.all()})


@facility_bp.route('/api/map/room-states/<map_id>', methods=['PUT'])
@room_controller_required
def update_room_state(map_id):
    """Save a room's devices. The client reports the alert level it shows for this state."""
    room = active_room(map_id)
    if not room:
        return jsonify({'success': False, 'message': 'Room not found'}), 404

    data = request.get_json(silent=True) or {}
    severity = data.get('severity')
    if data.get('mode') not in ('auto', 'manual') or severity not in SEVERITY_RANK:
        return jsonify({'success': False, 'message': 'Invalid room state'}), 400
    try:
        values = {
            'present': bounded(data['present'], 0, room.capacity or 0),
            'lights': bounded(data['lights'], 0, room.num_lights or 0),
            'fans': bounded(data['fans'], 0, room.num_fans or 0),
            'acs': bounded(data['acs'], 0, room.num_acs or 0),
            'temp': bounded(data['temp'], MIN_TEMP, MAX_TEMP),
        }
        excess_kw = max(0.0, float(data.get('excess_kw', 0)))
    except (KeyError, TypeError, ValueError):
        return jsonify({'success': False, 'message': 'Invalid room state'}), 400

    row = db.session.get(RoomLiveState, map_id) or RoomLiveState(map_id=map_id)
    db.session.add(row)
    username = current_username()
    now = utc_now()

    if should_notify(row, severity, now):
        db.session.add(Notification(
            type='load_alert',
            message=f"{severity.capitalize()} load alert: {room.name} is {excess_kw:.2f} kW above its recommended plan (changed by {username})"[:255],
            target_role='admin'
        ))
        row.notified_severity, row.notified_at = severity, now

    # An acknowledgement only covers the level that was seen: anything worse alerts again.
    if SEVERITY_RANK[severity] == 0 or SEVERITY_RANK[severity] > SEVERITY_RANK[row.ack_severity]:
        row.ack_severity, row.ack_by, row.ack_at = None, None, None

    row.mode = data['mode']
    for field, value in values.items():
        setattr(row, field, value)
    row.alert_severity = severity
    row.updated_by, row.updated_at = username, now
    db.session.commit()
    return jsonify({'success': True, 'room': serialize(row)})


@facility_bp.route('/api/map/room-states/<map_id>/acknowledge', methods=['POST'])
@room_controller_required
def acknowledge_alert(map_id):
    row = db.session.get(RoomLiveState, map_id)
    if not row or not row.alert_severity:
        return jsonify({'success': False, 'message': 'This room has no active alert.'}), 409
    row.ack_severity, row.ack_by, row.ack_at = row.alert_severity, current_username(), utc_now()
    db.session.commit()
    return jsonify({'success': True, 'room': serialize(row)})


def current_assistant(room):
    return RoomAssistant.query.filter_by(classroom_id=room.id, status='active').first()


def current_report(room):
    row = db.session.get(RoomLiveState, room.map_id)
    if not row:
        return None  # A room nobody has changed is still on its plan
    installed = {'lights': room.num_lights or 0, 'fans': room.num_fans or 0, 'acs': room.num_acs or 0}
    return energy_report(room.room_type or 'classroom', installed, room.capacity or 0, row.present,
                         row.lights, row.fans, row.acs, row.temp)


@facility_bp.route('/api/map/assistants', methods=['GET'])
@jwt_required()
def get_assistants():
    """Assistant of each room. Only administrators see contact details and report history."""
    viewer = db.session.get(User, int(get_jwt_identity()))
    is_admin = bool(viewer and viewer.role == 'admin')
    result = {}
    for link in RoomAssistant.query.filter_by(status='active').all():
        if not link.classroom.map_id:
            continue
        entry = {'user_id': link.user_id, 'username': link.user.username}
        if is_admin:
            last = AssistantMailLog.query.filter_by(classroom_id=link.classroom_id).order_by(AssistantMailLog.sent_at.desc()).first()
            entry.update(email=link.user.email, last_report=last and {'sent_by': last.sent_by, 'sent_at': iso(last.sent_at), 'excess_kw': last.excess_kw})
        result[link.classroom.map_id] = entry
    return jsonify(result)


@facility_bp.route('/api/map/rooms/<map_id>/assistant', methods=['POST'])
@roles_required('admin')
def assign_assistant(map_id):
    """Add an existing user or a new person as the assistant of a room without one."""
    room = next((r for r in AuthService.vacant_rooms() if r.map_id == map_id), None)
    if not room:
        return jsonify({'success': False, 'message': 'This room already has an assistant, or cannot take one.'}), 409

    data = request.get_json(silent=True) or {}
    message = None
    if data.get('user_id') is not None:
        user = db.session.get(User, data['user_id']) if isinstance(data['user_id'], int) else None
        if not user or user.is_pending_admin or not user.is_active_account:
            return jsonify({'success': False, 'message': 'Choose an active user.'}), 400
        if user.role == 'user':
            user.role = 'assistant'
    else:
        username, email = str(data.get('username') or '').strip(), str(data.get('email') or '').strip()
        password = str(data.get('password') or '')
        if not username or '@' not in email or len(password) < 6:
            return jsonify({'success': False, 'message': 'Enter a name, an email and a password of at least 6 characters.'}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': 'That username is already taken.'}), 400
        user, error = AuthService.admin_create_user(username, email, password, 'assistant')
        if error:
            return jsonify({'success': False, 'message': 'That email already has an account. Choose it from existing users.'}), 400
        if not user.activation_email_sent:
            message = 'The activation email could not be sent. Activate this account from Faculty Users.'

    db.session.add(RoomAssistant(classroom_id=room.id, user_id=user.id, status='active', assigned_by=current_username()))
    db.session.commit()
    return jsonify({'success': True, 'message': message or f'{user.username} is now the assistant for {room.name}.'})


@facility_bp.route('/api/map/rooms/<map_id>/assistant', methods=['DELETE'])
@roles_required('admin')
def remove_assistant(map_id):
    room = active_room(map_id)
    link = current_assistant(room) if room else None
    if not link:
        return jsonify({'success': False, 'message': 'This room has no assistant.'}), 404
    user = link.user
    db.session.delete(link)
    db.session.flush()
    # Someone with no room left is an ordinary user again; other roles keep what they had.
    if user.role == 'assistant' and not RoomAssistant.query.filter_by(user_id=user.id).first():
        user.role = 'user'
    db.session.commit()
    return jsonify({'success': True})


@facility_bp.route('/api/map/rooms/<map_id>/assistant/email', methods=['POST'])
@roles_required('admin')
def email_assistant(map_id):
    """Email the room's assistant which devices are above what its headcount requires."""
    room = active_room(map_id)
    if not room:
        return jsonify({'success': False, 'message': 'Room not found'}), 404
    link = current_assistant(room)
    if not link:
        return jsonify({'success': False, 'message': 'This room has no assistant yet.'}), 409
    report = current_report(room)
    if not report or report['excess_kw'] < MIN_REPORT_EXCESS_KW:
        return jsonify({'success': False, 'message': 'This room is not using more than it requires.'}), 409

    now = utc_now()
    last = AssistantMailLog.query.filter_by(classroom_id=room.id).order_by(AssistantMailLog.sent_at.desc()).first()
    if last and now - last.sent_at < REPORT_COOLDOWN:
        return jsonify({'success': False, 'message': 'A report for this room was sent moments ago. Please wait two minutes.'}), 429

    data = request.get_json(silent=True) or {}
    note = str(data.get('note') or '').strip()[:MAX_NOTE_LENGTH]
    admin = db.session.get(User, int(get_jwt_identity()))
    sent_at = now.replace(tzinfo=timezone.utc).astimezone(LOCAL_TIME).strftime('%d %b %Y, %I:%M %p PKT')
    if not EmailService.send_energy_report(link.user.email, link.user.username, room.name, report, admin.username, admin.email, note, sent_at):
        return jsonify({'success': False, 'message': 'The email could not be sent. Check the mail settings and try again.'}), 502

    db.session.add(AssistantMailLog(classroom_id=room.id, sent_to=link.user.email, sent_by=admin.username, excess_kw=report['excess_kw'], sent_at=now))
    db.session.commit()
    return jsonify({'success': True, 'message': f'Report sent to {link.user.username}.'})
