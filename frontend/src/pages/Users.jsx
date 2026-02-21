import React, { useState } from 'react';
import api from '../api';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiUsers, FiMail, FiUserCheck, FiShield, FiTrash2, FiUserPlus, FiClock, FiCheck, FiUnlock, FiEdit2, FiKey, FiToggleLeft, FiToggleRight, FiAlertTriangle, FiStar } from 'react-icons/fi';
import ConfirmModal from '../components/ConfirmModal';

function Users({ user }) {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [approvingId, setApprovingId] = useState(null);

    const [users, setUsers] = useState([]);
    const [pendingAdmins, setPendingAdmins] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [singleUser, setSingleUser] = useState({ username: '', email: '', password: '', role: 'faculty', auto_activate: false });
    const [alertModal, setAlertModal] = useState({ show: false, type: 'alert', title: '', message: '' });
    const [activateTarget, setActivateTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [editForm, setEditForm] = useState({ username: '', email: '', role: '', is_active: false, new_password: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [showRoleWarning, setShowRoleWarning] = useState(false);

    // Superior Admin identification
    const SUPERIOR_EMAIL = 'admin@smart.com';
    const isSuperior = user.email === SUPERIOR_EMAIL;

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/users');
            setUsers(res.data);

            const pending = await api.get('/api/users/pending-admins');
            setPendingAdmins(pending.data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };

    const handleAddSingleUser = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/api/users/create-single', singleUser);
            setAlertModal({ show: true, type: 'success', title: 'User Created', message: res.data.message });
            setShowAddModal(false);
            setSingleUser({ username: '', email: '', password: '', role: 'faculty', auto_activate: false });
            fetchUsers();
        } catch (err) {
            setAlertModal({ show: true, type: 'error', title: 'Creation Failed', message: err.response?.data?.message || 'Failed to create user' });
        }
    };

    const handleApproveAdmin = async (id) => {
        setApprovingId(id);
        try {
            await api.post(`/api/users/approve-admin/${id}`);
            fetchUsers();
        } catch (err) {
            setAlertModal({ show: true, type: 'error', title: 'Approval Failed', message: err.response?.data?.message || 'Approval failed' });
        } finally {
            setApprovingId(null);
        }
    };

    const handleManualActivate = async (id) => {
        setActivateTarget(id);
    };

    const confirmActivate = async () => {
        if (activateTarget) {
            try {
                await api.post(`/api/users/activate-manual/${activateTarget}`);
                fetchUsers();
            } catch (err) {
                setAlertModal({ show: true, type: 'error', title: 'Activation Failed', message: 'Failed to activate user' });
            }
        }
        setActivateTarget(null);
    };

    const handleDelete = async (u) => {
        if (u.is_permanent) {
            setAlertModal({ show: true, type: 'error', title: 'Protected Account', message: 'This account is permanent and cannot be deleted.' });
            return;
        }
        setDeleteTarget(u);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            setDeletingId(deleteTarget.id);
            try {
                await api.delete(`/api/users/${deleteTarget.id}`);
                fetchUsers();
            } catch (err) {
                setAlertModal({ show: true, type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Failed to delete user' });
            } finally {
                setDeletingId(null);
            }
        }
        setDeleteTarget(null);
    };

    const openEditModal = (u) => {
        setEditTarget(u);
        setEditForm({
            username: u.username,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
            is_permanent: u.is_permanent,
            new_password: ''
        });
        setShowRoleWarning(false);
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setEditSaving(true);
        try {
            const res = await api.put(`/api/users/${editTarget.id}`, editForm);
            setAlertModal({ show: true, type: 'success', title: 'User Updated', message: res.data.message });
            setEditTarget(null);
            fetchUsers();
        } catch (err) {
            setAlertModal({ show: true, type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Failed to update user' });
        } finally {
            setEditSaving(false);
        }
    };

    const handleRoleChange = (newRole) => {
        setEditForm({ ...editForm, role: newRole });
        setShowRoleWarning(newRole === 'admin' && editTarget?.role !== 'admin');
    };

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const handleImport = async (e) => {
        e.preventDefault();
        if (!file) return;

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/api/users/bulk-import', formData);
            setResult(res.data);
            if (res.data.success) fetchUsers(); // Refresh list
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'email,username,password,role\nfaculty1@uni.edu,Dr. Smith,pass123,faculty\nstudent1@uni.edu,John Doe,secure456,user';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'faculty_template.csv';
        a.click();
    };

    if (user.role !== 'admin') {
        return (
            <div className="fade-in text-center py-5">
                <FiShield className="text-danger h1 mb-3" />
                <h3>Access Denied</h3>
                <p className="text-muted">Only administrators can manage users.</p>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* ─── Header ─── */}
            <div className="d-flex align-items-end justify-content-between mb-4">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', fontSize: '0.7rem' }}>
                            <FiShield className="me-1" /> ADMIN ZONE
                        </span>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        User <span className="text-gradient">Management</span>
                    </h2>
                    <p className="text-muted small m-0">Bulk import or manually add system users</p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <button
                        className={`btn d-flex align-items-center gap-2 ${showBulkImport ? 'btn-primary-dim' : 'btn-primary-dim'}`}
                        onClick={() => setShowBulkImport(!showBulkImport)}
                        style={{ padding: '0.65rem 1.25rem' }}
                    >
                        <FiUpload /> {showBulkImport ? 'Hide CSV Import' : 'Upload CSV'}
                    </button>
                    <button className="btn btn-gradient d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
                        <FiUserPlus /> Add User
                    </button>
                </div>
            </div>

            {/* ─── Pending Admin Approvals ─── */}
            {pendingAdmins.length > 0 && (
                <div className="mb-4 fade-in">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <FiClock className="text-warning" />
                        <h5 className="fw-bold m-0">Pending Admin Approvals</h5>
                        <span className="badge bg-warning bg-opacity-10 text-warning">{pendingAdmins.length} Action Required</span>
                    </div>
                    <div className="card p-0 overflow-hidden border-warning border-opacity-25 shadow-sm">
                        <div className="table-container">
                            <table className="table m-0">
                                <thead className="bg-warning bg-opacity-5">
                                    <tr>
                                        <th className="ps-4">Candidate</th>
                                        <th>Requested</th>
                                        <th className="text-end pe-4" style={{ width: '200px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingAdmins.map(p => (
                                        <tr key={p.id}>
                                            <td className="ps-4 py-3">
                                                <div className="fw-bold text-white">{p.username}</div>
                                                <div className="small text-muted">{p.email}</div>
                                            </td>
                                            <td className="text-muted small">{p.created_at}</td>
                                            <td className="text-end pe-4">
                                                <button
                                                    className="btn btn-sm btn-success-dim d-flex align-items-center gap-2 ms-auto"
                                                    style={{ padding: '0.5rem 1rem' }}
                                                    onClick={() => handleApproveAdmin(p.id)}
                                                    disabled={approvingId === p.id}
                                                >
                                                    {approvingId === p.id ? <span className="spinner-border spinner-border-sm"></span> : <><FiCheck /> Approve Access</>}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── System Users Table (Primary Content) ─── */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h4 className="fw-bold m-0"><FiUsers className="me-2" />System Users</h4>
                <span className="badge bg-surface border text-muted">{users.length} Total</span>
            </div>

            <div className="card p-0 overflow-hidden mb-4">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="ps-4">User Details</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="ps-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '10px',
                                                background: 'linear-gradient(135deg, var(--bg-elevated) 0%, rgba(255,255,255,0.05) 100%)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 'bold', color: 'var(--primary-light)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                boxShadow: u.is_permanent ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none'
                                            }}>
                                                {u.is_permanent ? <FiStar size={14} className="text-warning" /> : u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="fw-bold text-white d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                                                    {u.username}
                                                    {u.is_pending_admin && <span className="badge bg-warning text-dark" style={{ fontSize: '0.6rem', padding: '0.2em 0.5em', borderRadius: '4px' }}>PENDING</span>}
                                                </div>
                                                <div className="text-muted small" style={{ opacity: 0.7, fontSize: '0.75rem' }}>{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            {u.is_permanent ? (
                                                <div className="d-flex align-items-center" style={{
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    color: '#f59e0b',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '700',
                                                    letterSpacing: '0.05em',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                                }}>
                                                    <FiStar size={10} className="me-1" /> CORE ADMIN
                                                </div>
                                            ) : (
                                                <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-surface border text-muted'}`} style={{
                                                    padding: '6px 12px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.is_active ? 'text-success' : (u.is_pending_admin ? 'text-warning' : 'text-secondary')}`} style={{ background: 'transparent' }}>
                                            <span className={`d-inline-block rounded-circle me-1 ${u.is_active ? 'bg-success' : (u.is_pending_admin ? 'bg-warning' : 'bg-secondary')}`} style={{ width: '6px', height: '6px' }}></span>
                                            {u.is_active ? 'Active' : (u.is_pending_admin ? 'Locked' : 'Inactive')}
                                        </span>
                                    </td>
                                    <td className="text-end pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            {u.is_pending_admin && (
                                                <button
                                                    className="btn btn-sm btn-warning-dim p-1 px-3 d-flex align-items-center gap-1"
                                                    style={{ fontSize: '0.75rem' }}
                                                    onClick={() => handleApproveAdmin(u.id)}
                                                    disabled={approvingId === u.id}
                                                    title="Unlock / Approve Admin Access"
                                                >
                                                    {approvingId === u.id ? <span className="spinner-border spinner-border-sm" role="status"></span> : <><FiUnlock size={14} /> Unlock</>}
                                                </button>
                                            )}
                                            {!u.is_active && !u.is_pending_admin && (
                                                <button
                                                    className="btn btn-sm btn-success-dim p-1 px-3"
                                                    style={{ fontSize: '0.75rem' }}
                                                    onClick={() => handleManualActivate(u.id)}
                                                    title="Activate manually"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                            <button className="btn btn-sm btn-primary-dim p-1 px-3 d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }} onClick={() => openEditModal(u)}><FiEdit2 size={12} /> Edit</button>
                                            <button
                                                className={`btn btn-sm p-1 px-3 ${u.is_permanent ? 'btn-secondary opacity-25' : 'btn-danger-dim'}`}
                                                style={{ fontSize: '0.75rem', minWidth: '32px' }}
                                                onClick={() => handleDelete(u)}
                                                disabled={u.is_permanent || deletingId === u.id}
                                                title={u.is_permanent ? "Permanent admin protected" : "Delete user"}
                                            >
                                                {deletingId === u.id ? <span className="spinner-border spinner-border-sm" role="status"></span> : <FiTrash2 />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center py-5 text-muted">No users found. Import some!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Bulk CSV Import (Collapsible) ─── */}
            {showBulkImport && (
                <div className="fade-in mb-4">
                    <div className="card d-flex flex-row overflow-hidden" style={{ minHeight: '280px' }}>
                        {/* Left Side - Visual */}
                        <div className="d-none d-md-flex flex-column justify-content-center align-items-center p-5 text-center"
                            style={{ width: '35%', background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', color: 'white' }}>
                            <div className="mb-4 p-3 rounded-circle" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <FiUsers size={36} />
                            </div>
                            <h4 className="fw-bold mb-2">Bulk Onboarding</h4>
                            <p className="small opacity-75 mb-0">
                                Automatically verify emails, hash passwords, and send activation links to new users.
                            </p>
                        </div>

                        {/* Right Side - Form */}
                        <div className="p-4 p-md-5 flex-grow-1 d-flex flex-column justify-content-center">
                            {result ? (
                                <div className="text-center fade-in">
                                    {result.success ? (
                                        <div className="mb-4">
                                            <FiCheckCircle className="text-success h1 mb-3" />
                                            <h4 className="fw-bold text-success">Import Complete!</h4>
                                            <p className="text-muted mb-4">{result.message}</p>

                                            <div className="row g-2 mb-4">
                                                <div className="col-6">
                                                    <div className="p-3 rounded-3 bg-success bg-opacity-10">
                                                        <h3 className="fw-bold text-success mb-0">{result.added}</h3>
                                                        <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem' }}>Added</small>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="p-3 rounded-3 bg-warning bg-opacity-10">
                                                        <h3 className="fw-bold text-warning mb-0">{result.skipped}</h3>
                                                        <small className="text-muted text-uppercase" style={{ fontSize: '0.65rem' }}>Skipped</small>
                                                    </div>
                                                </div>
                                            </div>

                                            {result.errors && result.errors.length > 0 && (
                                                <div className="text-start p-3 rounded-3 bg-danger bg-opacity-10 mb-3">
                                                    <small className="fw-bold text-danger d-block mb-2">Errors Encountered:</small>
                                                    <ul className="mb-0 small text-muted ps-3">
                                                        {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            <button className="btn btn-primary-dim" onClick={() => { setResult(null); setFile(null); }}>
                                                Import More
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mb-4">
                                            <FiAlertCircle className="text-danger h1 mb-3" />
                                            <h4 className="fw-bold text-danger">Import Failed</h4>
                                            <p className="text-muted">{result.message}</p>
                                            <button className="btn btn-primary-dim mt-3" onClick={() => setResult(null)}>Try Again</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleImport}>
                                    <div className="mb-4 text-center">
                                        <label
                                            className={`d-block p-4 border rounded-3 cursor-pointer transition-all ${file ? 'border-primary bg-primary bg-opacity-5' : 'border-dashed'}`}
                                            style={{ borderStyle: file ? 'solid' : 'dashed' }}
                                        >
                                            <input type="file" className="d-none" accept=".csv" onChange={e => setFile(e.target.files[0])} />
                                            <FiUpload className={`h2 mb-2 ${file ? 'text-primary' : 'text-muted'}`} />
                                            <div className="fw-bold">{file ? file.name : 'Click to Upload CSV'}</div>
                                            <div className="small text-muted">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Drag & drop or browse'}</div>
                                        </label>
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-primary-dim flex-grow-1" onClick={downloadTemplate}>
                                            <FiDownload /> Template
                                        </button>
                                        <button type="submit" className="btn btn-gradient flex-grow-1" disabled={!file || importing}>
                                            {importing ? 'Processing...' : 'Start Import'}
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-3 border-top d-flex gap-3 text-muted small">
                                        <div className="d-flex align-items-center gap-2">
                                            <FiMail className="text-primary" /> Auto-Email
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <FiUserCheck className="text-success" /> Email Uniqueness
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content card p-4 w-100" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold m-0">Add New User</h4>
                            <button className="btn btn-link text-muted h3 p-0" style={{ textDecoration: 'none' }} onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddSingleUser}>
                            <div className="mb-3">
                                <label className="form-label small">Full Name / Username</label>
                                <input type="text" className="form-control" required value={singleUser.username}
                                    onChange={e => setSingleUser({ ...singleUser, username: e.target.value })} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small">Email Address</label>
                                <input type="email" className="form-control" required value={singleUser.email}
                                    onChange={e => setSingleUser({ ...singleUser, email: e.target.value })} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small">Initial Password</label>
                                <input type="password" className="form-control" required value={singleUser.password}
                                    onChange={e => setSingleUser({ ...singleUser, password: e.target.value })} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small">System Role</label>
                                <select className="form-select" value={singleUser.role} onChange={e => setSingleUser({ ...singleUser, role: e.target.value })}>
                                    <option value="faculty">Faculty</option>
                                    <option value="user">Student / User</option>
                                    <option value="admin">Administrator (Requires Approval)</option>
                                </select>
                            </div>
                            <div className="mb-4 form-check">
                                <input type="checkbox" className="form-check-input" id="autoAct" checked={singleUser.auto_activate}
                                    onChange={e => setSingleUser({ ...singleUser, auto_activate: e.target.checked })} />
                                <label className="form-check-label small" htmlFor="autoAct">Skip email activation (Auto-activate)</label>
                            </div>
                            <button type="submit" className="btn btn-gradient w-100 py-2 fw-bold">Create User Account</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editTarget && (
                <div className="modal-overlay" onClick={() => setEditTarget(null)}>
                    <div className="modal-content card p-4 w-100" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h4 className="fw-bold m-0">Edit User</h4>
                                <p className="text-muted small m-0 mt-1">Editing {editTarget.username}</p>
                            </div>
                            <button className="btn btn-link text-muted h3 p-0" style={{ textDecoration: 'none' }} onClick={() => setEditTarget(null)}>&times;</button>
                        </div>
                        <form onSubmit={handleEditUser}>
                            {/* Username */}
                            <div className="mb-3">
                                <label className="form-label small">Full Name / Username</label>
                                <input type="text" className="form-control" required value={editForm.username}
                                    onChange={e => setEditForm({ ...editForm, username: e.target.value })} />
                            </div>

                            {/* Email */}
                            <div className="mb-3">
                                <label className="form-label small">Email Address</label>
                                <input type="email" className="form-control" required value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>

                            {/* Role + Status Row */}
                            <div className="row g-3 mb-3">
                                <div className="col-7">
                                    <label className="form-label small">System Role</label>
                                    <select className="form-select" value={editForm.role}
                                        onChange={e => handleRoleChange(e.target.value)}
                                        disabled={editTarget.id === user.id}
                                    >
                                        <option value="faculty">Faculty</option>
                                        <option value="user">Student / User</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                    {editTarget.id === user.id && (
                                        <div className="small text-muted mt-1" style={{ fontSize: '0.7rem' }}>You cannot change your own role</div>
                                    )}
                                </div>
                                <div className="col-5">
                                    <label className="form-label small">Account Status</label>
                                    <button type="button"
                                        className={`btn w-100 d-flex align-items-center justify-content-center gap-2 ${editForm.is_active ? 'btn-success-dim' : 'btn-danger-dim'}`}
                                        onClick={() => {
                                            if (!editTarget.is_permanent) setEditForm({ ...editForm, is_active: !editForm.is_active });
                                        }}
                                        disabled={editTarget.is_permanent || editTarget.id === user.id}
                                        style={{ padding: '0.7rem' }}
                                    >
                                        {editForm.is_active ? <><FiToggleRight size={18} /> Active</> : <><FiToggleLeft size={18} /> Inactive</>}
                                    </button>
                                </div>
                            </div>

                            {/* Permanence Toggle (Only Superior Admin) */}
                            {isSuperior && editTarget.role === 'admin' && (
                                <div className="mb-4 p-3 rounded-4" style={{
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    background: editForm.is_permanent ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.02)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                            <label className="form-label small m-0 d-flex align-items-center gap-2 fw-bold" style={{ color: editForm.is_permanent ? '#f59e0b' : 'inherit' }}>
                                                <FiStar className={editForm.is_permanent ? 'text-warning' : 'text-muted'} /> Account Permanence
                                            </label>
                                            <div className="text-muted" style={{ fontSize: '0.68rem', opacity: 0.8 }}>Protect this administrator from deletion or deactivation</div>
                                        </div>
                                        <button type="button"
                                            className={`btn btn-sm rounded-3 px-3 fw-bold ${editForm.is_permanent ? 'btn-warning' : 'btn-surface border'}`}
                                            onClick={() => setEditForm({ ...editForm, is_permanent: !editForm.is_permanent })}
                                            disabled={editTarget.id === user.id}
                                            style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}
                                        >
                                            {editForm.is_permanent ? 'Permanent' : 'Regular'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Role Warning */}
                            {showRoleWarning && (
                                <div className="d-flex align-items-start gap-2 p-3 rounded-3 mb-3" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                    <FiAlertTriangle className="text-warning flex-shrink-0 mt-1" />
                                    <div className="small text-warning">Promoting to <strong>Administrator</strong> will grant full system access including user management, classroom control, and ML configuration.</div>
                                </div>
                            )}

                            {/* Password Reset */}
                            <div className="mb-3">
                                <label className="form-label small d-flex align-items-center gap-2">
                                    <FiKey size={12} /> Reset Password <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input type="password" className="form-control" placeholder="Leave blank to keep current" value={editForm.new_password}
                                    onChange={e => setEditForm({ ...editForm, new_password: e.target.value })} />
                            </div>

                            {/* Read-only Meta */}
                            <div className="d-flex gap-3 mb-4 p-3 rounded-3" style={{ background: 'var(--bg-elevated)' }}>
                                <div className="small">
                                    <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activation</div>
                                    <div className={editTarget.is_active ? 'text-success fw-bold' : 'text-secondary fw-bold'} style={{ fontSize: '0.8rem' }}>
                                        {editTarget.is_active ? '✓ Verified' : '✗ Unverified'}
                                    </div>
                                </div>
                                {editTarget.is_pending_admin && (
                                    <div className="small">
                                        <div className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Status</div>
                                        <div className="text-warning fw-bold" style={{ fontSize: '0.8rem' }}>⏳ Pending Approval</div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="d-flex gap-2">
                                <button type="button" className="btn btn-primary-dim flex-grow-1" onClick={() => setEditTarget(null)}>Cancel</button>
                                <button type="submit" className="btn btn-gradient flex-grow-1 fw-bold" disabled={editSaving}>
                                    {editSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Alert Modal (replaces native alert()) */}
            <ConfirmModal
                show={alertModal.show}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={() => setAlertModal({ ...alertModal, show: false })}
            />

            {/* Manual Activate Confirmation */}
            <ConfirmModal
                show={!!activateTarget}
                type="warning"
                title="Manual Activation"
                message="Manually activate this account? Use this only if the activation email failed."
                confirmText="Activate"
                onConfirm={confirmActivate}
                onCancel={() => setActivateTarget(null)}
            />

            {/* Delete User Confirmation */}
            <ConfirmModal
                show={!!deleteTarget}
                type="warning"
                title={`Delete ${deleteTarget?.username || 'User'}?`}
                message="This action cannot be undone. The user's account and data will be permanently removed."
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Users;
