"""
Write extra simulated attendance CSVs for uploading in ML Laboratory > Train model.

This only writes files to secure_data/training_extra/. It does not train the model, change
the attendance history or touch the database. Every row is simulated, and the semester
label starts with "Sim" so these rows stay recognisable after they join the history.

Run from backend/: python scripts/generate_extra_training_data.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_paths import SECURE_DATA_DIR
from generate_academic_data import build_schedule, build_timetable_frame, simulate_attendance

OUTPUT_DIR = os.path.join(SECURE_DATA_DIR, 'training_extra')
COLUMNS = ['semester', 'week', 'day', 'hour', 'batch', 'section', 'subject', 'type', 'room', 'enrolled', 'present', 'attendance']

# Upload in this order: the trainer treats later rows as newer and tests on the newest 20%.
# The disrupted term stays in the middle: uploaded last, it would be the test set while being
# almost absent from the training set. The start dates are never written out.
TERMS = [
    ('train_1_regular_term.csv', dict(schedule_seed=101, seed=1101, label='Sim-Term-3-Regular', weeks=16)),
    # Strikes, floods and heatwaves: adds the low-attendance classes the history has few of.
    ('train_2_disrupted_term.csv', dict(schedule_seed=303, seed=3303, label='Sim-Term-4-Disrupted', weeks=8,
                                        cancel_prob=0.08, holidays_per_semester=4,
                                        attendance_shift=-0.30, shock_sd=0.10)),
    ('train_3_regular_term.csv', dict(schedule_seed=202, seed=2202, label='Sim-Term-5-Regular', weeks=16)),
    ('train_4_regular_term.csv', dict(schedule_seed=404, seed=4404, label='Sim-Term-6-Regular', weeks=16)),
    ('train_5_regular_term.csv', dict(schedule_seed=505, seed=5505, label='Sim-Term-7-Regular', weeks=16)),
    ('train_6_regular_term.csv', dict(schedule_seed=606, seed=6606, label='Sim-Term-8-Regular', weeks=16)),
]
PREDICT_SOURCE = 'train_3_regular_term.csv'
PREDICT_FILE = 'predict_sample_week09.csv'
PREDICT_WEEK = 9


def write_term(filename, schedule_seed, seed, label, **simulation):
    schedule = build_schedule(seed=schedule_seed)
    frame = simulate_attendance(schedule, seed=seed, semesters=[(label, date(2000, 1, 3))], **simulation)
    frame[COLUMNS].to_csv(os.path.join(OUTPUT_DIR, filename), index=False)
    print(f"{filename}: {len(frame)} rows")
    return schedule, frame


def write_predict_sample(schedule, frame):
    """Upcoming classes: 'attendance' is each class's past average, which is all that is known beforehand."""
    upcoming = build_timetable_frame(schedule, frame).rename(columns={'time': 'hour'})
    upcoming['week'] = PREDICT_WEEK
    upcoming[['week', 'day', 'hour', 'batch', 'section', 'subject', 'type', 'attendance']].to_csv(
        os.path.join(OUTPUT_DIR, PREDICT_FILE), index=False)
    print(f"{PREDICT_FILE}: {len(upcoming)} rows")


if __name__ == '__main__':
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, options in TERMS:
        term = write_term(name, **options)
        if name == PREDICT_SOURCE:
            write_predict_sample(*term)
