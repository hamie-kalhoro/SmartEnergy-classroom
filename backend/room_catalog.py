"""
CS department rooms as drawn on the campus map (frontend/src/pages/CampusMap.jsx).

Capacities are the map's seat counts. Installed devices follow the map's per-type
specs (labs 4 ACs / 6 fans, classrooms 8 fans / no AC, offices 1 AC / 1 fan).
"""

MAIN_BLOCK = 'Main Block'
ACADEMIC_WING = 'Lower Academic Wing'

DEVICE_SPECS = {
    'lab': {'lights': 12, 'fans': 6, 'acs': 4},
    'classroom': {'lights': 10, 'fans': 8, 'acs': 0},
    'office': {'lights': 2, 'fans': 1, 'acs': 1},
    'hall': {'lights': 16, 'fans': 8, 'acs': 4},
    'utility': {'lights': 2, 'fans': 0, 'acs': 0},
}

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
