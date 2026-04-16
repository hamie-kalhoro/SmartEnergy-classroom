from app import app
from models import Timetable, Classroom

with app.app_context():
    count = Timetable.query.count()
    print(f"Total Timetable entries: {count}")
    
    first_few = Timetable.query.limit(5).all()
    for t in first_few:
        print(f"Room: {t.classroom.name}, Day: {t.day_of_week}, Time: {t.time_slot}, Type: {t.subject_type}")
