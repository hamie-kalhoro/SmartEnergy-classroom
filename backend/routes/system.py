from flask import Blueprint, jsonify, current_app
from sqlalchemy import text
from models import db
import time
import os
import socket

system_bp = Blueprint('system', __name__)

def check_supabase_connectivity():
    """Verify if the Supabase pooler is reachable."""
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        return False, 0
    
    try:
        # Extract host and port from URL
        # Format: postgresql://user:pass@host:port/db
        host_port = db_url.split('@')[1].split('/')[0]
        if ':' in host_port:
            host, port = host_port.split(':')
            port = int(port)
        else:
            host = host_port
            port = 5432
            
        start_time = time.time()
        socket.create_connection((host, port), timeout=2)
        latency = int((time.time() - start_time) * 1000)
        return True, latency
    except Exception:
        return False, 0

@system_bp.route('/api/system/db-status', methods=['GET'])
def get_db_status():
    """Check database health and network latency."""
    is_supabase_reachable, latency = check_supabase_connectivity()
    
    # Check what's currently active in SQLAlchemy
    try:
        current_uri = str(db.engine.url)
        is_using_sqlite = 'sqlite' in current_uri
    except Exception:
        is_using_sqlite = True

    return jsonify({
        'success': True,
        'active_db': 'local_sqlite' if is_using_sqlite else 'supabase_cloud',
        'is_cloud_available': is_supabase_reachable,
        'latency_ms': latency,
        'timestamp': time.time()
    })
