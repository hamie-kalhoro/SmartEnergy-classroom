from app import app
from models import EnergyDecision
from datetime import datetime

with app.app_context():
    decs = EnergyDecision.query.all()
    wkends = [d for d in decs if d.timestamp.weekday() >= 5]
    print(f"Total Decisions: {len(decs)}")
    print(f"Weekend Decisions: {len(wkends)}")
    
    if wkends:
        print("SAMPLE WEEKEND DECISION:")
        print(f"Date: {wkends[0].timestamp}, Room: {wkends[0].classroom_id}")
