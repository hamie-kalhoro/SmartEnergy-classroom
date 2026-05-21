import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiPlus, FiMinus, FiRotateCcw, FiX, FiCheckCircle, FiClock, 
    FiUsers, FiCpu, FiWind, FiTv, FiZap, FiActivity 
} from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const ROOMS = [
    // LEFT BLOCK (Top to Bottom)
    { id: 'L-CS06', name: 'Lab CS-06', type: 'lab', dot: 'blue', coords: { x: 261, y: 129, w: 138, h: 152 }, capacity: '40 systems', labsPerDay: 4 },
    { id: 'L-CS04', name: 'Lab CS-04', type: 'lab', dot: 'blue', coords: { x: 261, y: 281, w: 138, h: 137 }, capacity: '40 systems', labsPerDay: 5 },
    { id: 'L-FARHAD', name: 'Dr. Farhad Office', type: 'office', dot: 'yellow', coords: { x: 261, y: 418, w: 138, h: 27 }, capacity: '1', faculty: 'Dr. Farhad' },
    { id: 'L-RCS-REG', name: 'RCS Registry', type: 'office', dot: 'yellow', coords: { x: 261, y: 445, w: 138, h: 30 }, capacity: '3', faculty: 'Staff' },
    { id: 'L-TOILET', name: 'Boys Toilet', type: 'utility', dot: 'gray', coords: { x: 261, y: 475, w: 138, h: 30 }, capacity: '-', faculty: '-' },
    { id: 'L-FILE-RM', name: 'File Room', type: 'utility', dot: 'gray', coords: { x: 261, y: 505, w: 138, h: 31 }, capacity: '-', faculty: '-' },
    { id: 'L-TEACHER-COMM', name: 'Teacher Common Room', type: 'office', dot: 'yellow', coords: { x: 261, y: 536, w: 138, h: 45 }, capacity: '10', faculty: 'Common' },
    { id: 'L-WAQAS', name: 'Waqas Office', type: 'office', dot: 'yellow', coords: { x: 261, y: 581, w: 138, h: 31 }, capacity: '1', faculty: 'Mr. Waqas' },
    { id: 'L-CS02', name: 'Lab CS-02', type: 'lab', dot: 'blue', coords: { x: 261, y: 612, w: 138, h: 195 }, capacity: '35 systems', labsPerDay: 4 },

    // RIGHT BLOCK (Top to Bottom)
    { id: 'R-CS05', name: 'Lab CS-05', type: 'lab', dot: 'blue', coords: { x: 462, y: 129, w: 137, h: 151 }, capacity: '40 systems', labsPerDay: 5 },
    { id: 'R-BUSHRA', name: 'Dr. Bushra Office', type: 'office', dot: 'yellow', coords: { x: 462, y: 280, w: 137, h: 27 }, capacity: '1', faculty: 'Dr. Bushra' },
    { id: 'R-CS03', name: 'Lab CS-03', type: 'lab', dot: 'blue', coords: { x: 462, y: 307, w: 137, h: 138 }, capacity: '40 systems', labsPerDay: 4 },
    { id: 'R-STORE', name: 'Store', type: 'utility', dot: 'gray', coords: { x: 462, y: 445, w: 137, h: 46 }, capacity: '-', faculty: '-' },
    { id: 'R-SEMINAR', name: 'Seminar Hall', type: 'seminar', dot: 'purple', coords: { x: 462, y: 491, w: 137, h: 122 }, capacity: '120', faculty: 'Common' },
    { id: 'R-NOMAN-OFF', name: 'Noman Rizwan Office', type: 'office', dot: 'yellow', coords: { x: 462, y: 613, w: 137, h: 32 }, capacity: '2', faculty: 'Mr. Noman Rizwan' },
    { id: 'R-CS01', name: 'Lab CS-01', type: 'lab', dot: 'blue', coords: { x: 462, y: 645, w: 137, h: 159 }, capacity: '35 systems', labsPerDay: 4 },

    // LOWER AREA (Polygons / Bottom structures)
    { id: 'B-REGION5', name: 'Region 5 (Classroom)', type: 'classroom', dot: 'green', coords: { x: 239, y: 992, w: 255, h: 69 }, capacity: '60', faculty: 'Common' },
    { id: 'B-REGION4', name: 'Region 4 (Classroom)', type: 'classroom', dot: 'green', coords: { x: 163, y: 1054, w: 333, h: 194 }, capacity: '80', faculty: 'Common' },
    { id: 'B-REGION3', name: 'Region 3 (Classroom)', type: 'classroom', dot: 'green', coords: { x: 628, y: 843, w: 72, h: 77 }, capacity: '50', faculty: 'Common' },
];

const CampusMap = () => {
    const [zoom, setZoom] = useState(0.8);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);

    // Initial cybernetic status state for each room
    const [roomStates, setRoomStates] = useState(() => {
        const states = {};
        ROOMS.forEach(room => {
            const isOffice = room.type === 'office';
            const isUtility = room.type === 'utility';
            states[room.id] = {
                lights: !isUtility,
                fans: !isUtility && !isOffice,
                acs: room.type === 'lab' || room.type === 'seminar',
                temp: 22,
                powerOverride: null
            };
        });
        return states;
    });

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2.5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.45));
    const handleReset = () => { setZoom(0.8); setSelectedRoom(null); };

    const getDotColor = (type) => {
        switch (type) {
            case 'blue': return '#3b82f6';
            case 'yellow': return '#eab308';
            case 'green': return '#22c55e';
            case 'purple': return '#a855f7';
            case 'gray': return '#94a3b8';
            default: return '#94a3b8';
        }
    };

    // Live power consumption calculator (SCADA style)
    const calculatePower = (roomId) => {
        const state = roomStates[roomId];
        if (!state) return 0;
        let base = 0.05; // background system overhead
        if (state.lights) base += 0.15;
        if (state.fans) base += 0.35;
        if (state.acs) {
            // Lower temperature draws more power
            const tempDiff = Math.max(0, 30 - state.temp);
            base += 1.2 + (tempDiff * 0.08);
        }
        return parseFloat(base.toFixed(2));
    };

    // Toggle specific device status
    const toggleDevice = (roomId, device) => {
        setRoomStates(prev => ({
            ...prev,
            [roomId]: {
                ...prev[roomId],
                [device]: !prev[roomId][device]
            }
        }));
    };

    // Adjust temperature slider
    const handleTempChange = (roomId, value) => {
        setRoomStates(prev => ({
            ...prev,
            [roomId]: {
                ...prev[roomId],
                temp: parseInt(value)
            }
        }));
    };

    // Chart JS settings for live energy timeline
    const buildChartData = (roomId) => {
        const currentPower = calculatePower(roomId);
        // Generate values around currentPower
        const values = [
            parseFloat((currentPower * 0.85).toFixed(2)),
            parseFloat((currentPower * 0.95).toFixed(2)),
            parseFloat((currentPower * 1.05).toFixed(2)),
            parseFloat((currentPower * 0.9).toFixed(2)),
            parseFloat((currentPower * 1.0).toFixed(2)),
            parseFloat((currentPower * 1.1).toFixed(2)),
            currentPower
        ];

        return {
            labels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 'Active'],
            datasets: [
                {
                    label: 'Power (kW)',
                    data: values,
                    borderColor: '#00d26a',
                    backgroundColor: 'rgba(0, 210, 106, 0.06)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#00d26a',
                    fill: true,
                    tension: 0.4
                }
            ]
        };
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 9 } } }
        }
    };

    return (
        <div className="map-view-container">
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h4 className="fw-bold m-0 text-gradient">Cybernetic Campus & SCADA Map</h4>
                    <p className="text-muted small m-0">Live dynamic telemetry, telemetry state, and interactive controls</p>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill d-flex align-items-center gap-2">
                        <FiActivity className="fan-spinning" /> Live Telemetry Synced
                    </span>
                </div>
            </div>

            <div 
                className="map-canvas-wrapper overflow-hidden position-relative border border-secondary-subtle rounded-4" 
                style={{ background: '#141414' }}
            >
                {/* Cyber Matrix Background */}
                <div className={`matrix-grid-pattern ${isDragging ? 'dragging' : ''}`} />

                <div
                     className="map-viewport"
                     style={{
                         cursor: isDragging ? 'grabbing' : 'default',
                         background: 'transparent',
                         position: 'relative',
                         width: '100%',
                         height: '80vh'
                     }}
                >
                    <motion.div
                        className="map-content"
                        style={{
                            width: '1043px',
                            height: '1341px',
                            scale: zoom,
                            transformOrigin: 'top left'
                        }}
                        drag
                        dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                    >
                        {/* Interactive SVG Neon Vector Outline Layer */}
                        <svg width="1043" height="1341" viewBox="0 0 1043 1341" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'auto' }}>
                            {/* Main Left Block Outline */}
                            <path fill="rgba(255, 255, 255, 0.02)" stroke="#00d26a" strokeWidth="4" filter="drop-shadow(0 0 8px rgba(0,210,106,0.3))" d="m257.251 125.46 111.842.142q12.187.028 24.374-.098c3.672-.06 8.4-1.633 10.344 1.317l.112.704c-.998 9.962-.729 20.207-.73 30.241l.019 42.975.002 136.883.055 340.184c-.012 54.083.915 111.095-.037 164.925-5.207-.034-29.293-.598-32.461.708l-2.121-.708c-1.147.262-1.86.136-2.141.938-1.484 4.255-.306 11.431-.617 15.851-1.092-1.526-.176-11.347-.748-15.042l-1.217-.803c-3.468-2.138-94.702-.928-106.683-.916z"/>
                            {/* Main Right Block Outline */}
                            <path fill="rgba(255, 255, 255, 0.02)" stroke="#00d26a" strokeWidth="4" filter="drop-shadow(0 0 8px rgba(0,210,106,0.3))" d="M456.364 127.239c1.213-1.27 1.471-2.232 3.219-2.168 23.44.858 46.968.587 70.426.56l49.44-.07c6.606-.011 16.645-.432 22.843-.12l-.006 466.329.01 155.93.052 50.085c.01 7.975.362 18.783-.111 26.546l.18.795c-.003 2.45.139 9.928-.234 11.96l.475 1.563-.368 3.456a49 49 0 0 1-5.185.681c-14.022.655-33.223.061-47.57.043l-92.515-.033c-.252-15.95.695-35.336.702-52.036l.082-438.306-.03-145.761c-.003-24.65.038-49.461-.054-74.117-.01-2.705.12-3.09-1.294-4.894z"/>
                            
                            {/* Rooms (Hidden bounding boxes for click interaction and hover styling) */}
                            {ROOMS.map(room => (
                                <g
                                    key={room.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                                    className={`room-group ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <rect
                                        x={room.coords.x}
                                        y={room.coords.y}
                                        width={room.coords.w}
                                        height={room.coords.h}
                                        className="scada-room-shape"
                                        rx="6"
                                    />
                                </g>
                            ))}
                        </svg>

                        {/* Absolutely Positioned Dynamic Glassmorphic SCADA Badges */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '1043px', height: '1341px', pointerEvents: 'none', zIndex: 3 }}>
                            {ROOMS.map(room => {
                                const state = roomStates[room.id] || { lights: false, fans: false, acs: false, temp: 22 };
                                const isSelected = selectedRoom?.id === room.id;
                                const power = calculatePower(room.id);
                                const isUtility = room.type === 'utility';

                                return (
                                    <div
                                        key={room.id}
                                        className={`room-badge-overlay ${isSelected ? 'selected-badge' : ''}`}
                                        style={{
                                            left: `${room.coords.x + 6}px`,
                                            top: `${room.coords.y + 6}px`,
                                            width: `${room.coords.w - 12}px`,
                                            height: `${room.coords.h - 12}px`,
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                                    >
                                        {/* Room Name Header */}
                                        <div className="d-flex justify-content-between align-items-start w-100">
                                            <div className="d-flex flex-column">
                                                <span className="fw-bold text-white small" style={{ fontSize: '10px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100px' }}>
                                                    {room.name}
                                                </span>
                                                <span className="text-muted" style={{ fontSize: '8px', textTransform: 'uppercase' }}>
                                                    {room.type}
                                                </span>
                                            </div>
                                            <span className={`device-dot ${power > 0.1 ? 'active-glow' : 'inactive'}`} />
                                        </div>

                                        {/* Dynamic Indicators */}
                                        {!isUtility && (
                                            <div className="d-flex justify-content-between align-items-center w-100 mt-1">
                                                {/* Mini quick-read device indicators */}
                                                <div className="d-flex gap-2">
                                                    <FiTv className={state.lights ? 'light-glowing' : 'opacity-25'} style={{ fontSize: '10px', transition: 'all 0.3s' }} />
                                                    <FiWind className={state.fans ? 'fan-spinning text-info' : 'opacity-25'} style={{ fontSize: '10px', transition: 'all 0.3s' }} />
                                                    <FiCpu className={state.acs ? 'ac-pulsing' : 'opacity-25'} style={{ fontSize: '10px', transition: 'all 0.3s' }} />
                                                </div>
                                                <div className="d-flex flex-column text-end">
                                                    <span className="fw-semibold text-success" style={{ fontSize: '9px' }}>
                                                        {power} kW
                                                    </span>
                                                    {state.acs && (
                                                        <span className="text-info" style={{ fontSize: '8px' }}>
                                                            {state.temp}°C
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Cybernetic Room Info Panel — Stitch-aligned Liquid Glass */}
                    <AnimatePresence>
                        {selectedRoom && (
                            <motion.div
                                initial={{ x: '110%', opacity: 0, scale: 0.97 }}
                                animate={{ x: 0, opacity: 1, scale: 1 }}
                                exit={{ x: '110%', opacity: 0, scale: 0.97 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                                className="room-info-panel"
                            >
                                {/* Stitch top-edge shimmer line */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: '10%', right: '10%', height: '1px',
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                    borderRadius: '100%',
                                    pointerEvents: 'none',
                                    zIndex: 0
                                }} />

                                <div className="p-4" style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Header row — type pill + close button */}
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <span className="type-pill">
                                            <span className="dot" style={{ background: getDotColor(selectedRoom.dot) }} />
                                            {selectedRoom.type}
                                        </span>
                                        <button className="btn-close-map" onClick={() => setSelectedRoom(null)}>
                                            <FiX />
                                        </button>
                                    </div>

                                    {/* Room name + node address */}
                                    <h3>{selectedRoom.name}</h3>
                                    <p className="node-address">Node Address: 0x{selectedRoom.id}</p>

                                    {/* ── Device Controls ── */}
                                    {selectedRoom.type !== 'utility' ? (
                                        <div className="mb-4">
                                            <span className="section-label">SCADA Device Overrides</span>
                                            <div className="device-section">
                                                {/* Lighting */}
                                                <div className="device-row">
                                                    <span className="device-row-label">Lighting Systems</span>
                                                    <div className="form-check form-switch m-0">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={roomStates[selectedRoom.id]?.lights || false}
                                                            onChange={() => toggleDevice(selectedRoom.id, 'lights')}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Fans */}
                                                <div className="device-row">
                                                    <span className="device-row-label">Ventilation Fans</span>
                                                    <div className="form-check form-switch m-0">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={roomStates[selectedRoom.id]?.fans || false}
                                                            onChange={() => toggleDevice(selectedRoom.id, 'fans')}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* AC */}
                                                <div className="device-row">
                                                    <span className="device-row-label">Air Conditioning (HVAC)</span>
                                                    <div className="form-check form-switch m-0">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={roomStates[selectedRoom.id]?.acs || false}
                                                            onChange={() => toggleDevice(selectedRoom.id, 'acs')}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Temperature slider — only when AC is on */}
                                                {roomStates[selectedRoom.id]?.acs && (
                                                    <div className="temp-section">
                                                        <div className="temp-label">
                                                            <span>AC Temperature</span>
                                                            <span>{roomStates[selectedRoom.id]?.temp}°C</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            className="form-range w-100"
                                                            min="16"
                                                            max="28"
                                                            value={roomStates[selectedRoom.id]?.temp || 22}
                                                            onChange={(e) => handleTempChange(selectedRoom.id, e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <small className="section-label">Utility Area</small>
                                            <p className="small m-0" style={{ color: 'rgba(255,255,255,0.4)' }}>No electronic overrides configured for this facility.</p>
                                        </div>
                                    )}

                                    {/* ── Stat Cards ── */}
                                    <div className="info-stats-grid mb-4">
                                        <div className="stat-item">
                                            <FiUsers style={{ color: '#38bdf8', fontSize: 20 }} />
                                            <div>
                                                <small>Capacity</small>
                                                <span style={{ color: '#fff' }}>{selectedRoom.capacity || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <FiZap style={{ color: '#4ade80', fontSize: 20 }} />
                                            <div>
                                                <small>Active Draw</small>
                                                <span style={{ color: '#4ade80' }}>{calculatePower(selectedRoom.id)} kW</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Power Timeline Chart ── */}
                                    {selectedRoom.type !== 'utility' && (
                                        <div className="mb-4">
                                            <span className="section-label">Power Timeline · 24h</span>
                                            <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <Line data={buildChartData(selectedRoom.id)} options={chartOptions} />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── ML Scheduling Note ── */}
                                    <div className="p-3 rounded-3" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)' }}>
                                        <small className="section-label" style={{ color: '#4ade80' }}>Automated Scheduling</small>
                                        <p className="small m-0" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                                            ML algorithms control this room's devices to optimise energy savings by up to 35%.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Vertical Zoom Controls */}
                    <div className="map-zoom-controls">
                        <button onClick={handleZoomIn} title="Zoom In"><FiPlus /></button>
                        <button onClick={handleZoomOut} title="Zoom Out"><FiMinus /></button>
                        <button onClick={handleReset} title="Reset View"><FiRotateCcw size={14} /></button>
                    </div>

                    <div className="zoom-badge">
                        {Math.round(zoom * 100)}%
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampusMap;
