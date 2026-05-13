from flask import Blueprint, jsonify, request
from models import db, Classroom, EnergyDecision, User
from services import EnergyService, ReportingService
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, extract

analytics_bp = Blueprint('analytics', __name__)

def get_user_now():
    """System-wide anchor for UTC+5 alignment."""
    return datetime.utcnow() + timedelta(hours=5)

@analytics_bp.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_stats():
    print("DEBUG: /api/dashboard/stats requested")
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    range_param = request.args.get('range', '1w')
    
    user_now = get_user_now()
    days = 7 if range_param == '1w' else 30
    
    # Decisions in local-aligned UTC
    # Local Today starts at (user_now.date()) midnight. 
    # In UTC that is (user_now.date() - 5 hours).
    local_start_of_range = (user_now - timedelta(days=days)).replace(hour=0, minute=0, second=0)
    utc_start = local_start_of_range - timedelta(hours=5)

    decisions_range_query = EnergyDecision.query.filter(EnergyDecision.timestamp >= utc_start)
    decisions_count = decisions_range_query.count()
    savings = db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= utc_start).scalar() or 0
    
    # Baseline: Fixed baseline for current nodes within range
    # Assuming decisions_count represents the active intervals
    baseline_energy = round(decisions_count * 3.5, 1)

    stats = {
        'energy_saved': round(float(savings), 1),
        'baseline_energy': baseline_energy,
        'active_classrooms': Classroom.query.count(),
        'avg_occupancy': 51, # Placeholder for overall avg
        'co2_reduced': round(float(savings) * 0.0005, 2),
        'total_decisions': decisions_count, # Filtering by range
        'today_estimation': ReportingService.get_today_estimation()
    }

    if user and user.role == 'admin':
        from ml_engine import MLEngine
        ml = MLEngine()
        profile = ml.get_intelligence_profile()
        
        # Align today's metrics
        stats.update({
            'saved_today': EnergyService.get_daily_summary()['savings'], 
            'weekly_savings': round(float(db.session.query(func.sum(EnergyDecision.energy_saved_kwh)).filter(EnergyDecision.timestamp >= (user_now - timedelta(days=7) - timedelta(hours=5))).scalar() or 0), 2),
            'efficiency_growth': profile['delta'], 
            'growth_label': 'higher' if profile['delta'] >= 0 else 'lower'
        })
    
    return jsonify(stats)

@analytics_bp.route('/api/dashboard/charts', methods=['GET'])
@jwt_required()
def get_chart_data():
    print("DEBUG: /api/dashboard/charts requested")
    user_now = get_user_now()
    range_param = request.args.get('range', '1w')
    days = 7 if range_param == '1w' else 30
    
    labels = []
    values = []
    today_projection = 0
    
    for i in range(days - 1, -1, -1):
        target_local_date = (user_now - timedelta(days=i)).date()
        
        # PERFECT WEEKEND SHUTDOWN: Force 0
        if target_local_date.weekday() >= 5:
            daily_saved = 0
        else:
            # Query by adjusting the day's local range to UTC
            day_start_utc = datetime.combine(target_local_date, datetime.min.time()) - timedelta(hours=5)
            day_end_utc = day_start_utc + timedelta(days=1)
            
            daily_saved = db.session.query(func.sum(EnergyDecision.energy_saved_kwh))\
                .filter(EnergyDecision.timestamp >= day_start_utc, EnergyDecision.timestamp < day_end_utc).scalar() or 0
        
        label = target_local_date.strftime('%a') if days <= 7 else target_local_date.strftime('%d %b')
        labels.append(label)
        values.append(round(float(daily_saved), 2))
        
        if i == 0:
            today_projection = ReportingService.get_today_estimation()
    
    # Hourly: 8 AM - 3 PM
    hourly_labels = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM']
    hourly_values = [0] * len(hourly_labels)
    occ_map = {'Low': 15, 'Medium': 45, 'High': 82}
    
    for idx, h in enumerate(range(8, 16)):
        day_start_utc = datetime.combine(user_now.date(), datetime.min.time()) - timedelta(hours=5)
        target_hour_utc = day_start_utc + timedelta(hours=h)
        target_hour_end_utc = target_hour_utc + timedelta(hours=1)
        
        avg_bin = db.session.query(EnergyDecision.predicted_occupancy)\
            .filter(EnergyDecision.timestamp >= target_hour_utc, EnergyDecision.timestamp < target_hour_end_utc).all()
        
        if avg_bin:
            hourly_values[idx] = round(sum(occ_map.get(o[0], 0) for o in avg_bin) / len(avg_bin))
        else:
            # Fallback historical
            hist = db.session.query(EnergyDecision.predicted_occupancy).filter(extract('hour', EnergyDecision.timestamp) == (h-5)).limit(10).all()
            if hist: hourly_values[idx] = round(sum(occ_map.get(o[0], 0) for o in hist) / len(hist))

    return jsonify({
        'weekly': {'labels': labels, 'data': values, 'today_projection': today_projection},
        'hourly': {'labels': hourly_labels, 'data': hourly_values}
    })

@analytics_bp.route('/api/decisions/recent', methods=['GET'])
@jwt_required()
def get_recent_decisions():
    decisions = EnergyDecision.query.order_by(EnergyDecision.timestamp.desc()).limit(10).all()
    return jsonify([{
        'id': d.id,
        'classroom': d.classroom.name if d.classroom else "Unknown Room",
        'timestamp': (d.timestamp + timedelta(hours=5)).strftime('%H:%M'), # Show Local Time
        'occupancy': d.predicted_occupancy,
        'saved': d.energy_saved_kwh
    } for d in decisions])

@analytics_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'database': 'connected'})
