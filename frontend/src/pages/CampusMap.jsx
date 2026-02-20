import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus, FiRotateCcw, FiLayers, FiInfo, FiX, FiCheckCircle, FiClock, FiUsers, FiCpu } from 'react-icons/fi';

const ROOMS = [
    // LEFT BLOCK (Top to Bottom)
    { id: 'L-TOILET', name: 'Boys Toilet', type: 'utility', dot: 'gray', coords: { x: 400, y: 100, w: 120, h: 50 }, capacity: '-', faculty: '-' },
    { id: 'L-SEC1', name: 'Section 1', type: 'classroom', dot: 'green', coords: { x: 400, y: 155, w: 120, h: 80 }, capacity: '50', faculty: 'Prof. A' },
    { id: 'L-SEC-LAST', name: 'Lab sec last, left', type: 'lab', dot: 'blue', coords: { x: 400, y: 240, w: 120, h: 80 }, capacity: '30 systems', labsPerDay: 5 },
    { id: 'L-BUSHRA-OFF', name: 'Ma’am Bushra Office', type: 'office', dot: 'yellow', coords: { x: 400, y: 325, w: 120, h: 50 }, faculty: 'Ma’am Bushra' },
    { id: 'L-SEC2', name: 'Section 2', type: 'classroom', dot: 'green', coords: { x: 400, y: 380, w: 120, h: 80 }, capacity: '50', faculty: 'Prof. B' },
    { id: 'L-LAB1', name: 'Lab first, right', type: 'lab', dot: 'blue', coords: { x: 400, y: 465, w: 120, h: 70 }, capacity: '30 systems', labsPerDay: 4 },

    // RIGHT BLOCK (Top to Bottom)
    { id: 'R-EMPTY', name: 'Empty Section', type: 'utility', dot: 'gray', coords: { x: 580, y: 100, w: 120, h: 40 }, capacity: '-', faculty: '-' },
    { id: 'R-STAIRS-TOP', name: 'Stairs', type: 'utility', dot: 'gray', coords: { x: 580, y: 145, w: 120, h: 40 }, capacity: '-', faculty: '-' },
    { id: 'R-SEMINAR', name: 'Seminar Room', type: 'seminar', dot: 'purple', coords: { x: 580, y: 190, w: 120, h: 60 }, capacity: '100', faculty: 'Common' },
    { id: 'R-DEV-LAB', name: 'Development Lab', type: 'lab', dot: 'blue', coords: { x: 580, y: 255, w: 120, h: 80 }, capacity: '40 systems', labsPerDay: 4 },
    { id: 'R-TA-OFF', name: 'T.A Office', type: 'office', dot: 'yellow', coords: { x: 580, y: 340, w: 120, h: 40 }, faculty: 'T.A' },
    { id: 'R-ANAM-OFF', name: 'Ma’am Anam Office', type: 'office', dot: 'yellow', coords: { x: 580, y: 385, w: 120, h: 50 }, faculty: 'Ma’am Anam' },
    { id: 'R-LAB1', name: 'lab first, right', type: 'lab', dot: 'blue', coords: { x: 580, y: 440, w: 120, h: 55 }, capacity: '30 systems', labsPerDay: 4 },

    // LOWER AREA (Irregular Polygons based on Image 1)
    { id: 'B-3RD-II', name: '3rd Year Class (Section II)', type: 'classroom', dot: 'green', points: "510,520 620,520 630,720 500,720", coords: { x: 505, y: 530, w: 110, h: 180 } },
    { id: 'B-4TH-I', name: '4th Year Class (Section I)', type: 'classroom', dot: 'green', points: "635,520 835,620 760,740 635,720", coords: { x: 640, y: 540, w: 180, h: 180 } },
    { id: 'B-3RD-I', name: '3rd Year Class (Section I)', type: 'classroom', dot: 'green', points: "845,460 960,480 910,640 825,620", coords: { x: 835, y: 470, w: 120, h: 160 } },
];

const CampusMap = () => {
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => { setZoom(1); setSelectedRoom(null); };

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

    return (
        <div className="map-view-container">
            <div className="mb-4">
                <h4 className="fw-bold m-0">Interactive Campus Map</h4>
                <p className="text-muted small m-0">Navigate department buildings and facility rooms</p>
            </div>

            <div className="map-canvas-wrapper overflow-hidden position-relative">
                <div
                    className="map-viewport"
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        background: 'transparent',
                        position: 'relative',
                        width: '100%',
                        height: '82vh'
                    }}
                >
                    <motion.div
                        className="map-content"
                        style={{
                            width: '2000px',
                            height: '2000px',
                            scale: zoom,
                            transformOrigin: 'top left'
                        }}
                        drag
                        dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
                    >
                        {/* Dot Grid Background */}
                        <div
                            className="dot-grid-pattern"
                            style={{
                                width: '100%',
                                height: '100%',
                                background: `radial-gradient(var(--text-secondary) 1px, transparent 1px)`,
                                backgroundSize: '30px 30px',
                                opacity: 0.18
                            }}
                        />

                        {/* Central Walking Path & Stairs */}
                        <rect x="525" y="80" width="50" height="480" fill="rgba(255,255,255,0.02)" />
                        <text x="550" y="300" fill="gray" fontSize="8" textAnchor="middle" style={{ opacity: 0.5, letterSpacing: '2px', textTransform: 'uppercase' }}>Walking Part</text>

                        {/* Upper Stairs */}
                        <g transform="translate(535, 120)">
                            <rect width="30" height="30" fill="rgba(255,255,255,0.08)" rx="4" />
                            <path d="M5,25 L5,15 L15,15 L15,5 L25,5" stroke="gray" fill="none" strokeWidth="2" />
                            <text y="-5" x="15" textAnchor="middle" fontSize="6" fill="gray">Stairs</text>
                        </g>

                        {/* Lower Stairs */}
                        <g transform="translate(535, 420)">
                            <rect width="30" height="30" fill="rgba(255,255,255,0.08)" rx="4" />
                            <path d="M5,25 L5,15 L15,15 L15,5 L25,5" stroke="gray" fill="none" strokeWidth="2" />
                            <text y="-5" x="15" textAnchor="middle" fontSize="6" fill="gray">Stairs</text>
                        </g>

                        <svg width="2000" height="2000" style={{ position: 'absolute', top: 0, left: 0 }}>
                            {ROOMS.map(room => (
                                <g
                                    key={room.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRoom(room); }}
                                    className={`room-group ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {room.points ? (
                                        <polygon
                                            points={room.points}
                                            className="room-shape"
                                        />
                                    ) : (
                                        <rect
                                            x={room.coords.x}
                                            y={room.coords.y}
                                            width={room.coords.w}
                                            height={room.coords.h}
                                            className="room-shape"
                                            rx="4"
                                        />
                                    )}
                                    <circle
                                        cx={room.coords.x + 10}
                                        cy={room.coords.y + 15}
                                        r="3"
                                        fill={getDotColor(room.dot)}
                                    />
                                    <text
                                        x={room.coords.x + 20}
                                        y={room.coords.y + 18}
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="500"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {room.name}
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </motion.div>

                    {/* Room Info Panel (Slide-in) */}
                    <AnimatePresence>
                        {selectedRoom && (
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="room-info-panel"
                            >
                                <div className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <div className="d-flex align-items-center gap-2">
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: getDotColor(selectedRoom.dot) }} />
                                            <span className="text-uppercase small fw-bold opacity-50">{selectedRoom.type}</span>
                                        </div>
                                        <button className="btn-close-map" onClick={() => setSelectedRoom(null)}>
                                            <FiX />
                                        </button>
                                    </div>

                                    <h3 className="fw-bold mb-1">{selectedRoom.name}</h3>
                                    <p className="text-muted small mb-4">Room ID: {selectedRoom.id}</p>

                                    <div className="info-stats-grid">
                                        <div className="stat-item">
                                            <FiUsers className="opacity-50" />
                                            <div>
                                                <small className="d-block opacity-50">Capacity</small>
                                                <span>{selectedRoom.capacity || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <FiClock className="opacity-50" />
                                            <div>
                                                <small className="d-block opacity-50">Availability</small>
                                                <span className="text-success">Ready</span>
                                            </div>
                                        </div>
                                        {selectedRoom.faculty && (
                                            <div className="stat-item">
                                                <FiCheckCircle className="opacity-50" />
                                                <div>
                                                    <small className="d-block opacity-50">Faculty</small>
                                                    <span>{selectedRoom.faculty}</span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedRoom.labsPerDay && (
                                            <div className="stat-item">
                                                <FiCpu className="opacity-50" />
                                                <div>
                                                    <small className="d-block opacity-50">Labs Active</small>
                                                    <span>{selectedRoom.labsPerDay} per day</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                        <small className="d-block opacity-50 mb-2">Real-time Insight</small>
                                        <p className="small m-0">This room is currently optimized for energy consumption based on ML schedules.</p>
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
