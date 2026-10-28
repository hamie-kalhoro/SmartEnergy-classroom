import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiActivity,
    FiCheck,
    FiCopy,
    FiCpu,
    FiEdit3,
    FiLayers,
    FiMinus,
    FiNavigation,
    FiPlus,
    FiRotateCcw,
    FiSearch,
    FiThermometer,
    FiTv,
    FiUsers,
    FiWind,
    FiX,
    FiZap
} from 'react-icons/fi';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const MAP_WIDTH = 1120;
const MAP_HEIGHT = 1720;
const BOUNDARY_STORAGE_KEY = 'campusMap.siteBoundaryPoints.v1';
const DEFAULT_SITE_BOUNDARY_POINTS = [
    [205, 58],
    [828, 58],
    [828, 1160],
    [854, 1214],
    [988, 1260],
    [1042, 1296],
    [1016, 1442],
    [1044, 1488],
    [958, 1650],
    [710, 1656],
    [520, 1632],
    [96, 1538],
    [60, 1402],
    [355, 1228],
    [355, 1160],
    [205, 1160]
];

const ROOM_TYPES = {
    lab: { label: 'Lab', color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.16)' },
    office: { label: 'Office', color: '#fbbf24', fill: 'rgba(251, 191, 36, 0.14)' },
    utility: { label: 'Utility', color: '#94a3b8', fill: 'rgba(148, 163, 184, 0.13)' },
    hall: { label: 'Hall', color: '#a78bfa', fill: 'rgba(167, 139, 250, 0.16)' },
    classroom: { label: 'Classroom', color: '#34d399', fill: 'rgba(52, 211, 153, 0.15)' },
    circulation: { label: 'Route', color: '#22c55e', fill: 'rgba(34, 197, 94, 0.07)' }
};

const ROOMS = [
    { id: 'cs-06', name: 'Lab CS-06', short: 'Lab CS-06', type: 'lab', x: 240, y: 90, w: 230, h: 205, capacity: '40 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'cs-04', name: 'Lab CS-04', short: 'Lab CS-04', type: 'lab', x: 240, y: 335, w: 230, h: 175, capacity: '40 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'dr-fawad', name: 'Dr. Fawad Office', short: 'Dr. Fawad', type: 'office', x: 240, y: 510, w: 230, h: 38, capacity: '1 faculty', floor: 'Main block', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'bscs-registrar', name: 'BSCS Registrar', short: 'BSCS Registrar', type: 'office', x: 240, y: 548, w: 230, h: 38, capacity: '3 staff', floor: 'Main block', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'boys-toilet', name: 'Boys Toilet', short: 'Boys Toilet', type: 'utility', x: 240, y: 586, w: 230, h: 38, capacity: 'Utility', floor: 'Main block', devices: { lights: true, fans: false, acs: false, temp: 25 } },
    { id: 'files-room', name: 'Files Room', short: 'Files Room', type: 'utility', x: 240, y: 624, w: 230, h: 52, capacity: 'Archive', floor: 'Main block', devices: { lights: true, fans: false, acs: false, temp: 25 } },
    { id: 'teachers-common', name: "Teachers' Common Room", short: "Teachers' Common Room", type: 'office', x: 240, y: 676, w: 230, h: 72, capacity: '10 faculty', floor: 'Main block', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'ai-lab', name: 'AI Lab', short: 'AI Lab', type: 'lab', x: 240, y: 748, w: 230, h: 165, capacity: '35 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 21 } },
    { id: 'cs-02', name: 'Lab CS-02', short: 'Lab CS-02', type: 'lab', x: 240, y: 950, w: 230, h: 205, capacity: '35 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },

    { id: 'cs-05', name: 'Lab CS-05', short: 'Lab CS-05', type: 'lab', x: 560, y: 90, w: 230, h: 205, capacity: '40 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'dr-bushra', name: 'Dr. Bushra Office', short: 'Dr. Bushra', type: 'office', x: 560, y: 295, w: 230, h: 40, capacity: '1 faculty', floor: 'Main block', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'cs-03', name: 'Lab CS-03', short: 'Lab CS-03', type: 'lab', x: 560, y: 335, w: 230, h: 175, capacity: '40 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'store', name: 'Store', short: 'Store', type: 'utility', x: 560, y: 510, w: 230, h: 52, capacity: 'Storage', floor: 'Main block', devices: { lights: true, fans: false, acs: false, temp: 25 } },
    { id: 'seminar-hall', name: 'Seminar Hall', short: 'Seminar Hall', type: 'hall', x: 560, y: 562, w: 230, h: 165, capacity: '120 seats', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 21 } },
    { id: 'anam-lab', name: "Madam Anam's Lab", short: "Madam Anam's Lab", type: 'lab', x: 560, y: 727, w: 230, h: 185, capacity: 'Lab space', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'cs-01', name: 'Lab CS-01', short: 'Lab CS-01', type: 'lab', x: 560, y: 950, w: 230, h: 205, capacity: '35 systems', floor: 'Main block', devices: { lights: true, fans: true, acs: true, temp: 22 } },
    { id: 'third-year-i', name: '3rd Year Section I', short: '3rd Year Section I', type: 'classroom', points: '520,1342 650,1342 650,1632 520,1632', capacity: 'Classroom', floor: 'Lower academic wing', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'final-year-i', name: 'Final Year Section I', short: 'Final Year Section I', type: 'classroom', points: '924,1254 1042,1296 1016,1442 900,1390', capacity: 'Classroom', floor: 'Lower academic wing', devices: { lights: true, fans: true, acs: false, temp: 24 } },
    { id: 'third-year-ii', name: '3rd Year Section II', short: '3rd Year Section II', type: 'classroom', points: '682,1510 834,1408 1044,1488 958,1650 710,1656', capacity: 'Classroom', floor: 'Lower academic wing', devices: { lights: true, fans: true, acs: false, temp: 24 } }
];

const ROUTES = [
    { id: 'central-corridor', d: 'M515 90 L515 1155', label: 'Central corridor' },
    { id: 'left-entry-drop', d: 'M355 1155 L355 1260', label: 'Main entry drop' },
    { id: 'left-approach-out', d: 'M355 1260 L96 1412 L126 1518 L540 1298', label: 'Left approach' },
    { id: 'right-academic-approach', d: 'M790 1155 L854 1214 L838 1260 L988 1260', label: 'Academic wing approach' },
    { id: 'lower-academic-link', d: 'M838 1260 L760 1438 L682 1510', label: 'Lower academic link' }
];

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

function roomCenter(room) {
    if (room.points) {
        const points = room.points.split(' ').map(point => point.split(',').map(Number));
        return {
            x: points.reduce((sum, point) => sum + point[0], 0) / points.length,
            y: points.reduce((sum, point) => sum + point[1], 0) / points.length
        };
    }
    return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
}

function CampusMap() {
    const [zoom, setZoom] = useState(0.72);
    const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditingBoundary, setIsEditingBoundary] = useState(false);
    const [activeBoundaryPoint, setActiveBoundaryPoint] = useState(null);
    const [boundaryPoints, setBoundaryPoints] = useState(loadStoredBoundaryPoints);
    const [draftBoundaryPoints, setDraftBoundaryPoints] = useState(boundaryPoints);
    const [query, setQuery] = useState('');
    const svgRef = useRef(null);
    const [roomStates, setRoomStates] = useState(() => {
        const state = {};
        ROOMS.forEach(room => {
            state[room.id] = room.devices;
        });
        return state;
    });

    const visibleRooms = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return ROOMS;
        return ROOMS.filter(room => `${room.name} ${room.type} ${room.floor}`.toLowerCase().includes(normalized));
    }, [query]);

    const selectedState = selectedRoom ? roomStates[selectedRoom.id] : null;
    const activeBoundaryPoints = isEditingBoundary ? draftBoundaryPoints : boundaryPoints;
    const activeBoundaryPath = useMemo(() => pointsToPath(activeBoundaryPoints), [activeBoundaryPoints]);

    const calculatePower = (roomId) => {
        const state = roomStates[roomId];
        if (!state) return 0;
        let total = 0.04;
        if (state.lights) total += 0.18;
        if (state.fans) total += 0.32;
        if (state.acs) total += 1.15 + Math.max(0, 26 - state.temp) * 0.07;
        return Number(total.toFixed(2));
    };

    const toggleDevice = (device) => {
        setRoomStates(prev => ({
            ...prev,
            [selectedRoom.id]: {
                ...prev[selectedRoom.id],
                [device]: !prev[selectedRoom.id][device]
            }
        }));
    };

    const handleTempChange = (value) => {
        setRoomStates(prev => ({
            ...prev,
            [selectedRoom.id]: {
                ...prev[selectedRoom.id],
                temp: Number(value)
            }
        }));
    };

    const chartData = useMemo(() => {
        const power = selectedRoom ? calculatePower(selectedRoom.id) : 0;
        return {
            labels: ['08:00', '10:00', '12:00', '14:00', '16:00', 'Now'],
            datasets: [{
                data: [0.7, 0.86, 1.08, 0.94, 1.12, 1].map((factor) => Number((power * factor).toFixed(2))),
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.08)',
                pointBackgroundColor: '#34d399',
                pointBorderWidth: 0,
                pointRadius: 3,
                borderWidth: 2,
                tension: 0.45,
                fill: true
            }]
        };
    }, [selectedRoom, roomStates]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.42)', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: 'rgba(255,255,255,0.42)', font: { size: 10 } } }
        }
    };

    const resetView = () => {
        setZoom(0.72);
        setSelectedRoom(ROOMS[0]);
        setQuery('');
    };

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

    return (
        <div className="campus-map-page fade-in">
            <div className="campus-map-shell">
                <div className="campus-map-toolbar">
                    <div>
                        <span className="campus-eyebrow"><FiLayers /> CS Department Digital Twin</span>
                        <h2>Interactive Facility Map</h2>
                    </div>
                    <div className="campus-map-actions">
                        <label className="campus-search">
                            <FiSearch />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search room"
                            />
                        </label>
                        <span className="campus-live-pill"><FiActivity /> Live</span>
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
                    <div className="campus-map-stage">
                        <div className="campus-map-grid" />
                        <motion.div
                            className="campus-map-artboard"
                            style={{
                                width: MAP_WIDTH,
                                height: MAP_HEIGHT,
                                scale: zoom,
                                transformOrigin: 'top left'
                            }}
                            drag={!isEditingBoundary}
                            dragMomentum={false}
                            dragConstraints={{ left: -650, right: 240, top: -820, bottom: 120 }}
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
                                    <filter id="roomGlow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.35" />
                                    </filter>
                                    <linearGradient id="corridorFill" x1="0" x2="1">
                                        <stop offset="0%" stopColor="rgba(52, 211, 153, 0.04)" />
                                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0.08)" />
                                    </linearGradient>
                                </defs>

                                <path className={`campus-site-boundary ${isEditingBoundary ? 'editing' : ''}`} d={activeBoundaryPath} />
                                <rect className="campus-map-boundary" x="204" y="58" width="624" height="1128" rx="10" />
                                <path className="campus-building-outline" d="M240 90 H470 V1155 H240 Z" />
                                <path className="campus-building-outline" d="M560 90 H790 V1155 H560 Z" />
                                <path className="campus-approach-outline" d="M92 1392 L355 1238 L548 1288 L126 1536 Z" />
                                <path className="campus-academic-outline" d="M790 1155 L854 1214 L988 1260 L1042 1296 L1016 1442 L1044 1488 L958 1650 L710 1656 L682 1510 L760 1438 L838 1260 Z" />
                                <path className="campus-building-outline" d="M520 1342 H650 V1632 H520 Z" />
                                <path className="campus-building-outline" d="M924 1254 L1042 1296 L1016 1442 L900 1390 Z" />
                                <path className="campus-building-outline" d="M682 1510 L834 1408 L1044 1488 L958 1650 L710 1656 Z" />
                                <rect className="campus-corridor" x="470" y="90" width="90" height="1065" rx="4" />

                                {ROUTES.map(route => (
                                    <g key={route.id}>
                                        <path className="campus-route-shadow" d={route.d} />
                                        <path className="campus-route" d={route.d} />
                                    </g>
                                ))}

                                <path className="campus-lower-route" d="M96 1412 L126 1518 L540 1298" />
                                <path className="campus-lower-route" d="M854 1214 L838 1260 L988 1260" />

                                {ROOMS.map(room => {
                                    const isVisible = visibleRooms.some(item => item.id === room.id);
                                    const isSelected = selectedRoom?.id === room.id;
                                    const type = ROOM_TYPES[room.type];
                                    const center = roomCenter(room);
                                    const state = roomStates[room.id];
                                    const active = state.lights || state.fans || state.acs;

                                    return (
                                        <g
                                            key={room.id}
                                            className={`campus-room ${isSelected ? 'selected' : ''} ${isVisible ? '' : 'muted'}`}
                                            onClick={() => setSelectedRoom(room)}
                                            style={{ '--room-color': type.color, '--room-fill': type.fill }}
                                        >
                                            {room.points ? (
                                                <polygon points={room.points} className="campus-room-shape" />
                                            ) : (
                                                <rect x={room.x} y={room.y} width={room.w} height={room.h} rx="4" className="campus-room-shape" />
                                            )}
                                            <circle cx={center.x - 76} cy={center.y - 36} r="5" className={active ? 'campus-room-status active' : 'campus-room-status'} />
                                            <text x={center.x} y={center.y - 8} className="campus-room-name">{room.short}</text>
                                            <text x={center.x} y={center.y + 20} className="campus-room-meta">{type.label}</text>
                                        </g>
                                    );
                                })}

                                <text className="campus-compass-label" x="88" y="90">N</text>
                                <text className="campus-wing-label" x="334" y="1230">Main Entry</text>
                                <text className="campus-wing-label" x="940" y="1218">Academic Wing</text>
                                <text className="campus-wing-label" x="822" y="1460">Lower Classrooms</text>

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

                        <div className={`campus-drag-hint ${isDragging ? 'active' : ''}`}>
                            <FiNavigation /> {isEditingBoundary ? 'Drag boundary points' : 'Drag map to pan'}
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

                        <div className="map-zoom-controls campus-zoom-controls">
                            <button onClick={() => setZoom(prev => Math.min(prev + 0.12, 1.55))} title="Zoom In"><FiPlus /></button>
                            <button onClick={() => setZoom(prev => Math.max(prev - 0.12, 0.44))} title="Zoom Out"><FiMinus /></button>
                            <button onClick={resetView} title="Reset View"><FiRotateCcw size={14} /></button>
                        </div>
                        <div className="zoom-badge campus-zoom-badge">{Math.round(zoom * 100)}%</div>
                    </div>

                    <AnimatePresence mode="wait">
                        {selectedRoom && (
                            <motion.aside
                                key={selectedRoom.id}
                                className="campus-inspector"
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 24 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="campus-inspector-header">
                                    <span style={{ '--room-color': ROOM_TYPES[selectedRoom.type].color }}>
                                        {ROOM_TYPES[selectedRoom.type].label}
                                    </span>
                                    <button onClick={() => setSelectedRoom(null)} title="Close panel"><FiX /></button>
                                </div>

                                <h3>{selectedRoom.name}</h3>
                                <p>{selectedRoom.floor}</p>

                                <div className="campus-inspector-stats">
                                    <div>
                                        <FiUsers />
                                        <small>Capacity</small>
                                        <strong>{selectedRoom.capacity}</strong>
                                    </div>
                                    <div>
                                        <FiZap />
                                        <small>Active Draw</small>
                                        <strong>{calculatePower(selectedRoom.id)} kW</strong>
                                    </div>
                                </div>

                                {selectedRoom.type !== 'utility' ? (
                                    <div className="campus-control-panel">
                                        <div className="campus-section-title">Device Controls</div>
                                        {[
                                            ['lights', 'Lighting', FiTv],
                                            ['fans', 'Ventilation', FiWind],
                                            ['acs', 'Cooling', FiCpu]
                                        ].map(([key, label, Icon]) => (
                                            <button
                                                key={key}
                                                className={selectedState?.[key] ? 'active' : ''}
                                                onClick={() => toggleDevice(key)}
                                            >
                                                <Icon />
                                                <span>{label}</span>
                                                <strong>{selectedState?.[key] ? 'On' : 'Off'}</strong>
                                            </button>
                                        ))}
                                        {selectedState?.acs && (
                                            <div className="campus-temp-control">
                                                <div>
                                                    <span><FiThermometer /> AC Temperature</span>
                                                    <strong>{selectedState.temp} deg C</strong>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="16"
                                                    max="28"
                                                    value={selectedState.temp}
                                                    onChange={(event) => handleTempChange(event.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="campus-utility-note">
                                        Utility zone with limited automation. Lighting status is tracked for operational visibility.
                                    </div>
                                )}

                                <div className="campus-section-title">Power Trend</div>
                                <div className="campus-chart-card">
                                    <Line data={chartData} options={chartOptions} />
                                </div>

                                <div className="campus-room-list">
                                    <div className="campus-section-title">Nearby Spaces</div>
                                    {visibleRooms.slice(0, 6).map(room => (
                                        <button
                                            key={room.id}
                                            className={room.id === selectedRoom.id ? 'active' : ''}
                                            onClick={() => setSelectedRoom(room)}
                                        >
                                            <span style={{ background: ROOM_TYPES[room.type].color }} />
                                            {room.name}
                                        </button>
                                    ))}
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default CampusMap;
