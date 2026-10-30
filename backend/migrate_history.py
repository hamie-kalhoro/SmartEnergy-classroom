from datetime import timezone
import os
import pandas as pd
from datetime import datetime, timedelta
import random
from app import app
from data_paths import SECURE_DATA_DIR
from models import db, EnergyDecision, Classroom

def migrate():
    with app.app_context():
        # 1. Load Dataset
        df = pd.read_csv(os.path.join(SECURE_DATA_DIR, 'sample_2000_dataset.csv'))
        
        # 2. Cleanup existing decisions
        EnergyDecision.query.delete()
        db.session.commit()
        print("DATABASE WIPED.")
        
        # 3. Process records with UTC+5 Anchor
        # Anchor is early morning April 16th (User's Today)
        anchor = datetime.now(timezone.utc) + timedelta(hours=5)
        
        print(f"Migrating {len(df)} records for 20 rooms...")
        
        batch_size = 100
        new_decisions = []
        
        for i, row in df.iterrows():
            # i // 10 decisions per day average
            days_back = i // 10 
            target_time = anchor - timedelta(days=days_back)
            
            # STRICT WEEKEND PROTECTION
            if target_time.weekday() >= 5:
                continue
            
            # Map the hour
            try:
                hour_str = row['hour'].split(':')[0]
                hour = int(hour_str)
            except:
                hour = random.randint(8, 15)
            
            # Final adjusted timestamp (stored as UTC but logic is Local)
            # To store as UTC: subtract 5 hours from our local logic
            local_time = target_time.replace(hour=hour, minute=random.randint(0,59), second=0, microsecond=0)
            utc_timestamp = local_time - timedelta(hours=5)
            
            # Map classroom across 20 rooms
            # 1-15 Theory, 16-20 Lab
            if row['type'] == 'theory':
                room_id = random.randint(1, 15)
            else:
                room_id = random.randint(16, 20)
            
            occ_map = {0: 'Low', 1: 'Medium', 2: 'High'}
            occ_name = occ_map.get(row['label'], 'Low')
            
            # Logic
            lights = 'OFF' if occ_name == 'Low' else 'ON'
            ac = 'ON' if occ_name == 'High' else 'OFF'
            saved = 2.5 if occ_name == 'Low' else 1.2 if occ_name == 'Medium' else 0
            
            decision = EnergyDecision(
                classroom_id=room_id,
                timestamp=utc_timestamp,
                predicted_occupancy=occ_name,
                lights_action=lights,
                ac_action=ac,
                energy_saved_kwh=saved
            )
            new_decisions.append(decision)
            
            if len(new_decisions) >= batch_size:
                db.session.bulk_save_objects(new_decisions)
                db.session.commit()
                new_decisions = []
                
        if new_decisions:
            db.session.bulk_save_objects(new_decisions)
            db.session.commit()
            
        print("MIGRATION COMPLETE: 20-Room Unified Schedule.")

if __name__ == "__main__":
    migrate()
