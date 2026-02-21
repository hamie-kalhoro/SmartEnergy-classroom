from flask import Blueprint, jsonify
from models import db, Classroom, EnergyDecision
from services import EnergyService

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/api/dashboard/stats', methods=['GET'])
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

@analytics_bp.route('/api/decisions/recent', methods=['GET'])
def get_recent_decisions():
    return jsonify(EnergyService.get_recent_decisions(10))

@analytics_bp.route('/api/health', methods=['GET'])
def health_check():
    """System health check endpoint."""
    health = {
        'status': 'healthy',
        'database': 'connected',
        # ML engine status could be added here if needed
    }
    return jsonify(health)
