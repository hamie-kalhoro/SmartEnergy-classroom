import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiPlus, FiTrash2, FiBox, FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiEdit3, FiUsers, FiZap } from 'react-icons/fi';
import ConfirmModal from '../components/ConfirmModal';

function Classrooms({ user }) {
    const [classrooms, setClassrooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [importing, setImporting] = useState(false);
    const [newRoom, setNewRoom] = useState({ name: '', building: '', capacity: 50, lights: 8, acs: 2 });
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const fetchClassrooms = async () => {
        const res = await api.get('/api/classrooms');
        setClassrooms(res.data);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        await api.post('/api/classrooms', newRoom);
        fetchClassrooms();
        setShowModal(false);
        setNewRoom({ name: '', building: '', capacity: 50, lights: 8, acs: 2 });
    };

    const handleDelete = async (id) => {
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await api.delete(`/api/classrooms/${deleteTarget}`);
            fetchClassrooms();
        }
        setDeleteTarget(null);
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
        const template = 'name,building,capacity,lights,acs\nRoom 301,Block C,60,10,3\nLab 401,Block D,35,8,2';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'classrooms_template.csv';
        a.click();
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Smart <span className="text-gradient">Nodes</span>
                    </h2>
                    <p className="text-muted small m-0">Connected classrooms in the energy network</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-primary-dim" onClick={() => setShowBulkModal(true)}>
                        <FiUpload className="me-2" /> Import CSV
                    </button>
                    {user?.role === 'admin' && (
                        <button className="btn btn-gradient" onClick={() => setShowModal(true)}>
                            <FiPlus className="me-2" /> Add Node
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="row g-3 mb-5">
                {[
                    { label: 'Total Nodes', val: classrooms.length, icon: <FiBox />, color: '#00d26a' },
                    { label: 'Total Capacity', val: classrooms.reduce((a, c) => a + c.capacity, 0), icon: <FiUsers />, color: '#06b6d4' },
                    { label: 'Light Units', val: classrooms.reduce((a, c) => a + c.lights, 0), icon: <FiZap />, color: '#f59e0b' }
                ].map((s, i) => (
                    <div className="col-md-4" key={i}>
                        <div className="card d-flex flex-row align-items-center gap-4" style={{ padding: '1.25rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: `${s.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: s.color,
                                fontSize: '1.25rem'
                            }}>
                                {s.icon}
                            </div>
                            <div>
                                <h4 className="fw-bold mb-0">{s.val}</h4>
                                <span className="text-muted small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{s.label}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Classroom Grid */}
            <div className="row g-4">
                {classrooms.map(c => (
                    <div className="col-md-6 col-lg-4" key={c.id}>
                        <div className="card h-100" style={{ position: 'relative', overflow: 'visible' }}>
                            {/* Glow Effect */}
                            <div style={{
                                position: 'absolute',
                                top: '-1px',
                                left: '20%',
                                right: '20%',
                                height: '2px',
                                background: 'var(--gradient-primary)',
                                opacity: 0.6,
                                filter: 'blur(1px)'
                            }} />

                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div>
                                    <h5 className="fw-bold mb-1">{c.name}</h5>
                                    <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa' }}>
                                        Building {c.building}
                                    </span>
                                </div>
                                {user?.role === 'admin' && (
                                    <button className="btn p-2" onClick={() => handleDelete(c.id)} style={{ color: 'var(--text-muted)' }}>
                                        <FiTrash2 />
                                    </button>
                                )}
                            </div>

                            <div className="d-flex gap-4 mb-3">
                                <div>
                                    <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>CAPACITY</span>
                                    <span className="fw-bold">{c.capacity}</span>
                                </div>
                                <div>
                                    <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>LIGHTS</span>
                                    <span className="fw-bold">{c.lights}</span>
                                </div>
                                <div>
                                    <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>ACs</span>
                                    <span className="fw-bold">{c.acs}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="small text-muted">Node ID: {c.id}</span>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {classrooms.length === 0 && (
                    <div className="col-12">
                        <div className="card text-center py-5">
                            <FiBox className="mx-auto mb-3" style={{ fontSize: '3rem', opacity: 0.2 }} />
                            <p className="text-muted">No classrooms configured. Add your first node above.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content card" style={{ background: 'var(--bg-surface)' }}>
                            <div className="modal-header border-0">
                                <h5 className="fw-bold">Add Smart Node</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-8">
                                            <label className="form-label">Room Name</label>
                                            <input type="text" className="form-control" placeholder="Room 101" required onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Building</label>
                                            <input type="text" className="form-control" placeholder="A" required onChange={e => setNewRoom({ ...newRoom, building: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Capacity</label>
                                            <input type="number" className="form-control" value={newRoom.capacity} onChange={e => setNewRoom({ ...newRoom, capacity: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">Lights</label>
                                            <input type="number" className="form-control" value={newRoom.lights} onChange={e => setNewRoom({ ...newRoom, lights: e.target.value })} />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label">ACs</label>
                                            <input type="number" className="form-control" value={newRoom.acs} onChange={e => setNewRoom({ ...newRoom, acs: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0">
                                    <button type="submit" className="btn btn-gradient w-100 py-3">Add to Network</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content card" style={{ background: 'var(--bg-surface)' }}>
                            <div className="modal-header border-0">
                                <h5 className="fw-bold">Bulk Import Classrooms</h5>
                                <button className="btn-close btn-close-white" onClick={() => { setShowBulkModal(false); setImportResult(null); }}></button>
                            </div>
                            <div className="modal-body">
                                {importResult ? (
                                    <div className={`p-4 rounded-3 text-center ${importResult.success ? 'bg-success' : 'bg-danger'} bg-opacity-10`}>
                                        {importResult.success ? <FiCheckCircle className="text-success mb-2" style={{ fontSize: '2rem' }} /> : <FiAlertCircle className="text-danger mb-2" style={{ fontSize: '2rem' }} />}
                                        <div className={`fw-bold ${importResult.success ? 'text-success' : 'text-danger'}`}>{importResult.message}</div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleBulkImport}>
                                        <p className="text-muted small mb-3">Upload CSV with columns: <code>name, building, capacity, lights, acs</code></p>
                                        <input type="file" className="form-control mb-3" accept=".csv" onChange={e => setImportFile(e.target.files[0])} />
                                        <button type="button" className="btn btn-primary-dim w-100 mb-3" onClick={downloadTemplate}>
                                            <FiDownload className="me-2" /> Download Template
                                        </button>
                                        <button type="submit" className="btn btn-gradient w-100 py-3" disabled={!importFile || importing}>
                                            {importing ? 'Importing...' : 'Upload & Import'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                show={!!deleteTarget}
                type="warning"
                title="Deactivate Classroom?"
                message="This classroom node will be removed from the energy network."
                confirmText="Deactivate"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Classrooms;
