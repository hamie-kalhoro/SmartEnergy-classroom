import React, { useState } from 'react';
import api from '../api';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiUsers, FiMail, FiUserCheck, FiShield, FiTrash2, FiUserPlus, FiClock, FiCheck, FiUnlock } from 'react-icons/fi';
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
    const [singleUser, setSingleUser] = useState({ username: '', email: '', password: '', role: 'faculty', auto_activate: false });
    const [alertModal, setAlertModal] = useState({ show: false, type: 'alert', title: '', message: '' });
    const [activateTarget, setActivateTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

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
        if (u.role === 'admin' && u.username === 'hamid') {
            setAlertModal({ show: true, type: 'error', title: 'Protected Account', message: 'Primary administrator account cannot be deleted.' });
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
            <div className="d-flex align-items-end justify-content-between mb-5">
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
                <button className="btn btn-gradient d-flex align-items-center gap-2" onClick={() => setShowAddModal(true)}>
                    <FiUserPlus /> Add User
                </button>
            </div>

            {/* Pending Approvals Section */}
            {pendingAdmins.length > 0 && (
                <div className="mb-5 fade-in">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <FiClock className="text-warning" />
                        <h4 className="fw-bold m-0">Pending Admin Approvals</h4>
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

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    {/* Import Card */}
                    <div className="card d-flex flex-row overflow-hidden mb-5" style={{ minHeight: '300px' }}>
                        {/* Left Side - Visual */}
                        <div className="d-none d-md-flex flex-column justify-content-center align-items-center p-5 text-center"
                            style={{ width: '40%', background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', color: 'white' }}>
                            <div className="mb-4 p-3 rounded-circle" style={{ background: 'rgba(255,255,255,0.2)' }}>
                                <FiUsers size={40} />
                            </div>
                            <h4 className="fw-bold mb-2">Bulk Onboarding</h4>
                            <p className="small opacity-75">
                                Automatically verify emails, hash passwords, and send activation links to new users.
                            </p>
                        </div>

                        {/* Right Side - Form */}
                        <div className="p-5 flex-grow-1 d-flex flex-column justify-content-center">
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

                    {/* Users List */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="fw-bold m-0"><FiUsers className="me-2" />System Users</h4>
                        <span className="badge bg-surface border text-muted">{users.length} Total</span>
                    </div>

                    <div className="card p-0 overflow-hidden">
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
                                                        width: '32px', height: '32px', borderRadius: '8px',
                                                        background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold', color: 'var(--primary-light)'
                                                    }}>
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>
                                                            {u.username}
                                                            {u.is_pending_admin && <span className="ms-2 badge bg-warning text-dark" style={{ fontSize: '0.6rem' }}>PENDING</span>}
                                                        </div>
                                                        <div className="text-muted small">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-surface border text-muted'}`}>
                                                    {u.role.toUpperCase()}
                                                </span>
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
                                                    <button className="btn btn-sm btn-primary-dim p-1 px-3" style={{ fontSize: '0.75rem' }}>Edit</button>
                                                    <button
                                                        className={`btn btn-sm p-1 px-3 ${(u.role === 'admin' && u.username === 'hamid') ? 'btn-secondary opacity-25' : 'btn-danger-dim'}`}
                                                        style={{ fontSize: '0.75rem', minWidth: '32px' }}
                                                        onClick={() => handleDelete(u)}
                                                        disabled={(u.role === 'admin' && u.username === 'hamid') || deletingId === u.id}
                                                        title={(u.role === 'admin' && u.username === 'hamid') ? "Root admin protected" : "Delete user"}
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
                </div>
            </div>
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
