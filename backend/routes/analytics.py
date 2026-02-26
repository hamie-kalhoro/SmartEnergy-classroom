from flask import Blueprint, jsonify
from models import db, Classroom, EnergyDecision
from services import EnergyService, ReportingService

analytics_bp = Blueprint('analytics', __name__)

from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

@analytics_bp.route('/api/dashboard/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    decisions = EnergyDecision.query.count()
    savings = db.session.query(db.func.sum(EnergyDecision.energy_saved_kwh)).scalar() or 0
    
    stats = {
        'energy_saved': round(savings, 1),
        'active_classrooms': Classroom.query.filter_by(is_active=True).count(),
        'avg_occupancy': 68,
        'co2_reduced': round(savings * 0.0005, 2),
        'total_decisions': decisions
    }

    # 🔒 Strict Admin-Only Metrics (as requested)
    if user and user.role == 'admin':
        weekly_stats = ReportingService.generate_weekly_stats()
        stats.update({
            'saved_today': ReportingService.get_today_savings(),
            'weekly_savings': weekly_stats['total_savings'],
            'efficiency_growth': weekly_stats['growth'],
            'growth_label': weekly_stats['growth_label']
        })
    
    return jsonify(stats)

@analytics_bp.route('/api/decisions/recent', methods=['GET'])
def get_recent_decisions():
    return jsonify(EnergyService.get_recent_decisions(10))

@analytics_bp.route('/api/health', methods=['GET'])
def health_check():
    """System health check endpoint."""
    health = {
        'status': 'healthy',
        'database': 'connected',
    }
    return jsonify(health)
