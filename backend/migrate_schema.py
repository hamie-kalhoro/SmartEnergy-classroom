import os
from flask import Flask
from models import db
from config import config_by_name
from sqlalchemy import text

def migrate():
    app = Flask(__name__)
    config_name = os.getenv('FLASK_ENV', 'development')
    app.config.from_object(config_by_name[config_name])
    db.init_app(app)

    with app.app_context():
        print(">>> STARTING SCHEMA SYNC...")
        
        # List of columns to add to attendance_history
        columns_to_add = [
            ("day_of_week", "VARCHAR(20)"),
            ("hour", "INTEGER"),
            ("subject_type", "VARCHAR(20)"),
            ("expected_attendance", "FLOAT")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                db.session.execute(text(f"ALTER TABLE attendance_history ADD COLUMN {col_name} {col_type}"))
                db.session.commit()
                print(f"Added column: {col_name}")
            except Exception as e:
                db.session.rollback()
                if "already exists" in str(e).lower():
                    print(f"Column already exists: {col_name}")
                else:
                    print(f"Error adding {col_name}: {e}")

        print(">>> SCHEMA SYNC COMPLETE.")

if __name__ == "__main__":
    migrate()
