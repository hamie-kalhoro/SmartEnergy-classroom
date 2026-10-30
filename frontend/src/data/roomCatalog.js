// Room types, installed devices and rated power shared by the campus map and the rooms portal.
// Mirrors backend/room_catalog.py.

export const ROOM_TYPES = {
    lab: { label: 'Lab', plural: 'Labs', color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.16)' },
    classroom: { label: 'Classroom', plural: 'Classrooms', color: '#34d399', fill: 'rgba(52, 211, 153, 0.15)' },
    hall: { label: 'Hall', plural: 'Halls', color: '#a78bfa', fill: 'rgba(167, 139, 250, 0.16)' },
    office: { label: 'Office', plural: 'Offices', color: '#fbbf24', fill: 'rgba(251, 191, 36, 0.14)' },
    utility: { label: 'Utility', plural: 'Utility', color: '#94a3b8', fill: 'rgba(148, 163, 184, 0.13)' },
    circulation: { label: 'Route', color: '#22c55e', fill: 'rgba(34, 197, 94, 0.07)' }
};

export const ROOM_TYPE_KEYS = ['lab', 'classroom', 'hall', 'office', 'utility'];

// Installed devices per room type: labs 4 ACs / 6 fans, classrooms 8 fans / no AC,
// offices 1 AC / 1 fan. Light counts and the seminar hall are site estimates.
export const DEVICE_SPECS = {
    lab: { lights: 12, fans: 6, acs: 4 },
    classroom: { lights: 10, fans: 8, acs: 0 },
    office: { lights: 2, fans: 1, acs: 1 },
    hall: { lights: 16, fans: 8, acs: 4 },
    utility: { lights: 2, fans: 0, acs: 0 }
};

// Rated power per unit (kW): LED tube, ceiling fan, 1.5-ton split AC (1-ton in offices)
export const UNIT_KW = { light: 0.02, fan: 0.075, ac: 1.5, officeAc: 1.1, standby: 0.04 };

export const DEVICE_MODELS = {
    light: { name: 'LED tube', rating: '20 W each', detail: 'LED tube light, 20 W' },
    fan: { name: 'Ceiling fan', rating: '75 W each', detail: 'Ceiling fan, 75 W' },
    ac: { name: 'Split AC', rating: '1.5 kW each', detail: '1.5-ton split AC, 1.5 kW' },
    officeAc: { name: 'Split AC', rating: '1.1 kW each', detail: '1-ton split AC, 1.1 kW' }
};

export function acKwFor(type) {
    return type === 'office' ? UNIT_KW.officeAc : UNIT_KW.ac;
}

/** Full-load draw per device group (kW) for a room's installed devices. */
export function connectedLoad(type, { lights = 0, fans = 0, acs = 0 }) {
    const parts = {
        lights: lights * UNIT_KW.light,
        fans: fans * UNIT_KW.fan,
        acs: acs * acKwFor(type)
    };
    return { ...parts, total: parts.lights + parts.fans + parts.acs };
}
