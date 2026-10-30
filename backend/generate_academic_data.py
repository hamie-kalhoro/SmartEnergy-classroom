"""
Realistic academic dataset generator (morning shift only).

Scope:
  - 4 batches (1st-4th year), 2 sections each: Section I and Section II
  - Monday-Friday, 1-hour slots from 08:00 to 15:00 (last class starts 14:00)
  - Friday 13:00 slot is kept free for Jummah prayer
  - Theory courses = 3 one-hour lectures per week, labs = one 3-hour block per week
  - Two semesters x 16 weeks of simulated attendance (one row per class held)

Attendance is simulated from effects that are known to drive real attendance
(batch seniority, early/late slots, Fridays, labs being mandatory, start of semester,
midterm / final-exam weeks, teacher strictness) plus things a model can NOT know
in advance (campus-wide shocks such as rain/transport strikes, cancelled classes,
public holidays, individual student absence). That unpredictable part is what keeps
model accuracy at a realistic level instead of ~100%.

Usage:
  python generate_academic_data.py              # write CSVs + retrain the ML model
  python generate_academic_data.py --apply-db   # also replace classrooms/timetable in the DB
"""
import os
import sys
import random
import argparse
from datetime import date, timedelta

import numpy as np
import pandas as pd

from data_paths import SECURE_DATA_DIR as DATA_DIR
from room_catalog import MAP_ROOMS, HOME_ROOMS, room_fields

ATTENDANCE_CSV = os.path.join(DATA_DIR, 'attendance_dataset.csv')
TIMETABLE_CSV = os.path.join(DATA_DIR, 'morning_timetable.csv')

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
HOURS = [8, 9, 10, 11, 12, 13, 14]
BLOCKED_SLOTS = {('Friday', 13)}  # Jummah break
SECTIONS = ['I', 'II']
WEEKS_PER_SEMESTER = 16
SEMESTERS = [('Fall-2025', date(2025, 9, 1)), ('Spring-2026', date(2026, 2, 2))]

# Enrolled students per section (Section II slightly smaller)
ENROLLMENT = {
    1: {'I': 50, 'II': 48},
    2: {'I': 48, 'II': 46},
    3: {'I': 46, 'II': 44},
    4: {'I': 42, 'II': 40},
}

# (course name, type, lab room) per batch
CURRICULUM = {
    1: [('Programming Fundamentals', 'theory', None), ('Programming Fundamentals Lab', 'lab', 'Lab CS-01'),
        ('Calculus & Analytical Geometry', 'theory', None), ('Applied Physics', 'theory', None),
        ('Applied Physics Lab', 'lab', "Madam Anam's Lab"), ('Functional English', 'theory', None)],
    2: [('Data Structures', 'theory', None), ('Data Structures Lab', 'lab', 'Lab CS-02'),
        ('Discrete Structures', 'theory', None), ('Digital Logic Design', 'theory', None),
        ('Digital Logic Design Lab', 'lab', "Madam Anam's Lab"), ('Linear Algebra', 'theory', None)],
    3: [('Operating Systems', 'theory', None), ('Operating Systems Lab', 'lab', 'Lab CS-01'),
        ('Database Systems', 'theory', None), ('Database Systems Lab', 'lab', 'Lab CS-02'),
        ('Theory of Automata', 'theory', None), ('Software Engineering', 'theory', None)],
    4: [('Artificial Intelligence', 'theory', None), ('Artificial Intelligence Lab', 'lab', 'Lab CS-01'),
        ('Information Security', 'theory', None), ('Compiler Construction', 'theory', None),
        ('Professional Practices', 'theory', None)],
}

FACULTY = [
    ("Dr. Hamid Raza", "hamid.raza@university.edu"),
    ("Engr. Aisha Khan", "aisha.k@university.edu"),
    ("Dr. Yasir Shah", "yasir.s@university.edu"),
    ("Prof. Zahid Ali", "zahid.a@university.edu"),
    ("Dr. Saira Ahmed", "saira.a@university.edu"),
    ("Engr. Ali Raza", "ali.raza@university.edu"),
    ("Dr. Maryam Bilal", "maryam.b@university.edu"),
    ("Prof. Kashif Memon", "kashif.m@university.edu"),
    ("Dr. Nadia Siddiqui", "nadia.s@university.edu"),
    ("Engr. Sana Qureshi", "sana.q@university.edu"),
]

LAB_ROOMS = ['Lab CS-01', 'Lab CS-02', "Madam Anam's Lab"]

# --- Attendance behaviour (probability that an enrolled student shows up) ---
BATCH_BASE = {1: 0.87, 2: 0.83, 3: 0.79, 4: 0.73}
HOUR_EFFECT = {8: -0.08, 9: -0.02, 10: 0.02, 11: 0.01, 12: -0.02, 13: -0.05, 14: -0.09}
DAY_EFFECT = {'Monday': -0.02, 'Tuesday': 0.01, 'Wednesday': 0.01, 'Thursday': 0.0, 'Friday': -0.06}
LAB_EFFECT = 0.06
SECTION_EFFECT = {'I': 0.0, 'II': -0.02}
CANCEL_PROB = 0.03          # teacher on leave / class cancelled
HOLIDAYS_PER_SEMESTER = 2   # unannounced closures (strike, weather, public holiday)


def section_label(batch, section):
    return f"Batch {batch} - Section {section}"


def course_subject(course, batch, section):
    """Subject string stored in the timetable; the ML engine parses batch/section back out of it."""
    return f"{course} ({section_label(batch, section)})"


def home_room(batch, section):
    return HOME_ROOMS[(batch, section)]


def week_effect(week):
    if week == 1: return -0.12   # late registrations / add-drop
    if week == 2: return -0.05
    if week <= 7: return -0.006 * (week - 3)
    if week == 8: return 0.05    # midterm week
    if week == 9: return -0.04   # post-midterm slump
    if week <= 14: return -0.03 - 0.006 * (week - 10)
    return 0.04                  # final-exam preparation


def build_schedule(seed=7):
    """Create a clash-free weekly timetable for all 8 sections."""
    rng = random.Random(seed)
    for _ in range(200):
        schedule = _try_build_schedule(rng)
        if schedule is not None:
            return schedule
    raise RuntimeError("Could not build a clash-free timetable")


def _try_build_schedule(rng):
    section_busy, room_busy, teacher_busy = set(), set(), set()
    schedule = []
    free_slots = [(d, h) for d in DAYS for h in HOURS if (d, h) not in BLOCKED_SLOTS]

    for batch in sorted(CURRICULUM):
        for section in SECTIONS:
            sec = (batch, section)
            courses = CURRICULUM[batch]
            # Labs first: they need 3 consecutive free hours in a shared lab room
            for course, ctype, lab_room in sorted(courses, key=lambda c: c[1] != 'lab'):
                teacher = rng.choice(FACULTY)
                if ctype == 'lab':
                    starts = [(d, h) for d in DAYS for h in HOURS
                              if all((d, h + k) in free_slots for k in range(3))]
                    rng.shuffle(starts)
                    placed = False
                    for d, h in starts:
                        slots = [(d, h + k) for k in range(3)]
                        if any((sec, s) in section_busy or (lab_room, s) in room_busy
                               or (teacher, s) in teacher_busy for s in slots):
                            continue
                        for s in slots:
                            section_busy.add((sec, s)); room_busy.add((lab_room, s)); teacher_busy.add((teacher, s))
                            schedule.append(dict(batch=batch, section=section, course=course, type='lab',
                                                 room=lab_room, day=s[0], hour=s[1], teacher=teacher))
                        placed = True
                        break
                    if not placed:
                        return None
                else:
                    room = home_room(batch, section)
                    used_days = set()
                    for _ in range(3):
                        options = [(d, h) for d, h in free_slots if d not in used_days
                                   and (sec, (d, h)) not in section_busy and (teacher, (d, h)) not in teacher_busy]
                        if not options:
                            return None
                        d, h = rng.choice(options)
                        used_days.add(d)
                        section_busy.add((sec, (d, h))); teacher_busy.add((teacher, (d, h)))
                        schedule.append(dict(batch=batch, section=section, course=course, type='theory',
                                             room=room, day=d, hour=h, teacher=teacher))
    return schedule


def simulate_attendance(schedule, seed=42):
    """Simulate one row per class held, for every week of every semester (chronological order)."""
    rng = np.random.default_rng(seed)
    course_keys = {(s['batch'], s['section'], s['course']) for s in schedule}
    strictness = {k: rng.normal(0, 0.05) for k in sorted(course_keys)}   # teacher marks attendance strictly or not
    drift = {k: rng.normal(0, 0.003) for k in sorted(course_keys)}       # course gets more/less popular over weeks
    # Each student has a fixed habit: regulars almost always come, a few rarely do
    habits = {(b, sec): rng.normal(0, 0.12, ENROLLMENT[b][sec]) for b in ENROLLMENT for sec in SECTIONS}

    order = {d: i for i, d in enumerate(DAYS)}
    weekly = sorted(schedule, key=lambda s: (order[s['day']], s['hour'], s['batch'], s['section']))

    rows = []
    for semester, start in SEMESTERS:
        all_days = [(w, d) for w in range(1, WEEKS_PER_SEMESTER + 1) for d in DAYS]
        holiday_idx = rng.choice(len(all_days), HOLIDAYS_PER_SEMESTER, replace=False)
        holidays = {all_days[i] for i in holiday_idx}
        for week in range(1, WEEKS_PER_SEMESTER + 1):
            day_shock = {d: rng.normal(0, 0.03) for d in DAYS}  # rain, transport, campus events
            for s in weekly:
                key = (s['batch'], s['section'], s['course'])
                enrolled = ENROLLMENT[s['batch']][s['section']]
                class_date = start + timedelta(days=(week - 1) * 7 + order[s['day']])

                if (week, s['day']) in holidays or rng.random() < CANCEL_PROB:
                    present = int(rng.binomial(enrolled, 0.03))  # a few students who didn't get the message
                else:
                    p = (BATCH_BASE[s['batch']] + HOUR_EFFECT[s['hour']] + DAY_EFFECT[s['day']]
                         + (LAB_EFFECT if s['type'] == 'lab' else 0) + SECTION_EFFECT[s['section']]
                         + week_effect(week) + strictness[key] + drift[key] * week
                         + day_shock[s['day']] + rng.normal(0, 0.035))
                    student_p = np.clip(p + habits[(s['batch'], s['section'])], 0.02, 0.99)
                    present = int((rng.random(enrolled) < student_p).sum())

                rows.append({
                    'semester': semester, 'week': week, 'date': class_date.isoformat(),
                    'day': s['day'], 'hour': f"{s['hour']:02d}:00",
                    'batch': s['batch'], 'section': s['section'],
                    'subject': course_subject(s['course'], s['batch'], s['section']),
                    'type': s['type'], 'room': s['room'], 'teacher': s['teacher'],
                    'enrolled': enrolled, 'present': present,
                    'attendance': round(100.0 * present / enrolled, 1),
                })
    return pd.DataFrame(rows)


def build_timetable_frame(schedule, attendance_df):
    """Weekly timetable with expected_attendance = historical average % for that class slot."""
    hist = (attendance_df.groupby(['subject', 'day', 'hour'])['attendance'].mean().round(1).to_dict())
    rows = []
    for s in schedule:
        subject = course_subject(s['course'], s['batch'], s['section'])
        hour = f"{s['hour']:02d}:00"
        rows.append({
            'batch': s['batch'], 'section': s['section'], 'room': s['room'],
            'day': s['day'], 'time': hour, 'subject': subject, 'type': s['type'],
            'teacher': s['teacher'][0], 'email': s['teacher'][1],
            'enrolled': ENROLLMENT[s['batch']][s['section']],
            'attendance': hist.get((subject, s['day'], hour), 75.0),
        })
    order = {d: i for i, d in enumerate(DAYS)}
    return pd.DataFrame(rows).sort_values(by=['day', 'time', 'batch', 'section'],
                                          key=lambda c: c.map(order) if c.name == 'day' else c)


def generate_datasets(write=True):
    schedule = build_schedule()
    attendance_df = simulate_attendance(schedule)
    timetable_df = build_timetable_frame(schedule, attendance_df)
    if write:
        os.makedirs(DATA_DIR, exist_ok=True)
        attendance_df.to_csv(ATTENDANCE_CSV, index=False)
        timetable_df.to_csv(TIMETABLE_CSV, index=False)
    return attendance_df, timetable_df


def apply_to_database(timetable_df):
    """Replace classrooms + timetable in the app DB with the morning-shift schedule."""
    from app import app
    from models import db, Classroom, Timetable, AttendanceHistory, EnergyDecision

    with app.app_context():
        db.create_all()
        AttendanceHistory.query.delete()
        Timetable.query.delete()
        EnergyDecision.query.delete()
        Classroom.query.delete()
        db.session.commit()

        rooms = {entry[1]: Classroom(**room_fields(*entry)) for entry in MAP_ROOMS}
        db.session.add_all(rooms.values())
        db.session.commit()

        for r in timetable_df.itertuples():
            db.session.add(Timetable(
                classroom_id=rooms[r.room].id, day_of_week=r.day, time_slot=r.time,
                subject=r.subject, subject_type=r.type, teacher_name=r.teacher,
                teacher_email=r.email, expected_attendance=float(r.attendance)))
        db.session.commit()
        print(f"DB updated: {len(rooms)} classrooms, {Timetable.query.count()} timetable slots.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--apply-db', action='store_true', help='replace classrooms/timetable in the database')
    parser.add_argument('--no-train', action='store_true', help='only write the CSV files')
    args = parser.parse_args()

    attendance_df, timetable_df = generate_datasets()
    print(f"Wrote {len(attendance_df)} attendance records -> {ATTENDANCE_CSV}")
    print(f"Wrote {len(timetable_df)} weekly timetable slots -> {TIMETABLE_CSV}")

    if args.apply_db:
        apply_to_database(timetable_df)

    if not args.no_train:
        from ml_engine import get_ml_engine
        report, error = get_ml_engine().reset_history_and_train(attendance_df)
        if error:
            sys.exit(error)
        print(f"Model trained: accuracy {report['accuracy']}% "
              f"(majority baseline {report['baseline_majority']}%, "
              f"last-weeks-average baseline {report['baseline_history']}%)")
