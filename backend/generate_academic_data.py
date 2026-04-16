import random
import pandas as pd
from datetime import datetime, timedelta
from app import app
from models import db, Classroom, Timetable, EnergyDecision

def generate():
    with app.app_context():
        print(">>> STARTING ACADEMIC OVERHAUL...")
        
        # 1. Expand Infrastructure (Rooms 11-20)
        existing_rooms = Classroom.query.count()
        if existing_rooms < 20:
            for i in range(existing_rooms + 1, 21):
                name = f"Room {100+i}" if i <= 15 else f"Specialized Lab {i-15}"
                room = Classroom(
                    name=name,
                    building="Engineering Block",
                    capacity=100, # Standardized for intuitive math
                    num_lights=8,
                    num_acs=2,
                    num_fans=4
                )
                db.session.add(room)
            db.session.commit()
            print(f"Added {20 - existing_rooms} new classrooms.")
        
        # Ensure ID 1-10 also have 100 capacity for consistency
        Classroom.query.update({Classroom.capacity: 100})
        db.session.commit()

        # 2. Clear Timetable
        Timetable.query.delete()
        db.session.commit()
        print("Existing Timetable cleared.")

        # 3. Curriculum Definition (REDUCED)
        weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        theory_rooms = Classroom.query.filter(Classroom.name.like('Room%')).all()
        lab_rooms = Classroom.query.filter(Classroom.name.like('%Lab%')).all()

        timetable_data = []

        # Logic for Majors (3hr blocks) - REDUCED to 10
        for i in range(10): 
            day = random.choice(weekdays)
            room = random.choice(theory_rooms)
            start_hour = random.choice([8, 11]) 
            for offset in range(3):
                t = Timetable(
                    classroom_id=room.id,
                    day_of_week=day,
                    time_slot=f"{start_hour+offset:02d}:00",
                    subject=f"Major Course {i}",
                    subject_type="theory",
                    expected_attendance=random.randint(25, 75)
                )
                db.session.add(t)
                timetable_data.append(t)

        # Logic for Minors (2 sessions of 1hr) - REDUCED to 10
        for i in range(10): 
            days = random.sample(weekdays, 2)
            room = random.choice(theory_rooms)
            hour = random.choice([8, 9, 10, 11, 13, 14, 15])
            for d in days:
                t = Timetable(
                    classroom_id=room.id,
                    day_of_week=d,
                    time_slot=f"{hour:02d}:00",
                    subject=f"Minor Course {i}",
                    subject_type="theory",
                    expected_attendance=random.randint(15, 60)
                )
                db.session.add(t)
                timetable_data.append(t)

        # Logic for Labs (3hr blocks, strictly AM) - REDUCED to 5
        for i in range(5): 
            day = random.choice(weekdays)
            room = random.choice(lab_rooms)
            start_hour = 9 
            for offset in range(3):
                t = Timetable(
                    classroom_id=room.id,
                    day_of_week=day,
                    time_slot=f"{start_hour+offset:02d}:00",
                    subject=f"Practical Lab {i}",
                    subject_type="lab",
                    expected_attendance=random.randint(20, 80)
                )
                db.session.add(t)
                timetable_data.append(t)

        db.session.commit()
        print(f"New Timetable populated with {Timetable.query.count()} slots.")

        # 4. Dataset Generation (2000 rows)
        print("Regenerating sample_2000_dataset.csv with corrected thresholds...")
        records = []
        for _ in range(2000):
            slot = random.choice(timetable_data)
            attendance_noise = random.randint(-15, 15)
            actual_attendance = max(0, min(100, slot.expected_attendance + attendance_noise))
            
            # Corrected Tresholds: 33.33/66.66%
            # If capacity=100, then attendance is the percentage.
            if actual_attendance <= 33:
                label = 0 # Low
            elif actual_attendance <= 66:
                label = 1 # Medium
            else:
                label = 2 # High
            
            records.append({
                'day': slot.day_of_week,
                'hour': slot.time_slot,
                'type': slot.subject_type,
                'attendance': actual_attendance,
                'label': label
            })
        
        df = pd.DataFrame(records)
        df.to_csv('sample_2000_dataset.csv', index=False)
        print("Dataset regenerated successfully.")
        print(">>> OVERHAUL COMPLETE.")

if __name__ == "__main__":
    generate()
