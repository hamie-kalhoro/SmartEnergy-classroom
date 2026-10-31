"""
CS department rooms as drawn on the campus map (frontend/src/pages/CampusMap.jsx).

Capacities are the map's seat counts. Installed devices follow the map's per-type
specs (labs 4 ACs / 6 fans, classrooms 8 fans / no AC, offices 1 AC / 1 fan).
"""
from math import ceil

MAIN_BLOCK = 'Main Block'
ACADEMIC_WING = 'Lower Academic Wing'

DEVICE_SPECS = {
    'lab': {'lights': 12, 'fans': 6, 'acs': 4},
    'classroom': {'lights': 10, 'fans': 8, 'acs': 0},
    'office': {'lights': 2, 'fans': 1, 'acs': 1},
    'hall': {'lights': 16, 'fans': 8, 'acs': 4},
    'utility': {'lights': 2, 'fans': 0, 'acs': 0},
}

# Rated power per unit (kW): LED tube, ceiling fan, 1.5-ton split AC (1-ton in offices)
UNIT_KW = {'light': 0.02, 'fan': 0.075, 'ac': 1.5, 'office_ac': 1.1, 'standby': 0.04}
PLAN_TEMP = 24

# Rooms that can host a timetable slot
SCHEDULABLE_TYPES = ('lab', 'classroom', 'hall')

# (map_id, name, type, building, capacity); map_id is the room's shape id on the campus map
MAP_ROOMS = [
    ('cs-01', 'Lab CS-01', 'lab', MAIN_BLOCK, 35),
    ('cs-02', 'Lab CS-02', 'lab', MAIN_BLOCK, 35),
    ('cs-03', 'Lab CS-03', 'lab', MAIN_BLOCK, 40),
    ('cs-04', 'Lab CS-04', 'lab', MAIN_BLOCK, 40),
    ('cs-05', 'Lab CS-05', 'lab', MAIN_BLOCK, 40),
    ('cs-06', 'Lab CS-06', 'lab', MAIN_BLOCK, 40),
    ('ai-lab', 'AI Lab', 'lab', MAIN_BLOCK, 35),
    ('anam-lab', "Madam Anam's Lab", 'lab', MAIN_BLOCK, 30),
    ('seminar-hall', 'Seminar Hall', 'hall', MAIN_BLOCK, 120),
    ('third-year-i', '3rd Year Section I', 'classroom', ACADEMIC_WING, 50),
    ('third-year-ii', '3rd Year Section II', 'classroom', ACADEMIC_WING, 48),
    ('final-year-i', 'Final Year Section I', 'classroom', ACADEMIC_WING, 42),
    ('dr-fawad', 'Dr. Fawad Office', 'office', MAIN_BLOCK, 1),
    ('dr-bushra', 'Dr. Bushra Office', 'office', MAIN_BLOCK, 1),
    ('bscs-registrar', 'BSCS Registrar', 'office', MAIN_BLOCK, 3),
    ('teachers-common', "Teachers' Common Room", 'office', MAIN_BLOCK, 10),
    ('files-room', 'Files Room', 'utility', MAIN_BLOCK, 0),
    ('store', 'Store', 'utility', MAIN_BLOCK, 0),
    ('boys-toilet', 'Boys Toilet', 'utility', MAIN_BLOCK, 0),
]

# Home room of each (batch, section). The map only shows three lecture rooms,
# so the other sections are taught in the main-block labs.
HOME_ROOMS = {
    (1, 'I'): 'Lab CS-06',
    (1, 'II'): 'Lab CS-05',
    (2, 'I'): 'Lab CS-04',
    (2, 'II'): 'AI Lab',
    (3, 'I'): '3rd Year Section I',
    (3, 'II'): '3rd Year Section II',
    (4, 'I'): 'Final Year Section I',
    (4, 'II'): 'Lab CS-03',
}

# Pre-map room names -> map room (keeps existing timetable rows attached)
LEGACY_NAMES = {
    'Room 101': 'Lab CS-06',
    'Room 102': 'Lab CS-05',
    'Room 103': 'Lab CS-04',
    'Room 104': 'AI Lab',
    'Room 105': '3rd Year Section I',
    'Room 106': '3rd Year Section II',
    'Room 107': 'Final Year Section I',
    'Room 108': 'Lab CS-03',
    'Computer Lab 1': 'Lab CS-01',
    'Computer Lab 2': 'Lab CS-02',
    'Electronics Lab': "Madam Anam's Lab",
}


def room_fields(map_id, name, room_type, building, capacity):
    spec = DEVICE_SPECS[room_type]
    return dict(map_id=map_id, name=name, room_type=room_type, building=building, capacity=capacity,
                num_lights=spec['lights'], num_fans=spec['fans'], num_acs=spec['acs'])


def recommend_devices(room_type, installed, seats, present):
    """Device counts a headcount needs. Mirrors recommendDevices in frontend/src/pages/CampusMap.jsx."""
    if room_type == 'utility':
        return {'lights': installed['lights'], 'fans': 0, 'acs': 0}
    if not present or not seats:
        return {'lights': 0, 'fans': 0, 'acs': 0}
    ratio = min(1, present / seats)

    def scaled(count, floor=0):
        return min(count, max(1, ceil(count * (floor + (1 - floor) * ratio)))) if count else 0

    return {'lights': scaled(installed['lights'], 0.3), 'fans': scaled(installed['fans']), 'acs': scaled(installed['acs'])}


def ac_cooling_factor(temp):
    """Inverter ACs draw ~6% more per degree the set-point is below 26 C."""
    return 1 + max(0, 26 - temp) * 0.06


def room_power(room_type, lights, fans, acs, temp):
    """Mirrors roomPower in frontend/src/pages/CampusMap.jsx."""
    ac_kw = UNIT_KW['office_ac'] if room_type == 'office' else UNIT_KW['ac']
    return round(UNIT_KW['standby'] + lights * UNIT_KW['light'] + fans * UNIT_KW['fan']
                 + acs * ac_kw * ac_cooling_factor(temp), 2)


def energy_report(room_type, installed, seats, present, lights, fans, acs, temp):
    """Required versus current load of a room, with the share of each device above the requirement."""
    plan = recommend_devices(room_type, installed, seats, present)
    live_kw = room_power(room_type, lights, fans, acs, temp)
    plan_kw = room_power(room_type, plan['lights'], plan['fans'], plan['acs'], PLAN_TEMP)
    ac_kw = (UNIT_KW['office_ac'] if room_type == 'office' else UNIT_KW['ac']) * ac_cooling_factor(temp)
    rows = [
        {'device': 'Lights', 'unit': 'light', 'live': lights, 'required': plan['lights'], 'extra_kw': (lights - plan['lights']) * UNIT_KW['light']},
        {'device': 'Fans', 'unit': 'fan', 'live': fans, 'required': plan['fans'], 'extra_kw': (fans - plan['fans']) * UNIT_KW['fan']},
        {'device': 'AC units', 'unit': 'AC unit', 'live': acs, 'required': plan['acs'], 'extra_kw': (acs - plan['acs']) * ac_kw},
    ]
    extras = [{**row, 'extra': row['live'] - row['required'], 'extra_kw': round(row['extra_kw'], 2)}
              for row in rows if row['live'] > row['required']]
    return {
        'present': present, 'seats': seats, 'live_kw': live_kw, 'plan_kw': plan_kw,
        'excess_kw': round(live_kw - plan_kw, 2), 'extras': extras,
        'temp': temp, 'plan_temp': PLAN_TEMP, 'overcooling': acs > 0 and temp < PLAN_TEMP,
    }
