from app import app
from models import Classroom

with app.app_context():
    rooms = Classroom.query.all()
    for r in rooms:
        print(f"ID: {r.id}, Name: {r.name}")
