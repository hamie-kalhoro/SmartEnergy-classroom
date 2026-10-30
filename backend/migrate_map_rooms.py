"""
Sync the classroom table with the rooms on the campus map.

  - adds the classroom.room_type and classroom.map_id columns if missing
  - renames pre-map rooms (Room 101, Computer Lab 1, ...) in place, so their
    timetable / attendance rows stay attached, and gives them the map room's specs
  - inserts map rooms that do not exist yet
  - links existing rooms to their map shape (map_id) without touching values
    edited in the portal (name, capacity, devices)

Safe to run more than once. Note: uses DATABASE_URL from .env (Supabase) when reachable.
"""
from sqlalchemy import text, inspect

from app import app
from models import db, Classroom
from room_catalog import MAP_ROOMS, LEGACY_NAMES, room_fields

NEW_COLUMNS = [
    ('room_type', "VARCHAR(20) DEFAULT 'classroom'"),
    ('map_id', 'VARCHAR(40)'),
]


def migrate():
    with app.app_context():
        columns = [c['name'] for c in inspect(db.engine).get_columns('classroom')]
        for name, ddl in NEW_COLUMNS:
            if name not in columns:
                db.session.execute(text(f"ALTER TABLE classroom ADD COLUMN {name} {ddl}"))
                db.session.commit()
                print(f"Added column: classroom.{name}")

        catalog = {entry[1]: room_fields(*entry) for entry in MAP_ROOMS}

        for old, new in LEGACY_NAMES.items():
            room = Classroom.query.filter_by(name=old).first()
            if room and not Classroom.query.filter_by(name=new).first():
                for key, value in catalog[new].items():
                    setattr(room, key, value)
                print(f"Renamed: {old} -> {new}")

        for fields in catalog.values():
            room = (Classroom.query.filter_by(map_id=fields['map_id']).first()
                    or Classroom.query.filter_by(name=fields['name'], map_id=None).first())
            if room is None:
                db.session.add(Classroom(**fields))
                print(f"Added: {fields['name']}")
                continue
            if room.map_id is None:
                room.map_id = fields['map_id']
                print(f"Linked to map: {room.name} -> {fields['map_id']}")
            if not room.room_type:
                room.room_type = fields['room_type']

        db.session.commit()
        unlinked = [r.name for r in Classroom.query.filter_by(is_active=True, map_id=None).all()]
        if unlinked:
            print(f"Not on map: {', '.join(unlinked)}")
        print(f"Done: {Classroom.query.filter_by(is_active=True).count()} active rooms.")


if __name__ == "__main__":
    migrate()
