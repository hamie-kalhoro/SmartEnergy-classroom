import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiUpload, FiDownload, FiPlus, FiTrash2, FiCalendar, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';
import ConfirmModal from '../components/ConfirmModal';

function Timetable({ user }) {
    const [schedules, setSchedules] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [newEntry, setNewEntry] = useState({
        classroom_id: '', day: 'Monday', time: '08:00', subject: '',
        type: 'theory', teacher: '', email: '', attendance: 75
    });
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchSchedules(), fetchClassrooms()]);
            } catch (err) {
                console.error("Failed to load initial data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await api.get('/api/timetable');
            setSchedules(res.data);
        } catch (err) {
            console.error("Failed to fetch schedules:", err);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/api/classrooms');
            setClassrooms(res.data);
        } catch (err) {
            console.error("Failed to fetch classrooms:", err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        await api.post('/api/timetable', newEntry);
        fetchSchedules();
        setShowModal(false);
        setNewEntry({ classroom_id: '', day: 'Monday', time: '08:00', subject: '', type: 'theory', teacher: '', email: '', attendance: 75 });
    };

    const handleDelete = async (id) => {
        setDeleteTarget(id);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await api.delete(`/api/timetable/${deleteTarget}`);
            fetchSchedules();
        }
        setDeleteTarget(null);
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await api.post('/api/timetable/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportResult(res.data);
            if (res.data.success) {
                fetchSchedules();
            }
        } catch (err) {
            setImportResult({ success: false, message: err.response?.data?.message || 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'classroom_id,day,time,subject,type,teacher,email,attendance\n1,Monday,08:00,Database Systems,theory,Dr. Smith,smith@uni.edu,85\n2,Tuesday,10:00,AI Lab,lab,Prof. Khan,khan@uni.edu,65';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable_template.csv';
        a.click();
    };

    return (
        <div className="fade-in">
            <div className="d-flex justify-content-between align-items-center mb-5">
                <div>
                    <h2 className="fw-bold tracking-tight">Academic Timetable</h2>
                    <p className="text-muted small m-0">Manage class schedules for energy optimization</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-primary-dim" onClick={() => setShowImportModal(true)}>
                        <FiUpload className="me-2" /> Bulk Import
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <FiPlus className="me-2" /> Add Schedule
                    </button>
                </div>
            </div>

            <div className="card border-0 shadow-sm">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Classroom</th>
                                <th>Day</th>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Type</th>
                                <th>Teacher</th>
                                <th>Attendance</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        <td className="py-3"><div className="skeleton skeleton-text w-75"></div></td>
                                        <td><div className="skeleton skeleton-text w-50"></div></td>
                                        <td><div className="skeleton skeleton-text w-50"></div></td>
                                        <td><div className="skeleton skeleton-text w-75"></div></td>
                                        <td><div className="skeleton skeleton-bar w-25"></div></td>
                                        <td><div className="skeleton skeleton-text w-50"></div></td>
                                        <td><div className="skeleton skeleton-text w-25"></div></td>
                                        <td></td>
                                    </tr>
                                ))
                            ) : schedules.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted py-5">
                                        No schedules yet. Add manually or bulk import a CSV.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map(s => (
                                    <tr key={s.id}>
                                        <td className="fw-bold text-primary">{s.classroom}</td>
                                        <td className="fw-bold">{s.day}</td>
                                        <td>{s.time}</td>
                                        <td className="fw-bold">{s.subject}</td>
                                        <td>
                                            <span className={`badge ${s.type === 'lab' ? 'bg-info' : s.type === 'seminar' ? 'bg-warning' : 'bg-primary'} bg-opacity-10 text-${s.type === 'lab' ? 'info' : s.type === 'seminar' ? 'warning' : 'primary'}`}>
                                                {s.type}
                                            </span>
                                        </td>
                                        <td className="fw-bold">{s.teacher}</td>
                                        <td className="fw-bold text-primary">{s.attendance}%</td>
                                        <td>
                                            <button className="btn btn-sm text-danger" onClick={() => handleDelete(s.id)}>
                                                <FiTrash2 />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Single Entry Modal */}
            {showModal && (
                <div className="modal show">
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="fw-bold mb-0">Add Schedule Entry</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Classroom</label>
                                            <select className="form-select" required onChange={e => setNewEntry({ ...newEntry, classroom_id: e.target.value })}>
                                                <option value="">Select...</option>
                                                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted">Day</label>
                                            <select className="form-select" value={newEntry.day} onChange={e => setNewEntry({ ...newEntry, day: e.target.value })}>
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => <option key={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted">Time</label>
                                            <input type="time" className="form-control" value={newEntry.time} onChange={e => setNewEntry({ ...newEntry, time: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Subject</label>
                                            <input type="text" className="form-control" placeholder="e.g. Database Systems" required onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted">Type</label>
                                            <select className="form-select" value={newEntry.type} onChange={e => setNewEntry({ ...newEntry, type: e.target.value })}>
                                                <option value="theory">Theory</option>
                                                <option value="lab">Lab</option>
                                                <option value="seminar">Seminar</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small fw-bold text-muted">Attendance %</label>
                                            <input type="number" className="form-control" value={newEntry.attendance} min="0" max="100" onChange={e => setNewEntry({ ...newEntry, attendance: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Teacher Name</label>
                                            <input type="text" className="form-control" placeholder="Dr. John Smith" required onChange={e => setNewEntry({ ...newEntry, teacher: e.target.value })} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted">Teacher Email</label>
                                            <input type="email" className="form-control" placeholder="john@university.edu" required onChange={e => setNewEntry({ ...newEntry, email: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="submit" className="btn btn-primary w-100">Add to Timetable</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {showImportModal && (
                <div className="modal show">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="fw-bold mb-0">Bulk Import Timetable</h5>
                                <button className="btn-close btn-close-white" onClick={() => { setShowImportModal(false); setImportResult(null); }}></button>
                            </div>
                            <div className="modal-body">
                                {importResult ? (
                                    <div className={`alert ${importResult.success ? 'bg-success' : 'bg-danger'} bg-opacity-10 border-0`}>
                                        <div className="d-flex align-items-center gap-3">
                                            {importResult.success ? <FiCheckCircle className="text-success h4 mb-0" /> : <FiAlertCircle className="text-danger h4 mb-0" />}
                                            <div>
                                                <div className={`fw-bold ${importResult.success ? 'text-success' : 'text-danger'}`}>
                                                    {importResult.success ? 'Import Successful!' : 'Import Failed'}
                                                </div>
                                                <div className="small">{importResult.message}</div>
                                            </div>
                                        </div>
                                        {importResult.errors?.length > 0 && (
                                            <div className="mt-3 small text-muted">
                                                <strong>Errors:</strong>
                                                <ul className="mb-0 ps-3">
                                                    {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleBulkImport}>
                                        <p className="text-muted small mb-4">
                                            Upload a CSV file with columns: <code>classroom_id, day, time, subject, type, teacher, email, attendance</code>
                                        </p>
                                        <input
                                            type="file"
                                            className="form-control mb-3"
                                            accept=".csv"
                                            onChange={e => setImportFile(e.target.files[0])}
                                        />
                                        <button type="button" className="btn btn-primary-dim w-100 mb-3" onClick={downloadTemplate}>
                                            <FiDownload className="me-2" /> Download Template
                                        </button>
                                        <button type="submit" className="btn btn-primary w-100" disabled={!importFile || importing}>
                                            {importing ? <DynamicLoader size={20} color="var(--bg-deep)" /> : 'Upload & Import'}
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
                type="confirm"
                title="Remove Schedule Entry?"
                message="This entry will be permanently deleted from the timetable."
                confirmText="Remove"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Timetable;
