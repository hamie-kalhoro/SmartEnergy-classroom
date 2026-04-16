from app import app
from models import db, EnergyDecision
from datetime import datetime, timedelta
from sqlalchemy import func

with app.app_context():
    user_now = datetime.utcnow() + timedelta(hours=5)
    print(f"User Now: {user_now}")
    
    for i in range(7, -1, -1):
        target_date = (user_now - timedelta(days=i)).date()
        daily_saved = db.session.query(func.sum(EnergyDecision.energy_saved_kwh))\
            .filter(func.date(EnergyDecision.timestamp) == target_date).scalar() or 0
        print(f"Date: {target_date} ({target_date.strftime('%a')}), Saved: {daily_saved}")
