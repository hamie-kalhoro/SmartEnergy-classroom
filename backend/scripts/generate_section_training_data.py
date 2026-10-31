"""
Write simulated attendance where each batch and section has its own behaviour.

This only writes files to secure_data/training_by_section/. It does not train the model,
change the attendance history or touch the database. Every row is simulated, and the
semester label starts with "Sim" so these rows stay recognisable after they join the history.

Run from backend/: python scripts/generate_section_training_data.py
"""
import os
import sys
from datetime import date

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_paths import SECURE_DATA_DIR
from generate_academic_data import build_schedule, simulate_attendance

OUTPUT_DIR = os.path.join(SECURE_DATA_DIR, 'training_by_section')
PER_SECTION_DIR = os.path.join(OUTPUT_DIR, 'per_section_view_only')
COLUMNS = ['semester', 'week', 'day', 'hour', 'batch', 'section', 'subject', 'type', 'room', 'enrolled', 'present', 'attendance']

# Each entry changes the chance that a student of that section attends a given class.
SECTION_PROFILES = {
    (1, 'I'): ('Keen and regular', lambda s, week: 0.05),
    (1, 'II'): ('Long commute: weak first slots', lambda s, week: -0.14 if s['hour'] <= 9 else 0.02),
    (2, 'I'): ('Leaves early: weak afternoons', lambda s, week: -0.15 if s['hour'] >= 13 else 0.02),
    (2, 'II'): ('Skips Fridays', lambda s, week: -0.18 if s['day'] == 'Friday' else 0.01),
    (3, 'I'): ('Attends labs, skips theory', lambda s, week: 0.08 if s['type'] == 'lab' else -0.10),
    (3, 'II'): ('Comes for exams', lambda s, week: 0.10 if week == 8 or week >= 15 else -0.07),
    (4, 'I'): ('Fades as final-year project grows', lambda s, week: 0.05 - 0.016 * week),
    (4, 'II'): ('Part-time jobs: low all term', lambda s, week: -0.14),
}

# Upload in this order, once each. Seeds were fixed before any results were seen.
TERMS = [
    ('train_section_term_1.csv', 'Sim-Section-Term-1', 701, 7001),
    ('train_section_term_2.csv', 'Sim-Section-Term-2', 702, 7002),
    ('train_section_term_3.csv', 'Sim-Section-Term-3', 703, 7003),
]


def section_effect(slot, week):
    _, effect = SECTION_PROFILES[(slot['batch'], slot['section'])]
    return effect(slot, week)


if __name__ == '__main__':
    os.makedirs(PER_SECTION_DIR, exist_ok=True)
    frames = []
    for filename, label, schedule_seed, seed in TERMS:
        frame = simulate_attendance(build_schedule(seed=schedule_seed), seed=seed,
                                    semesters=[(label, date(2000, 1, 3))], section_effect=section_effect)[COLUMNS]
        frame.to_csv(os.path.join(OUTPUT_DIR, filename), index=False)
        frames.append(frame)
        print(f"{filename}: {len(frame)} rows")

    everything = pd.concat(frames, ignore_index=True)
    for (batch, section), rows in everything.groupby(['batch', 'section']):
        rows.to_csv(os.path.join(PER_SECTION_DIR, f'batch{batch}_section{section}.csv'), index=False)
    print(f"per_section_view_only: {everything.groupby(['batch', 'section']).ngroups} files")
