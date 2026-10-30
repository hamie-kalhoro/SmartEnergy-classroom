import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import {
    FiPlus, FiTrash2, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiEdit3, FiUsers, FiZap,
    FiWind, FiSun, FiSearch, FiGrid, FiMonitor, FiBookOpen, FiMic, FiBriefcase, FiArchive, FiMapPin
} from 'react-icons/fi';
import { TbAirConditioning } from 'react-icons/tb';
import DynamicLoader from '../components/DynamicLoader';
import ConfirmModal from '../components/ConfirmModal';
import Portal from '../components/Portal';
import { ROOM_TYPES, ROOM_TYPE_KEYS, DEVICE_SPECS, DEVICE_MODELS, UNIT_KW, acKwFor, connectedLoad } from '../data/roomCatalog';

const TYPE_ICONS = { lab: FiMonitor, classroom: FiBookOpen, hall: FiMic, office: FiBriefcase, utility: FiArchive };
const BUILDINGS = ['Main Block', 'Lower Academic Wing'];
const TEACHING_HOURS = 7; // 08:00 - 15:00 morning shift

const emptyRoom = (type = 'classroom') => ({ name: '', type, building: BUILDINGS[0], capacity: 40, ...DEVICE_SPECS[type] });

const formatKw = (kw) => `${kw.toFixed(kw >= 10 ? 1 : 2)} kW`;

const DEVICES = [
    { key: 'lights', load: 'lights', label: 'Lights', icon: FiSun, tone: '#f59e0b', model: () => DEVICE_MODELS.light },
    { key: 'fans', load: 'fans', label: 'Fans', icon: FiWind, tone: '#06b6d4', model: () => DEVICE_MODELS.fan },
    { key: 'acs', load: 'acs', label: 'ACs', icon: TbAirConditioning, tone: '#8b5cf6', model: (type) => (type === 'office' ? DEVICE_MODELS.officeAc : DEVICE_MODELS.ac) }
];

function RoomCard({ room, isAdmin, onEdit, onDelete }) {
    const type = ROOM_TYPES[room.type] ? room.type : 'classroom';
    const TypeIcon = TYPE_ICONS[type];
    const load = connectedLoad(type, room);
    const pct = (part) => (load.total ? Math.round((part / load.total) * 100) : 0);

    return (
        <article className="rooms-card" style={{ '--type-color': ROOM_TYPES[type].color }}>
            <header className="rooms-card-head">
                <span className="rooms-type-icon"><TypeIcon /></span>
                <div className="rooms-card-title">
                    <h3 title={room.name}>{room.name}</h3>
                    <div className="rooms-card-meta">
                        <span className="rooms-type-badge">{ROOM_TYPES[type].label}</span>
                        <span className="rooms-card-building"><FiMapPin /> {room.building || 'Unassigned'}</span>
                    </div>
                </div>
                {isAdmin && (
                    <div className="rooms-card-actions">
                        <button type="button" onClick={() => onEdit(room)} title="Edit room" aria-label={`Edit ${room.name}`}><FiEdit3 /></button>
                        <button type="button" className="danger" onClick={() => onDelete(room)} title="Deactivate room" aria-label={`Deactivate ${room.name}`}><FiTrash2 /></button>
                    </div>
                )}
            </header>

            <div className="rooms-card-hero">
                <div>
                    <span className="rooms-label">Connected load</span>
                    <strong className="rooms-hero-value">{load.total.toFixed(2)}<small>kW</small></strong>
                    <span className="rooms-hero-note">Up to {(load.total * TEACHING_HOURS).toFixed(1)} kWh per {TEACHING_HOURS}-hour shift</span>
                </div>
                <div className="rooms-seats">
                    <span className="rooms-label">Seats</span>
                    <strong>{room.capacity || '—'}</strong>
                </div>
            </div>

            <div className="rooms-device-grid">
                {DEVICES.map(({ key, load: part, label, icon: Icon, tone, model }) => {
                    const count = room[key] || 0;
                    const spec = model(type);
                    return (
                        <div
                            key={key}
                            className={`rooms-device-tile ${count ? '' : 'is-empty'}`}
                            style={{ '--tone': tone }}
                            title={count ? `${count} × ${spec.detail} = ${formatKw(load[part])} (${pct(load[part])}% of room load)` : `No ${label.toLowerCase()} installed`}
                        >
                            <div className="rooms-device-top">
                                <span className="rooms-device-icon"><Icon /></span>
                                <strong>{count}</strong>
                            </div>
                            <span className="rooms-device-label">{label}</span>
                            <span className="rooms-device-model">{count ? spec.name : 'None installed'}</span>
                            <span className="rooms-device-model">{count ? spec.rating : ' '}</span>
                            <span className="rooms-device-kw">{count ? formatKw(load[part]) : '—'}</span>
                        </div>
                    );
                })}
            </div>

            <div className="rooms-share-bar" role="img" aria-label={`Load share: lights ${pct(load.lights)}%, fans ${pct(load.fans)}%, AC ${pct(load.acs)}%`}>
                {DEVICES.map(({ key, load: part, tone }) => (
                    <span key={key} style={{ width: `${pct(load[part])}%`, background: tone }} />
                ))}
            </div>

            <footer className="rooms-card-foot">
                <span>Node #{room.id}</span>
                <span className="rooms-status"><i />Active</span>
            </footer>
        </article>
    );
}

function RoomForm({ room, setRoom, isNew }) {
    const set = (field, value) => setRoom({ ...room, [field]: value });
    const setNumber = (field) => (e) => set(field, Math.max(0, parseInt(e.target.value, 10) || 0));
    const load = connectedLoad(room.type, room);

    const changeType = (type) => {
        // New rooms start from the standard device fit-out of their type
        setRoom(isNew ? { ...room, type, ...DEVICE_SPECS[type] } : { ...room, type });
    };

    return (
        <div className="row g-3">
            <div className="col-md-7">
                <label className="form-label">Room name</label>
                <input type="text" className="form-control" placeholder="Lab CS-07" value={room.name} required onChange={e => set('name', e.target.value)} />
            </div>
            <div className="col-md-5">
                <label className="form-label">Type</label>
                <select className="form-select" value={room.type} onChange={e => changeType(e.target.value)}>
                    {ROOM_TYPE_KEYS.map(key => <option key={key} value={key}>{ROOM_TYPES[key].label}</option>)}
                </select>
            </div>
            <div className="col-md-7">
                <label className="form-label">Building</label>
                <input type="text" className="form-control" list="room-buildings" value={room.building || ''} required onChange={e => set('building', e.target.value)} />
                <datalist id="room-buildings">
                    {BUILDINGS.map(b => <option key={b} value={b} />)}
                </datalist>
            </div>
            <div className="col-md-5">
                <label className="form-label">Seats</label>
                <input type="number" min="0" className="form-control" value={room.capacity} onChange={setNumber('capacity')} />
            </div>
            <div className="col-4">
                <label className="form-label">Lights</label>
                <input type="number" min="0" className="form-control" value={room.lights} onChange={setNumber('lights')} />
            </div>
            <div className="col-4">
                <label className="form-label">Fans</label>
                <input type="number" min="0" className="form-control" value={room.fans} onChange={setNumber('fans')} />
            </div>
            <div className="col-4">
                <label className="form-label">ACs</label>
                <input type="number" min="0" className="form-control" value={room.acs} onChange={setNumber('acs')} />
            </div>
            <div className="col-12">
                <div className="rooms-form-load">
                    <FiZap />
                    <span>Connected load <strong>{formatKw(load.total)}</strong></span>
                    <small>{room.lights || 0} × {UNIT_KW.light * 1000} W + {room.fans || 0} × {UNIT_KW.fan * 1000} W + {room.acs || 0} × {acKwFor(room.type)} kW</small>
                </div>
            </div>
        </div>
    );
}

function Classrooms({ user }) {
    const isAdmin = user?.role === 'admin';
    const [classrooms, setClassrooms] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [newRoom, setNewRoom] = useState(null);
    const [editRoom, setEditRoom] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/api/classrooms');
            setClassrooms(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setFetching(false);
        }
    };

    const sorted = useMemo(() => (
        [...classrooms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    ), [classrooms]);

    const typeCounts = useMemo(() => (
        classrooms.reduce((acc, c) => ({ ...acc, [c.type]: (acc[c.type] || 0) + 1 }), {})
    ), [classrooms]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sorted.filter(c => (
            (typeFilter === 'all' || c.type === typeFilter)
            && (!q || `${c.name} ${c.building} ${ROOM_TYPES[c.type]?.label}`.toLowerCase().includes(q))
        ));
    }, [sorted, typeFilter, query]);

    const totals = useMemo(() => classrooms.reduce((acc, c) => ({
        seats: acc.seats + (c.capacity || 0),
        lights: acc.lights + (c.lights || 0),
        fans: acc.fans + (c.fans || 0),
        acs: acc.acs + (c.acs || 0),
        load: acc.load + connectedLoad(c.type, c).total
    }), { seats: 0, lights: 0, fans: 0, acs: 0, load: 0 }), [classrooms]);

    const saveRoom = async (e, room, request, close) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');
        try {
            await request(room);
            await fetchClassrooms();
            close();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Could not save the room. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await api.delete(`/api/classrooms/${deleteTarget.id}`);
            fetchClassrooms();
        }
        setDeleteTarget(null);
    };

    const closeBulk = () => {
        setShowBulkModal(false);
        setImportResult(null);
        setImportFile(null);
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        if (!importFile) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const res = await api.post('/api/classrooms/bulk-import', formData);
            setImportResult(res.data);
            if (res.data.success) fetchClassrooms();
        } catch (err) {
            setImportResult({ success: false, message: err.response?.data?.message || 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'name,type,building,capacity,lights,fans,acs\nLab CS-07,lab,Main Block,40,12,6,4\nDr. Ahmed Office,office,Main Block,1,2,1,1';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rooms_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = [
        { label: 'Rooms', val: classrooms.length, icon: <FiGrid />, color: '#00f59b' },
        { label: 'Seats', val: totals.seats, icon: <FiUsers />, color: '#06b6d4' },
        { label: 'Lights', val: totals.lights, icon: <FiSun />, color: '#f59e0b' },
        { label: 'Fans', val: totals.fans, icon: <FiWind />, color: '#38bdf8' },
        { label: 'AC units', val: totals.acs, icon: <TbAirConditioning />, color: '#8b5cf6' },
        { label: 'Total load', val: `${totals.load.toFixed(1)} kW`, icon: <FiZap />, color: '#10b981' }
    ];

    const roomModal = (title, room, setRoom, isNew, request, submitText) => (
        <Portal>
            <div className="modal show">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="fw-bold mb-0">{title}</h5>
                            <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={() => { setRoom(null); setFormError(''); }}></button>
                        </div>
                        <form onSubmit={(e) => saveRoom(e, room, request, () => setRoom(null))}>
                            <div className="modal-body text-start">
                                <RoomForm room={room} setRoom={setRoom} isNew={isNew} />
                                {formError && <div className="rooms-form-error"><FiAlertCircle /> {formError}</div>}
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-lg btn-gradient w-100" disabled={loading}>
                                    {loading ? <DynamicLoader size={24} color="var(--loader-on-button, var(--bg-deep))" /> : submitText}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Portal>
    );

    return (
        <div className="fade-in rooms-page">
            <div className="rooms-header">
                <div>
                    <span className="rooms-eyebrow">CS Department · Campus map</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Rooms &amp; <span className="text-gradient">Devices</span>
                    </h2>
                    <p className="text-muted small m-0">Labs, classrooms, offices and service rooms with their installed lighting, fans and air conditioning.</p>
                </div>
                {isAdmin && (
                    <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-primary-dim" onClick={() => setShowBulkModal(true)}>
                            <FiUpload className="me-2" /> Import CSV
                        </button>
                        <button className="btn btn-gradient" onClick={() => setNewRoom(emptyRoom())}>
                            <FiPlus className="me-2" /> Add Room
                        </button>
                    </div>
                )}
            </div>

            <div className="rooms-stats">
                {stats.map(s => (
                    <div className={`rooms-stat ${fetching ? 'skeleton' : ''}`} key={s.label}>
                        {!fetching && (
                            <>
                                <span className="rooms-stat-icon" style={{ color: s.color, background: `${s.color}1a` }}>{s.icon}</span>
                                <div>
                                    <strong>{s.val}</strong>
                                    <small>{s.label}</small>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="rooms-toolbar">
                <div className="rooms-filters" role="tablist" aria-label="Filter by room type">
                    {['all', ...ROOM_TYPE_KEYS].map(key => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={typeFilter === key}
                            className={typeFilter === key ? 'active' : ''}
                            onClick={() => setTypeFilter(key)}
                        >
                            {key !== 'all' && <i style={{ background: ROOM_TYPES[key].color }} />}
                            {key === 'all' ? 'All rooms' : ROOM_TYPES[key].plural}
                            <span>{key === 'all' ? classrooms.length : (typeCounts[key] || 0)}</span>
                        </button>
                    ))}
                </div>
                <label className="rooms-search">
                    <FiSearch />
                    <input type="search" placeholder="Search rooms or buildings" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search rooms" />
                </label>
            </div>

            {fetching ? (
                <div className="rooms-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => <div className="rooms-card skeleton" key={i} style={{ minHeight: '340px' }} />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="rooms-empty">
                    <FiGrid />
                    <p>{classrooms.length ? 'No rooms match this filter.' : 'No rooms configured yet.'}</p>
                </div>
            ) : (
                ROOM_TYPE_KEYS.map(key => {
                    const group = visible.filter(c => c.type === key);
                    if (!group.length) return null;
                    const groupLoad = group.reduce((sum, c) => sum + connectedLoad(c.type, c).total, 0);
                    return (
                        <section className="rooms-group" key={key} style={{ '--type-color': ROOM_TYPES[key].color }}>
                            <div className="rooms-group-head">
                                <h4><i />{ROOM_TYPES[key].plural}<span>{group.length}</span></h4>
                                <small>{groupLoad.toFixed(1)} kW connected</small>
                            </div>
                            <div className="rooms-grid">
                                {group.map(c => (
                                    <RoomCard key={c.id} room={c} isAdmin={isAdmin} onEdit={(room) => setEditRoom({ ...room })} onDelete={setDeleteTarget} />
                                ))}
                            </div>
                        </section>
                    );
                })
            )}

            <p className="rooms-footnote">
                Connected load is the draw with every installed device on: LED tubes {UNIT_KW.light * 1000} W, ceiling fans {UNIT_KW.fan * 1000} W,
                split ACs {UNIT_KW.ac} kW ({UNIT_KW.officeAc} kW in offices). Max / day assumes full load across the {TEACHING_HOURS}-hour morning shift.
            </p>

            {newRoom && roomModal('Add Room', newRoom, setNewRoom, true, (room) => api.post('/api/classrooms', room), 'Add Room')}
            {editRoom && roomModal('Edit Room', editRoom, setEditRoom, false, (room) => api.put(`/api/classrooms/${room.id}`, room), 'Save Changes')}

            {showBulkModal && (
                <Portal>
                    <div className="modal show">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="fw-bold mb-0">Import Rooms</h5>
                                    <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={closeBulk}></button>
                                </div>
                                <div className="modal-body">
                                    {importResult ? (
                                        <div className={`p-4 rounded-3 text-center ${importResult.success ? 'bg-success' : 'bg-danger'} bg-opacity-10`}>
                                            {importResult.success ? <FiCheckCircle className="text-success mb-2" style={{ fontSize: '2rem' }} /> : <FiAlertCircle className="text-danger mb-2" style={{ fontSize: '2rem' }} />}
                                            <div className={`fw-bold ${importResult.success ? 'text-success' : 'text-danger'}`}>{importResult.message}</div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleBulkImport}>
                                            <p className="text-muted small mb-3">Upload a CSV with columns: <code>name, type, building, capacity, lights, fans, acs</code>. Type is one of lab, classroom, hall, office or utility.</p>
                                            <input type="file" className="form-control mb-3" accept=".csv" onChange={e => setImportFile(e.target.files[0])} />
                                            <button type="button" className="btn btn-primary-dim w-100 mb-3" onClick={downloadTemplate}>
                                                <FiDownload className="me-2" /> Download Template
                                            </button>
                                            <button type="submit" className="btn btn-lg btn-gradient w-100" disabled={!importFile || importing}>
                                                {importing ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : 'Upload & Import'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            <ConfirmModal
                show={!!deleteTarget}
                type="warning"
                title="Deactivate room?"
                message={`${deleteTarget?.name || 'This room'} will be removed from the portal and the energy network.`}
                confirmText="Deactivate"
                tone="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Classrooms;
