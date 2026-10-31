import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue } from 'framer-motion';
import {
    FiActivity,
    FiAlertTriangle,
    FiCheck,
    FiCheckCircle,
    FiCopy,
    FiEdit3,
    FiLayers,
    FiMaximize,
    FiMinus,
    FiNavigation,
    FiPlus,
    FiRotateCcw,
    FiSearch,
    FiSun,
    FiThermometer,
    FiUsers,
    FiWind,
    FiX,
    FiZap
} from 'react-icons/fi';
import { TbAirConditioning } from 'react-icons/tb';
import { ROOM_TYPES, DEVICE_SPECS, UNIT_KW } from '../data/roomCatalog';
import api from '../api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler
} from 'chart.js';
import NumberedSlider from '../components/NumberedSlider';
import { AlertCenter, EnergyPanel, RoomAlertBanner, evaluateLoadAlert, isAcknowledged, sortAlerts } from '../components/LoadAlerts';
import LabAssistantPanel from '../components/LabAssistantPanel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MAP_WIDTH = 1300;
const MAP_HEIGHT = 1900;
// Bounding box of everything drawn on the map, used to fit it into the viewport
const MAP_CONTENT = { x: -20, y: 40, w: 1300, h: 1820 };
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.8;
const BOUNDARY_STORAGE_KEY = 'campusMap.siteBoundaryPoints.v2';
const ROOM_SYNC_INTERVAL_MS = 4000;
const ROOM_SAVE_DELAY_MS = 350;
const ASSISTANT_SYNC_INTERVAL_MS = 30000;
const ASSISTANT_ROOM_TYPES = ['lab', 'classroom', 'hall'];
const PLAN_TEMP = 24;
const DEFAULT_SITE_BOUNDARY_POINTS = [
    [205, 58],
    [828, 58],
    [828, 1140],
    [1276, 1316],
    [1256, 1480],
    [1206, 1612],
    [1078, 1742],
    [1028, 1802],
    [808, 1854],
    [590, 1854],
    [594, 1500],
    [82, 1786],
    [-16, 1602],
    [406, 1364],
    [406, 1168],
    [205, 1168]
];

// Room shapes on the drawing. Name, type, seats and installed devices come from the
// Rooms portal (/api/classrooms, linked by map_id); the values here are only fallbacks.
const ROOM_SHAPES = [
    { id: 'cs-06', name: 'Lab CS-06', type: 'lab', x: 240, y: 90, w: 230, h: 205, seats: 40, present: 34, floor: 'Main block' },
    { id: 'cs-04', name: 'Lab CS-04', type: 'lab', x: 240, y: 335, w: 230, h: 175, seats: 40, present: 22, floor: 'Main block' },
    { id: 'dr-fawad', name: 'Dr. Fawad Office', short: 'Dr. Fawad', type: 'office', x: 240, y: 510, w: 230, h: 38, seats: 1, present: 1, floor: 'Main block' },
    { id: 'bscs-registrar', name: 'BSCS Registrar', type: 'office', x: 240, y: 548, w: 230, h: 38, seats: 3, present: 2, floor: 'Main block' },
    { id: 'boys-toilet', name: 'Boys Toilet', type: 'utility', x: 240, y: 586, w: 230, h: 38, seats: 0, present: 0, floor: 'Main block' },
    { id: 'files-room', name: 'Files Room', type: 'utility', x: 240, y: 624, w: 230, h: 52, seats: 0, present: 0, floor: 'Main block' },
    { id: 'teachers-common', name: "Teachers' Common Room", short: "Teachers' Room", type: 'office', x: 240, y: 676, w: 230, h: 72, seats: 10, present: 4, floor: 'Main block' },
    { id: 'ai-lab', name: 'AI Lab', type: 'lab', x: 240, y: 748, w: 230, h: 165, seats: 35, present: 12, floor: 'Main block' },
    { id: 'cs-02', name: 'Lab CS-02', type: 'lab', x: 240, y: 950, w: 230, h: 205, seats: 35, present: 0, floor: 'Main block' },

    { id: 'cs-05', name: 'Lab CS-05', type: 'lab', x: 560, y: 90, w: 230, h: 205, seats: 40, present: 38, floor: 'Main block' },
    { id: 'dr-bushra', name: 'Dr. Bushra Office', short: 'Dr. Bushra', type: 'office', x: 560, y: 295, w: 230, h: 40, seats: 1, present: 0, floor: 'Main block' },
    { id: 'cs-03', name: 'Lab CS-03', type: 'lab', x: 560, y: 335, w: 230, h: 175, seats: 40, present: 27, floor: 'Main block' },
    { id: 'store', name: 'Store', type: 'utility', x: 560, y: 510, w: 230, h: 52, seats: 0, present: 0, floor: 'Main block' },
    { id: 'seminar-hall', name: 'Seminar Hall', type: 'hall', x: 560, y: 562, w: 230, h: 165, seats: 120, present: 0, floor: 'Main block' },
    { id: 'anam-lab', name: "Madam Anam's Lab", type: 'lab', x: 560, y: 727, w: 230, h: 185, seats: 30, present: 9, floor: 'Main block' },
    { id: 'cs-01', name: 'Lab CS-01', type: 'lab', x: 560, y: 950, w: 230, h: 205, seats: 35, present: 18, floor: 'Main block' },
    // Lower academic wing, traced from the department drawing at the main block's scale
    { id: 'third-year-i', name: '3rd Year Section I', type: 'classroom', points: '609,1648 803,1656 803,1833 606,1833', seats: 50, present: 41, floor: 'Lower academic wing' },
    { id: 'final-year-i', name: 'Final Year Section I', type: 'classroom', points: '1047,1333 1256,1331 1237,1402 1219,1474 1189,1566 1047,1515', labelAt: { x: 1135, y: 1430 }, seats: 42, present: 29, floor: 'Lower academic wing' },
    { id: 'third-year-ii', name: '3rd Year Section II', type: 'classroom', points: '803,1656 841,1656 1021,1546 1047,1515 1189,1566 1170,1607 1062,1720 1016,1780 803,1833', labelAt: { x: 960, y: 1705 }, seats: 48, present: 36, floor: 'Lower academic wing' }
];

const ROUTES = [
    { id: 'central-corridor', d: 'M515 90 L515 1155', label: 'Central corridor' },
    { id: 'entry-path', d: 'M422 1155 L422 1376', label: 'Entry path' }
];

// Static site features of the lower area (from the department drawing; no dimensions shown)
const APPROACH_AREA = '422,1376 3,1605 75,1762 612,1464';
const WING_WALLS = 'M790 1155 L840 1154 L940 1272 L895 1336 L1256 1331 L1237 1402 L1219 1474 L1189 1566 L1170 1607 L1062 1720 L1016 1780 L803 1833 L606 1833 L612 1464';
const WING_ANNEX = '888,1576 939,1544 1006,1564 903,1613';

// Same thresholds as the backend occupancy model (ml_engine.level_for)
const OCCUPANCY_LEVELS = [
    { max: 5, label: 'Empty', tone: 'muted' },
    { max: 25, label: 'Trace', tone: 'info' },
    { max: 50, label: 'Light', tone: 'info' },
    { max: 75, label: 'Balanced', tone: 'good' },
    { max: 100, label: 'Maximum', tone: 'warn' }
];

function occupancyLevel(present, seats) {
    if (!seats) return null;
    const pct = Math.round((present / seats) * 100);
    return { pct, ...OCCUPANCY_LEVELS.find(level => pct <= level.max) };
}

/** Device counts the system recommends for a given headcount. */
function recommendDevices(room, present) {
    const spec = room.devices;
    if (room.type === 'utility') return { lights: spec.lights, fans: 0, acs: 0, temp: PLAN_TEMP };
    if (!present) return { lights: 0, fans: 0, acs: 0, temp: PLAN_TEMP };
    const ratio = Math.min(1, present / room.seats);
    const scaled = (count, floor = 0) => (count ? Math.min(count, Math.max(1, Math.ceil(count * (floor + (1 - floor) * ratio)))) : 0);
    return {
        lights: scaled(spec.lights, 0.3),   // keep the occupied zones lit, not the whole room
        fans: scaled(spec.fans),
        acs: scaled(spec.acs),
        temp: PLAN_TEMP
    };
}

function initialRoomState(room) {
    return { mode: 'auto', present: room.present, ...recommendDevices(room, room.present) };
}

/** Map shapes merged with their portal records; shapes without an active record are inactive. */
function buildRooms(records) {
    const byMapId = records ? Object.fromEntries(records.filter(r => r.map_id).map(r => [r.map_id, r])) : {};
    return ROOM_SHAPES.map(shape => {
        if (!records) return { ...shape, devices: DEVICE_SPECS[shape.type] };
        const record = byMapId[shape.id];
        if (!record) return { ...shape, inactive: true, devices: { lights: 0, fans: 0, acs: 0 } };
        return {
            ...shape,
            name: record.name,
            short: record.name === shape.name ? shape.short : undefined,
            type: DEVICE_SPECS[record.type] ? record.type : shape.type,
            seats: record.capacity || 0,
            floor: record.building || shape.floor,
            devices: { lights: record.lights || 0, fans: record.fans || 0, acs: record.acs || 0 }
        };
    });
}

const FALLBACK_ROOMS = buildRooms(null);

function defaultRoomStates() {
    return Object.fromEntries(FALLBACK_ROOMS.map(room => [room.id, initialRoomState(room)]));
}

/** Effective device state: in Auto mode counts always follow the headcount. */
function resolveState(room, stored) {
    // Seats and installed devices can shrink in the portal: keep the saved state inside them
    const state = {
        ...stored,
        present: Math.min(stored.present, room.seats),
        lights: Math.min(stored.lights, room.devices.lights),
        fans: Math.min(stored.fans, room.devices.fans),
        acs: Math.min(stored.acs, room.devices.acs)
    };
    return state.mode === 'auto' ? { ...state, ...recommendDevices(room, state.present), temp: state.temp } : state;
}

function roomPower(room, state) {
    const acKw = room.type === 'office' ? UNIT_KW.officeAc : UNIT_KW.ac;
    // Inverter ACs draw ~6% more per degree the set-point is below 26 °C
    const acFactor = 1 + Math.max(0, 26 - state.temp) * 0.06;
    const total = UNIT_KW.standby
        + state.lights * UNIT_KW.light
        + state.fans * UNIT_KW.fan
        + state.acs * acKw * acFactor;
    return Number(total.toFixed(2));
}

function roomLoadAlert(room, state) {
    const plan = recommendDevices(room, state.present);
    return evaluateLoadAlert(room, state, plan, roomPower(room, state), roomPower(room, plan));
}

/** Required versus current load of a room, device by device. */
function roomEnergy(room, state) {
    const plan = recommendDevices(room, state.present);
    const acKw = room.type === 'office' ? UNIT_KW.officeAc : UNIT_KW.ac;
    const acFactor = 1 + Math.max(0, 26 - state.temp) * 0.06;
    const liveKw = roomPower(room, state);
    const planKw = roomPower(room, plan);
    return {
        liveKw,
        planKw,
        excessKw: Number((liveKw - planKw).toFixed(2)),
        temp: state.temp,
        planTemp: plan.temp,
        overcooling: state.acs > 0 && state.temp < plan.temp,
        rows: [
            { key: 'lights', label: 'Lights', live: state.lights, plan: plan.lights, installed: room.devices.lights, liveKw: state.lights * UNIT_KW.light },
            { key: 'fans', label: 'Fans', live: state.fans, plan: plan.fans, installed: room.devices.fans, liveKw: state.fans * UNIT_KW.fan },
            { key: 'acs', label: 'AC units', live: state.acs, plan: plan.acs, installed: room.devices.acs, liveKw: state.acs * acKw * acFactor }
        ].filter(row => row.installed > 0)
    };
}

function pointsToPath(points) {
    if (!points.length) return '';
    const [first, ...rest] = points;
    return `M${first[0]} ${first[1]} ${rest.map(point => `L${point[0]} ${point[1]}`).join(' ')} Z`;
}

function loadStoredBoundaryPoints() {
    try {
        const stored = localStorage.getItem(BOUNDARY_STORAGE_KEY);
        if (!stored) return DEFAULT_SITE_BOUNDARY_POINTS;
        const parsed = JSON.parse(stored);
        const isValid = Array.isArray(parsed) && parsed.every(point => (
            Array.isArray(point) &&
            point.length === 2 &&
            point.every(value => Number.isFinite(value))
        ));
        return isValid ? parsed : DEFAULT_SITE_BOUNDARY_POINTS;
    } catch (error) {
        return DEFAULT_SITE_BOUNDARY_POINTS;
    }
}

function roomBox(room) {
    if (room.points) {
        const points = room.points.split(' ').map(point => point.split(',').map(Number));
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        return {
            cx: room.labelAt?.x ?? xs.reduce((a, b) => a + b, 0) / xs.length,
            cy: room.labelAt?.y ?? ys.reduce((a, b) => a + b, 0) / ys.length,
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys)
        };
    }
    return { cx: room.x + room.w / 2, cy: room.y + room.h / 2, w: room.w, h: room.h };
}

// Split a room name into at most two lines that fit the room width
function labelLines(text, maxWidth, fontSize) {
    const fits = s => s.length * fontSize * 0.56 <= maxWidth;
    if (fits(text)) return [text];
    const words = text.split(' ');
    let best = [text];
    let bestWidth = Infinity;
    for (let i = 1; i < words.length; i++) {
        const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
        const width = Math.max(...lines.map(l => l.length));
        if (width < bestWidth) { best = lines; bestWidth = width; }
    }
    return best;
}

function RoomAlertBadge({ room, alert }) {
    const { cx, cy, h } = roomBox(room);
    const triangle = 'M0 -9 L10 8 L-10 8 Z';
    if (h < 80) {
        return (
            <g className={`campus-alert-badge sev-${alert.severity}`} transform={`translate(${room.x + room.w - 22} ${cy})`}>
                <circle r="15" />
                <path d={triangle} className="campus-alert-badge-icon" />
            </g>
        );
    }
    const text = `+${alert.excessKw.toFixed(2)} kW`;
    const width = 42 + text.length * 10;
    const x = room.points ? cx - width / 2 : room.x + room.w - width - 10;
    const y = room.points ? cy - 85 : room.y + 10;
    return (
        <g className={`campus-alert-badge sev-${alert.severity}`} transform={`translate(${x} ${y})`}>
            <rect width={width} height="30" rx="6" />
            <path d={triangle} className="campus-alert-badge-icon" transform="translate(19 15) scale(0.7)" />
            <text x="33" y="21">{text}</text>
        </g>
    );
}

function RoomLabel({ room, state }) {
    const { cx, cy, w, h } = roomBox(room);
    const compact = h < 80;
    const level = occupancyLevel(state.present, room.seats);
    const on = state.lights + state.fans + state.acs > 0;
    const usableWidth = (room.points ? w * 0.8 : w) - 24;

    if (compact) {
        const name = room.short || room.name;
        return (
            <>
                <circle cx={room.x + 18} cy={cy} r="5" className={`campus-room-status ${on ? 'active' : ''}`} />
                <text x={cx} y={cy} className="campus-room-name compact" dominantBaseline="central">{name}</text>
            </>
        );
    }

    const fontSize = 24;
    const lineHeight = 28;
    const lines = labelLines(room.name, usableWidth, fontSize);
    const blockHeight = lines.length * lineHeight + 24;
    const top = cy - blockHeight / 2 + 20;
    const meta = level ? `${state.present}/${room.seats}` : ROOM_TYPES[room.type].label;

    return (
        <>
            <circle
                cx={room.points ? cx : room.x + 18}
                cy={room.points ? top - 30 : room.y + 18}
                r="6"
                className={`campus-room-status ${on ? 'active' : ''}`}
            />
            <text x={cx} y={top} className="campus-room-name">
                {lines.map((line, i) => <tspan key={i} x={cx} dy={i === 0 ? 0 : lineHeight}>{line}</tspan>)}
            </text>
            <text x={cx} y={top + (lines.length - 1) * lineHeight + 26} className="campus-room-meta">{meta}</text>
        </>
    );
}

function DeviceControl({ icon: Icon, title, units, count, installed, kw, onChange, note, disabled }) {
    if (!installed) {
        return (
            <div className="campus-device not-installed">
                <div className="campus-device-head">
                    <span className="campus-device-icon"><Icon /></span>
                    <div className="campus-device-text">
                        <strong>{title}</strong>
                        <small>{note}</small>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className={`campus-device ${count ? 'on' : ''}`}>
            <div className="campus-device-head">
                <span className="campus-device-icon"><Icon /></span>
                <div className="campus-device-text">
                    <strong>{title}</strong>
                    <small>{count} of {installed} {installed === 1 ? units[0] : units[1]} on</small>
                </div>
                <span className="campus-device-kw">{kw.toFixed(2)} kW</span>
            </div>
            <NumberedSlider value={count} max={installed} onChange={onChange} label={`${title} units on`} disabled={disabled} />
        </div>
    );
}

function CampusMap({ user }) {
    const isAdmin = user?.role === 'admin';
    const stageRef = useRef(null);
    const svgRef = useRef(null);
    const zoomRef = useRef(1);
    const panX = useMotionValue(0);
    const panY = useMotionValue(0);
    const [zoom, setZoomState] = useState(1);
    const [rooms, setRooms] = useState(FALLBACK_ROOMS);
    const [selectedId, setSelectedId] = useState(ROOM_SHAPES[0].id);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingBoundary, setIsEditingBoundary] = useState(false);
    const [activeBoundaryPoint, setActiveBoundaryPoint] = useState(null);
    const [boundaryPoints, setBoundaryPoints] = useState(loadStoredBoundaryPoints);
    const [draftBoundaryPoints, setDraftBoundaryPoints] = useState(boundaryPoints);
    const [query, setQuery] = useState('');
    const [roomStates, setRoomStates] = useState(defaultRoomStates);
    const [roomMeta, setRoomMeta] = useState({});
    const [syncFailed, setSyncFailed] = useState(false);
    const [assistants, setAssistants] = useState({});
    const openedOwnRoom = useRef(false);
    const roomsRef = useRef(rooms);
    const roomStatesRef = useRef(roomStates);
    const lastEditAt = useRef({});
    const saveTimers = useRef({});
    roomsRef.current = rooms;
    roomStatesRef.current = roomStates;

    const canControlRoom = (room) => ['admin', 'faculty'].includes(user?.role) || assistants[room.id]?.user_id === user?.id;

    const loadAssistants = useCallback(() => (
        api.get('/api/map/assistants').then(res => setAssistants(res.data)).catch(err => console.error('Campus map: could not load assistants', err))
    ), []);

    useEffect(() => {
        loadAssistants();
        const interval = setInterval(loadAssistants, ASSISTANT_SYNC_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadAssistants]);

    // A lab assistant lands on their own room
    useEffect(() => {
        if (openedOwnRoom.current || user?.role !== 'assistant') return;
        const own = Object.keys(assistants).find(id => assistants[id].user_id === user.id);
        if (own) {
            openedOwnRoom.current = true;
            setSelectedId(own);
        }
    }, [assistants, user]);

    // Room states are shared, so a change made on any computer reaches every open map.
    useEffect(() => {
        let cancelled = false;
        const sync = async () => {
            const startedAt = Date.now();
            try {
                const { data } = await api.get('/api/map/room-states');
                if (cancelled) return;
                // Skip rooms edited here since this request began: its answer is already out of date.
                const fresh = Object.entries(data).filter(([id]) => !saveTimers.current[id] && (lastEditAt.current[id] || 0) < startedAt);
                setRoomStates(prev => {
                    const next = { ...prev };
                    fresh.forEach(([id, { mode, present, lights, fans, acs, temp }]) => {
                        if (next[id]) next[id] = { ...next[id], mode, present, lights, fans, acs, temp };
                    });
                    return next;
                });
                setRoomMeta(prev => ({ ...prev, ...Object.fromEntries(fresh) }));
                setSyncFailed(false);
            } catch (error) {
                if (!cancelled) setSyncFailed(true);
            }
        };
        sync();
        const interval = setInterval(sync, ROOM_SYNC_INTERVAL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    // Sliders change many times per second: save a room once its values settle.
    const saveRoomSoon = (id) => {
        lastEditAt.current[id] = Date.now();
        setRoomMeta(prev => ({ ...prev, [id]: { ...prev[id], updated_by: user?.username, updated_at: new Date().toISOString() } }));
        clearTimeout(saveTimers.current[id]);
        saveTimers.current[id] = setTimeout(async () => {
            delete saveTimers.current[id];
            const room = roomsRef.current.find(item => item.id === id);
            const state = resolveState(room, roomStatesRef.current[id]);
            const alert = roomLoadAlert(room, state);
            const { mode, present, lights, fans, acs, temp } = state;
            try {
                const { data } = await api.put(`/api/map/room-states/${id}`, {
                    mode, present, lights, fans, acs, temp,
                    severity: alert?.severity ?? null,
                    excess_kw: alert?.excessKw ?? 0
                });
                lastEditAt.current[id] = Date.now();
                if (!saveTimers.current[id]) setRoomMeta(prev => ({ ...prev, [id]: data.room }));
                setSyncFailed(false);
            } catch (error) {
                setSyncFailed(true);
            }
        }, ROOM_SAVE_DELAY_MS);
    };

    // Room names, seats and devices are managed in the Rooms portal
    useEffect(() => {
        let cancelled = false;
        api.get('/api/classrooms')
            .then(res => { if (!cancelled) setRooms(buildRooms(res.data)); })
            .catch(err => console.error('Campus map: could not load rooms, showing drawing defaults', err));
        return () => { cancelled = true; };
    }, []);

    const activeRooms = useMemo(() => rooms.filter(room => !room.inactive), [rooms]);
    const selectedRoom = activeRooms.find(room => room.id === selectedId) || null;

    const visibleRooms = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return activeRooms;
        return activeRooms.filter(room => `${room.name} ${room.type} ${room.floor}`.toLowerCase().includes(normalized));
    }, [query, activeRooms]);

    const effective = useMemo(() => Object.fromEntries(
        rooms.map(room => [room.id, resolveState(room, roomStates[room.id])])
    ), [rooms, roomStates]);

    const selectedState = selectedRoom ? effective[selectedRoom.id] : null;
    const canControl = selectedRoom ? canControlRoom(selectedRoom) : false;
    const selectedEnergy = selectedRoom ? roomEnergy(selectedRoom, selectedState) : null;
    const activeBoundaryPoints = isEditingBoundary ? draftBoundaryPoints : boundaryPoints;
    const activeBoundaryPath = useMemo(() => pointsToPath(activeBoundaryPoints), [activeBoundaryPoints]);
    const buildingLoad = useMemo(() => activeRooms.reduce((sum, room) => sum + roomPower(room, effective[room.id]), 0), [activeRooms, effective]);
    const alerts = useMemo(() => sortAlerts(activeRooms.map(room => roomLoadAlert(room, effective[room.id])).filter(Boolean)), [activeRooms, effective]);
    const alertByRoom = useMemo(() => Object.fromEntries(alerts.map(alert => [alert.room.id, alert])), [alerts]);
    const selectedAlert = selectedRoom ? alertByRoom[selectedRoom.id] : null;
    const unacknowledgedAlerts = alerts.filter(alert => !isAcknowledged(alert, roomMeta[alert.room.id])).length;

    // ---------------------------------------------------------------- viewport
    const setZoom = (value) => {
        zoomRef.current = value;
        setZoomState(value);
    };

    const zoomAt = useCallback((nextZoom, originX, originY, smooth = true) => {
        const current = zoomRef.current;
        const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
        const ratio = clamped / current;
        const nx = originX - (originX - panX.get()) * ratio;
        const ny = originY - (originY - panY.get()) * ratio;
        zoomRef.current = clamped;
        setZoomState(clamped);
        if (smooth) {
            animate(panX, nx, { duration: 0.25, ease: 'easeOut' });
            animate(panY, ny, { duration: 0.25, ease: 'easeOut' });
        } else {
            panX.set(nx);
            panY.set(ny);
        }
    }, [panX, panY]);

    const fitToView = useCallback((smooth = true) => {
        const stage = stageRef.current;
        if (!stage) return;
        const { width, height } = stage.getBoundingClientRect();
        // Keep clear of the legend (top) and the zoom / hint bars (bottom)
        const pad = { x: 32, top: 64, bottom: 64 };
        const availH = height - pad.top - pad.bottom;
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((width - pad.x * 2) / MAP_CONTENT.w, availH / MAP_CONTENT.h)));
        const x = (width - MAP_CONTENT.w * z) / 2 - MAP_CONTENT.x * z;
        const y = pad.top + (availH - MAP_CONTENT.h * z) / 2 - MAP_CONTENT.y * z;
        setZoom(z);
        if (smooth) {
            animate(panX, x, { duration: 0.35, ease: 'easeOut' });
            animate(panY, y, { duration: 0.35, ease: 'easeOut' });
        } else {
            panX.set(x);
            panY.set(y);
        }
    }, [panX, panY]);

    const focusRoom = useCallback((room) => {
        setSelectedId(room.id);
        const stage = stageRef.current;
        if (!stage) return;
        const { width, height } = stage.getBoundingClientRect();
        const { cx, cy } = roomBox(room);
        const z = Math.max(zoomRef.current, 0.7);
        setZoom(z);
        // Centre in the area the alert list leaves free, so it never covers the room
        const alertList = stage.querySelector('.load-alert-center');
        const clearWidth = alertList && width >= 768 ? width - alertList.offsetWidth - 16 : width;
        animate(panX, clearWidth / 2 - cx * z, { duration: 0.4, ease: 'easeOut' });
        animate(panY, height / 2 - cy * z, { duration: 0.4, ease: 'easeOut' });
    }, [panX, panY]);

    // Fit once on load (after the inspector column has taken its width)
    useEffect(() => {
        const id = requestAnimationFrame(() => fitToView(false));
        return () => cancelAnimationFrame(id);
    }, [fitToView]);

    // Mouse-wheel zoom around the cursor; needs a non-passive listener to stop page scroll
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;
        const onWheel = (event) => {
            if (event.target.closest('.load-alert-center')) return; // let the alert list scroll
            event.preventDefault();
            const rect = stage.getBoundingClientRect();
            const factor = Math.exp(-event.deltaY * 0.0015);
            zoomAt(zoomRef.current * factor, event.clientX - rect.left, event.clientY - rect.top, false);
        };
        stage.addEventListener('wheel', onWheel, { passive: false });
        return () => stage.removeEventListener('wheel', onWheel);
    }, [zoomAt]);

    const zoomFromCenter = (delta) => {
        const rect = stageRef.current.getBoundingClientRect();
        zoomAt(zoomRef.current * delta, rect.width / 2, rect.height / 2);
    };

    // ---------------------------------------------------------------- room state
    const updateRoom = (patch) => {
        setRoomStates(prev => ({ ...prev, [selectedRoom.id]: { ...prev[selectedRoom.id], ...patch } }));
        saveRoomSoon(selectedRoom.id);
    };

    // Touching a device switches the room to Manual, starting from the current values
    const setDevice = (device, value) => {
        setRoomStates(prev => ({
            ...prev,
            [selectedRoom.id]: { ...resolveState(selectedRoom, prev[selectedRoom.id]), mode: 'manual', [device]: value }
        }));
        saveRoomSoon(selectedRoom.id);
    };

    const setMode = (mode) => {
        setRoomStates(prev => ({
            ...prev,
            [selectedRoom.id]: mode === 'auto'
                ? { ...prev[selectedRoom.id], mode: 'auto' }
                : { ...resolveState(selectedRoom, prev[selectedRoom.id]), mode: 'manual' }
        }));
        saveRoomSoon(selectedRoom.id);
    };

    const restoreRoomPlan = (room) => {
        setRoomStates(prev => ({ ...prev, [room.id]: { ...prev[room.id], mode: 'auto', temp: PLAN_TEMP } }));
        saveRoomSoon(room.id);
    };

    const acknowledgeAlert = async (alert) => {
        const id = alert.room.id;
        lastEditAt.current[id] = Date.now();
        setRoomMeta(prev => ({
            ...prev,
            [id]: { ...prev[id], ack_severity: alert.severity, ack_by: user?.username, ack_at: new Date().toISOString() }
        }));
        try {
            const { data } = await api.post(`/api/map/room-states/${id}/acknowledge`);
            lastEditAt.current[id] = Date.now();
            setRoomMeta(prev => ({ ...prev, [id]: data.room }));
            setSyncFailed(false);
        } catch (error) {
            setSyncFailed(true);
        }
    };

    const chartData = useMemo(() => {
        const power = selectedRoom ? roomPower(selectedRoom, selectedState) : 0;
        return {
            labels: ['08:00', '10:00', '12:00', '14:00', '16:00', 'Now'],
            datasets: [{
                data: [0.7, 0.86, 1.08, 0.94, 1.12, 1].map((factor) => Number((power * factor).toFixed(2))),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                pointBackgroundColor: '#10b981',
                pointBorderWidth: 0,
                pointRadius: 3,
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        };
    }, [selectedRoom, selectedState]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 250, // redraw once after the sidebar finishes animating, not every frame
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(148, 163, 184, 0.9)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { color: 'rgba(148, 163, 184, 0.9)', font: { size: 10 } } }
        }
    };

    // ---------------------------------------------------------------- boundary editor
    const toggleBoundaryEditor = () => {
        setDraftBoundaryPoints(boundaryPoints);
        setActiveBoundaryPoint(null);
        setIsEditingBoundary(prev => !prev);
    };

    const getSvgPoint = (event) => {
        const rect = svgRef.current.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * MAP_WIDTH);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * MAP_HEIGHT);
        return [
            Math.max(0, Math.min(MAP_WIDTH, x)),
            Math.max(0, Math.min(MAP_HEIGHT, y))
        ];
    };

    const handleBoundaryPointerMove = (event) => {
        if (!isEditingBoundary || activeBoundaryPoint === null || !svgRef.current) return;
        const nextPoint = getSvgPoint(event);
        setDraftBoundaryPoints(prev => prev.map((point, index) => (
            index === activeBoundaryPoint ? nextPoint : point
        )));
    };

    const confirmBoundary = () => {
        setBoundaryPoints(draftBoundaryPoints);
        localStorage.setItem(BOUNDARY_STORAGE_KEY, JSON.stringify(draftBoundaryPoints));
        setIsEditingBoundary(false);
        setActiveBoundaryPoint(null);
    };

    const resetBoundaryDraft = () => {
        setDraftBoundaryPoints(DEFAULT_SITE_BOUNDARY_POINTS);
        setActiveBoundaryPoint(null);
    };

    const copyBoundaryPath = async () => {
        const path = pointsToPath(draftBoundaryPoints);
        try {
            await navigator.clipboard.writeText(path);
        } catch (error) {
            console.info('Boundary path:', path);
        }
    };

    const spec = selectedRoom ? selectedRoom.devices : null;
    const level = selectedRoom ? occupancyLevel(selectedState.present, selectedRoom.seats) : null;
    const acKw = selectedRoom?.type === 'office' ? UNIT_KW.officeAc : UNIT_KW.ac;
    const acFactor = selectedState ? 1 + Math.max(0, 26 - selectedState.temp) * 0.06 : 1;

    return (
        <div className="campus-map-page fade-in">
            <div className="campus-map-shell">
                <div className="campus-map-toolbar">
                    <div>
                        <span className="campus-eyebrow"><FiLayers /> CS Department Digital Twin</span>
                        <h2>Interactive Facility Map</h2>
                    </div>
                    <div className="campus-map-actions">
                        <div className="campus-kpi" title="Sum of all rooms' current device load">
                            <FiZap />
                            <span>Building load</span>
                            <strong>{buildingLoad.toFixed(1)} kW</strong>
                        </div>
                        <button
                            type="button"
                            className={`campus-alert-kpi ${alerts.length ? `sev-${alerts[0].severity}` : 'clear'} ${unacknowledgedAlerts ? 'blink' : ''}`}
                            onClick={() => { if (alerts.length) focusRoom(alerts[0].room); }}
                            disabled={!alerts.length}
                            title={alerts.length ? 'Go to the most serious alert' : 'Every room is within its recommended plan'}
                            aria-live="polite"
                        >
                            {alerts.length ? <FiAlertTriangle /> : <FiCheckCircle />}
                            {alerts.length ? <span><strong>{alerts.length}</strong> load {alerts.length === 1 ? 'alert' : 'alerts'}</span> : <span>Within plan</span>}
                        </button>
                        <label className="campus-search">
                            <FiSearch />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => { if (event.key === 'Enter' && visibleRooms[0]) focusRoom(visibleRooms[0]); }}
                                placeholder="Search rooms"
                                aria-label="Search rooms"
                            />
                        </label>
                        <span
                            className={`campus-live-pill ${syncFailed ? 'failed' : ''}`}
                            title={syncFailed ? 'Could not reach the server. Recent changes may not be saved.' : 'Synced with all open maps'}
                        >
                            <span className="campus-live-dot" /> {syncFailed ? 'Sync paused' : 'Live'}
                        </span>
                        <button
                            type="button"
                            className={`campus-map-action-btn ${isEditingBoundary ? 'active' : ''}`}
                            onClick={toggleBoundaryEditor}
                        >
                            <FiEdit3 /> Outer Layer
                        </button>
                    </div>
                </div>

                <div className={`campus-map-workspace ${selectedRoom ? 'has-inspector' : ''}`}>
                    <div className={`campus-map-stage ${alerts.length ? 'has-alerts' : ''}`} ref={stageRef}>
                        <div className="campus-map-grid" />
                        <motion.div
                            className="campus-map-artboard"
                            style={{
                                width: MAP_WIDTH,
                                height: MAP_HEIGHT,
                                x: panX,
                                y: panY,
                                scale: zoom,
                                transformOrigin: '0 0'
                            }}
                            drag={!isEditingBoundary}
                            dragMomentum={false}
                            onDragStart={() => setIsDragging(true)}
                            onDragEnd={() => setIsDragging(false)}
                        >
                            <svg
                                ref={svgRef}
                                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                                width={MAP_WIDTH}
                                height={MAP_HEIGHT}
                                role="img"
                                aria-label="CS department map"
                                onPointerMove={handleBoundaryPointerMove}
                                onPointerUp={() => setActiveBoundaryPoint(null)}
                                onPointerLeave={() => setActiveBoundaryPoint(null)}
                            >
                                <defs>
                                    <linearGradient id="corridorFill" x1="0" x2="1">
                                        <stop offset="0%" stopColor="rgba(52, 211, 153, 0.04)" />
                                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0.08)" />
                                    </linearGradient>
                                    <pattern id="approachHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-29)">
                                        <line x1="0" y1="0" x2="0" y2="14" className="campus-hatch-line" />
                                    </pattern>
                                </defs>

                                <path className={`campus-site-boundary ${isEditingBoundary ? 'editing' : ''}`} d={activeBoundaryPath} />
                                <rect className="campus-map-boundary" x="204" y="58" width="624" height="1128" rx="10" />
                                <path className="campus-building-outline" d="M240 90 H470 V1155 H240 Z" />
                                <path className="campus-building-outline" d="M560 90 H790 V1155 H560 Z" />
                                {/* Lower area: approach strip and classroom-wing walls */}
                                <polygon className="campus-approach-area" points={APPROACH_AREA} />
                                <path className="campus-wing-walls" d={WING_WALLS} />
                                <polygon className="campus-wing-annex" points={WING_ANNEX} />
                                <rect className="campus-corridor" x="470" y="90" width="90" height="1065" rx="4" />

                                {ROUTES.map(route => (
                                    <g key={route.id}>
                                        <path className="campus-route-shadow" d={route.d} />
                                        <path className="campus-route" d={route.d} />
                                    </g>
                                ))}


                                {rooms.map(room => {
                                    if (room.inactive) {
                                        return (
                                            <g key={room.id} className="campus-room inactive">
                                                <title>{`${room.name} (deactivated in Rooms portal)`}</title>
                                                {room.points ? (
                                                    <polygon points={room.points} className="campus-room-shape" />
                                                ) : (
                                                    <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4" className="campus-room-shape" />
                                                )}
                                            </g>
                                        );
                                    }
                                    const isVisible = visibleRooms.some(item => item.id === room.id);
                                    const isSelected = selectedRoom?.id === room.id;
                                    const type = ROOM_TYPES[room.type];
                                    const alert = alertByRoom[room.id];
                                    const alertClass = alert
                                        ? `has-alert sev-${alert.severity} ${isAcknowledged(alert, roomMeta[room.id]) ? '' : 'blink'}`
                                        : '';

                                    return (
                                        <g
                                            key={room.id}
                                            className={`campus-room ${isSelected ? 'selected' : ''} ${isVisible ? '' : 'muted'} ${alertClass}`}
                                            onClick={() => setSelectedId(room.id)}
                                            style={{ '--room-color': type.color, '--room-fill': type.fill }}
                                        >
                                            <title>{room.name}</title>
                                            {room.points ? (
                                                <polygon points={room.points} className="campus-room-shape" />
                                            ) : (
                                                <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4" className="campus-room-shape" />
                                            )}
                                            <RoomLabel room={room} state={effective[room.id]} />
                                            {alert && <RoomAlertBadge room={room} alert={alert} />}
                                        </g>
                                    );
                                })}

                                <g className="campus-compass" transform="translate(110 110)">
                                    <circle r="34" />
                                    <path d="M0 -24 L9 6 L0 0 L-9 6 Z" />
                                    <text y="24">N</text>
                                </g>
                                <text className="campus-wing-label" transform="translate(300 1560) rotate(-29)">Main Entry</text>
                                <text className="campus-wing-label" x="1060" y="1308">Academic Wing</text>

                                {isEditingBoundary && activeBoundaryPoints.map((point, index) => (
                                    <g key={`boundary-point-${index}`} className="campus-boundary-point">
                                        <circle
                                            cx={point[0]}
                                            cy={point[1]}
                                            r="13"
                                            className={activeBoundaryPoint === index ? 'active' : ''}
                                            onPointerDown={(event) => {
                                                event.stopPropagation();
                                                event.currentTarget.setPointerCapture(event.pointerId);
                                                setActiveBoundaryPoint(index);
                                            }}
                                        />
                                        <text x={point[0]} y={point[1] - 20}>{index + 1}</text>
                                    </g>
                                ))}
                            </svg>
                        </motion.div>

                        <div className="campus-legend" aria-label="Legend">
                            {['lab', 'classroom', 'office', 'hall', 'utility'].map(key => (
                                <span key={key}><i style={{ background: ROOM_TYPES[key].color }} />{ROOM_TYPES[key].label}</span>
                            ))}
                            <span><i className="campus-legend-status" />Devices on</span>
                            <span><i className="campus-legend-alert" />Load alert</span>
                        </div>

                        <AlertCenter
                            alerts={alerts}
                            metaFor={id => roomMeta[id]}
                            selectedId={selectedRoom?.id}
                            canControlRoom={canControlRoom}
                            onView={focusRoom}
                            onAcknowledge={acknowledgeAlert}
                        />

                        <div className={`campus-drag-hint ${isDragging ? 'active' : ''}`}>
                            <FiNavigation /> {isEditingBoundary ? 'Drag boundary points' : 'Drag to pan · scroll to zoom'}
                        </div>

                        {isEditingBoundary && (
                            <div className="campus-boundary-editor">
                                <div>
                                    <strong>Outer Layer Edit</strong>
                                    <span>Drag handles, then confirm.</span>
                                </div>
                                <button type="button" onClick={confirmBoundary}><FiCheck /> Confirm</button>
                                <button type="button" onClick={resetBoundaryDraft}><FiRotateCcw /> Reset</button>
                                <button type="button" onClick={copyBoundaryPath}><FiCopy /> Copy Path</button>
                            </div>
                        )}

                        <div className="campus-zoom">
                            <button type="button" onClick={() => zoomFromCenter(1.2)} title="Zoom in" aria-label="Zoom in"><FiPlus /></button>
                            <span className="campus-zoom-value">{Math.round(zoom * 100)}%</span>
                            <button type="button" onClick={() => zoomFromCenter(1 / 1.2)} title="Zoom out" aria-label="Zoom out"><FiMinus /></button>
                            <span className="campus-zoom-sep" />
                            <button type="button" onClick={() => fitToView()} title="Fit map to view" aria-label="Fit map to view"><FiMaximize size={14} /></button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {selectedRoom && (
                            <motion.aside
                                key={selectedRoom.id}
                                className="campus-inspector"
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ duration: 0.18 }}
                            >
                                <div className="campus-inspector-header">
                                    <span className="campus-type-badge" style={{ '--room-color': ROOM_TYPES[selectedRoom.type].color }}>
                                        {ROOM_TYPES[selectedRoom.type].label}
                                    </span>
                                    <button type="button" onClick={() => setSelectedId(null)} title="Close panel" aria-label="Close panel"><FiX /></button>
                                </div>

                                <h3>{selectedRoom.name}</h3>
                                <p className="campus-inspector-sub">
                                    {selectedRoom.floor}{selectedRoom.seats ? ` · ${selectedRoom.seats} seats` : ''}
                                </p>

                                {selectedAlert && (
                                    <RoomAlertBanner
                                        alert={selectedAlert}
                                        meta={roomMeta[selectedRoom.id]}
                                        canControl={canControl}
                                        onAcknowledge={acknowledgeAlert}
                                        onRestore={restoreRoomPlan}
                                    />
                                )}

                                <div className="campus-kpis">
                                    <div>
                                        <small><FiUsers /> Occupancy</small>
                                        <strong>{level ? `${selectedState.present}/${selectedRoom.seats}` : '—'}</strong>
                                        {level && <span className={`campus-level tone-${level.tone}`}>{level.label} · {level.pct}%</span>}
                                    </div>
                                    <div>
                                        <small><FiZap /> Live load</small>
                                        <strong>{roomPower(selectedRoom, selectedState).toFixed(2)} kW</strong>
                                        <span className="campus-kpi-note">
                                            {selectedAlert ? 'Above recommended plan' : selectedState.mode === 'auto' ? 'Auto-optimised' : 'Manual override'}
                                        </span>
                                    </div>
                                </div>

                                <EnergyPanel energy={selectedEnergy} severity={selectedAlert?.severity} />

                                {ASSISTANT_ROOM_TYPES.includes(selectedRoom.type) && (
                                    <LabAssistantPanel
                                        room={selectedRoom}
                                        assistant={assistants[selectedRoom.id]}
                                        energy={selectedEnergy}
                                        isAdmin={isAdmin}
                                        isMine={assistants[selectedRoom.id]?.user_id === user?.id}
                                        onChanged={loadAssistants}
                                    />
                                )}

                                {selectedRoom.seats > 0 && (
                                    <section className="campus-panel">
                                        <div className="campus-panel-head">
                                            <span className="campus-section-title">Occupancy</span>
                                            <span className="campus-panel-value">{selectedState.present} students</span>
                                        </div>
                                        <NumberedSlider
                                            value={selectedState.present}
                                            max={selectedRoom.seats}
                                            onChange={(value) => updateRoom({ present: value })}
                                            label="Students present"
                                            tone="info"
                                            disabled={!canControl}
                                        />
                                    </section>
                                )}

                                <section className="campus-panel">
                                    <div className="campus-panel-head">
                                        <span className="campus-section-title">Device control</span>
                                        {selectedRoom.type !== 'utility' && (
                                            <div className="campus-segmented" role="group" aria-label="Control mode">
                                                {['auto', 'manual'].map(mode => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        className={selectedState.mode === mode ? 'active' : ''}
                                                        aria-pressed={selectedState.mode === mode}
                                                        disabled={!canControl}
                                                        onClick={() => setMode(mode)}
                                                    >
                                                        {mode === 'auto' ? 'Auto' : 'Manual'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {!canControl ? (
                                        <p className="campus-panel-hint">View only. This room&apos;s assistant, faculty and administrators can change devices.</p>
                                    ) : selectedRoom.type !== 'utility' && (
                                        <p className="campus-panel-hint">
                                            {selectedState.mode === 'auto'
                                                ? 'Devices follow occupancy. Drag any control to override.'
                                                : 'Manual override is active. Switch to Auto to follow occupancy again.'}
                                        </p>
                                    )}

                                    <DeviceControl
                                        icon={FiSun}
                                        title="Lighting"
                                        units={['light', 'lights']}
                                        count={selectedState.lights}
                                        installed={spec.lights}
                                        kw={selectedState.lights * UNIT_KW.light}
                                        onChange={(value) => setDevice('lights', value)}
                                        disabled={!canControl}
                                    />
                                    {selectedRoom.type !== 'utility' && (
                                        <>
                                            <DeviceControl
                                                icon={FiWind}
                                                title="Ventilation"
                                                units={['fan', 'fans']}
                                                count={selectedState.fans}
                                                installed={spec.fans}
                                                kw={selectedState.fans * UNIT_KW.fan}
                                                onChange={(value) => setDevice('fans', value)}
                                                disabled={!canControl}
                                            />
                                            <DeviceControl
                                                icon={TbAirConditioning}
                                                title="Cooling"
                                                units={['AC', 'ACs']}
                                                count={selectedState.acs}
                                                installed={spec.acs}
                                                kw={selectedState.acs * acKw * acFactor}
                                                onChange={(value) => setDevice('acs', value)}
                                                note="No air conditioning installed in classrooms"
                                                disabled={!canControl}
                                            />
                                        </>
                                    )}

                                    {selectedState.acs > 0 && (
                                        <div className="campus-device campus-temp">
                                            <div className="campus-device-head">
                                                <span className="campus-device-icon"><FiThermometer /></span>
                                                <div className="campus-device-text">
                                                    <strong>AC set-point</strong>
                                                    <small>Each degree lower adds ~6% cooling load</small>
                                                </div>
                                                <span className="campus-device-kw">{selectedState.temp} °C</span>
                                            </div>
                                            <NumberedSlider
                                                value={selectedState.temp}
                                                min={16}
                                                max={30}
                                                labelEvery={2}
                                                onChange={(value) => updateRoom({ temp: value })}
                                                label="AC temperature"
                                                unit=" °C"
                                                tone="info"
                                                disabled={!canControl}
                                            />
                                        </div>
                                    )}

                                    {selectedRoom.type === 'utility' && (
                                        <div className="campus-utility-note">
                                            Utility zone with lighting only. Status is tracked for operational visibility.
                                        </div>
                                    )}
                                </section>

                                <section className="campus-panel">
                                    <div className="campus-panel-head">
                                        <span className="campus-section-title">Estimated load profile</span>
                                        <span className="campus-panel-value"><FiActivity /> kW</span>
                                    </div>
                                    <div className="campus-chart-card">
                                        <Line data={chartData} options={chartOptions} />
                                    </div>
                                </section>

                                <section className="campus-panel campus-room-list">
                                    <div className="campus-panel-head">
                                        <span className="campus-section-title">{query ? 'Matching spaces' : 'All spaces'}</span>
                                        <span className="campus-panel-value">{visibleRooms.length}</span>
                                    </div>
                                    {visibleRooms.map(room => {
                                        const state = effective[room.id];
                                        const roomLevel = occupancyLevel(state.present, room.seats);
                                        return (
                                            <button
                                                key={room.id}
                                                type="button"
                                                className={room.id === selectedRoom.id ? 'active' : ''}
                                                onClick={() => focusRoom(room)}
                                            >
                                                <span className="campus-room-dot" style={{ background: ROOM_TYPES[room.type].color }} />
                                                <span className="campus-room-list-name">{room.name}</span>
                                                {alertByRoom[room.id] && (
                                                    <FiAlertTriangle className={`campus-room-list-alert sev-${alertByRoom[room.id].severity}`} aria-label={`${alertByRoom[room.id].severity} load alert`} />
                                                )}
                                                <span className="campus-room-list-meta">
                                                    {roomLevel ? `${roomLevel.pct}%` : '—'} · {roomPower(room, state).toFixed(1)} kW
                                                </span>
                                            </button>
                                        );
                                    })}
                                </section>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default CampusMap;
