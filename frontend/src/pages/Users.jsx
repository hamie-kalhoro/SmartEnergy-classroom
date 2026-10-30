import React, { useState } from 'react';
import api from '../api';
import {
    FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiUsers, FiMail, FiUserCheck, FiShield, FiTrash2, FiUserPlus, FiClock,
    FiCheck, FiUnlock, FiEdit2, FiKey, FiToggleLeft, FiToggleRight, FiAlertTriangle, FiStar, FiBookOpen, FiLock, FiSearch,
    FiUser, FiFileText, FiX
} from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';
import ConfirmModal from '../components/ConfirmModal';
import Portal from '../components/Portal';

const ROLE_META = {
    admin: { label: 'Administrator', color: '#a78bfa', icon: FiShield },
    faculty: { label: 'Faculty', color: '#06b6d4', icon: FiBookOpen },
    user: { label: 'Student', color: '#94a3b8', icon: FiUser }
};
const ROLE_ORDER = ['admin', 'faculty', 'user'];
const AVATAR_HUES = [158, 199, 262, 32, 340, 188, 222, 12];

function initials(name = '') {
    const words = name.replace(/^(Dr|Prof|Engr|Mr|Ms|Mrs)\.?\s+/i, '').split(/[\s._-]+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

function avatarHue(name = '') {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_HUES[hash % AVATAR_HUES.length];
}

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
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [query, setQuery] = useState('');

    // Superior Admin identification
    const SUPERIOR_EMAIL = 'admin@smart.com';
    const isSuperior = user.email === SUPERIOR_EMAIL;

    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/users');
            setUsers(res.data);

            const pending = await api.get('/api/users/pending-admins');
            setPendingAdmins(pending.data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
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

    const q = query.trim().toLowerCase();
    const visibleUsers = users
        .filter(u => roleFilter === 'all' || u.role === roleFilter)
        .filter(u => statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active))
        .filter(u => !q || `${u.username} ${u.email}`.toLowerCase().includes(q))
        .sort((a, b) => Number(b.is_permanent) - Number(a.is_permanent) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.username.localeCompare(b.username));

    const counts = {
        total: users.length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length,
        admin: users.filter(u => u.role === 'admin').length,
        faculty: users.filter(u => u.role === 'faculty').length,
        user: users.filter(u => u.role === 'user').length
    };

    const stats = [
        { label: 'Total users', val: counts.total, icon: <FiUsers />, color: '#00f59b' },
        { label: 'Active', val: counts.active, icon: <FiUserCheck />, color: '#10b981' },
        { label: 'Awaiting activation', val: counts.inactive, icon: <FiClock />, color: '#f59e0b' },
        { label: 'Administrators', val: counts.admin, icon: <FiShield />, color: '#a78bfa' },
        { label: 'Faculty', val: counts.faculty, icon: <FiBookOpen />, color: '#06b6d4' }
    ];

    const closeImport = () => {
        setShowBulkImport(false);
        setResult(null);
        setFile(null);
    };

    return (
        <div className="fade-in um-page">
            <div className="dash-header">
                <div>
                    <span className="rooms-eyebrow">Administration · access control</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        User <span className="text-gradient">Management</span>
                    </h2>
                    <p className="text-muted small m-0">Invite faculty, approve administrators and manage account access.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary-dim" onClick={() => setShowBulkImport(true)}>
                        <FiUpload className="me-2" /> Import CSV
                    </button>
                    <button className="btn btn-gradient" onClick={() => setShowAddModal(true)}>
                        <FiUserPlus className="me-2" /> Add user
                    </button>
                </div>
            </div>

            <div className="rooms-stats">
                {stats.map(s => (
                    <div className={`rooms-stat ${loading ? 'skeleton' : ''}`} key={s.label}>
                        {!loading && (
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

            {/* Pending admin approvals */}
            {pendingAdmins.length > 0 && (
                <section className="um-pending">
                    <div className="um-pending-head">
                        <span className="um-pending-icon"><FiClock /></span>
                        <div>
                            <h3>Administrator requests</h3>
                            <p>{pendingAdmins.length} account{pendingAdmins.length > 1 ? 's' : ''} asked for admin access and {pendingAdmins.length > 1 ? 'are' : 'is'} locked until approved.</p>
                        </div>
                    </div>
                    <div className="um-pending-list">
                        {pendingAdmins.map(p => (
                            <div key={p.id} className="um-pending-row">
                                <span className="um-avatar" style={{ '--hue': avatarHue(p.username) }}>{initials(p.username)}</span>
                                <div className="um-user-text">
                                    <strong>{p.username}</strong>
                                    <small>{p.email}{p.created_at ? ` · requested ${p.created_at}` : ''}</small>
                                </div>
                                <button className="btn btn-sm btn-gradient" onClick={() => handleApproveAdmin(p.id)} disabled={approvingId === p.id}>
                                    {approvingId === p.id ? <DynamicLoader size={16} color="var(--loader-on-button, var(--bg-deep))" /> : <><FiCheck className="me-1" /> Approve</>}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="tt-card">
                <div className="um-toolbar">
                    <div className="rooms-filters" role="tablist" aria-label="Filter by role">
                        {[['all', 'All users', counts.total], ['admin', 'Admins', counts.admin], ['faculty', 'Faculty', counts.faculty], ['user', 'Students', counts.user]].map(([key, label, n]) => (
                            <button key={key} type="button" role="tab" aria-selected={roleFilter === key} className={roleFilter === key ? 'active' : ''} onClick={() => setRoleFilter(key)}>
                                {key !== 'all' && <i style={{ background: ROLE_META[key].color }} />}
                                {label}<span>{n}</span>
                            </button>
                        ))}
                    </div>
                    <div className="um-toolbar-right">
                        <div className="tt-day-tabs" role="tablist" aria-label="Filter by status">
                            {[['all', 'Any status'], ['active', 'Active'], ['inactive', 'Inactive']].map(([key, label]) => (
                                <button key={key} type="button" role="tab" aria-selected={statusFilter === key} className={statusFilter === key ? 'active' : ''} onClick={() => setStatusFilter(key)}>{label}</button>
                            ))}
                        </div>
                        <label className="rooms-search">
                            <FiSearch />
                            <input type="search" placeholder="Search name or email" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search users" />
                        </label>
                    </div>
                </div>

                <div className="tt-grid-scroll">
                    <table className="pred-table um-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th className="um-actions-head">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [1, 2, 3, 4].map(i => (
                                    <tr key={i}><td colSpan="4"><div className="skeleton" style={{ height: 40 }} /></td></tr>
                                ))
                            ) : visibleUsers.length === 0 ? (
                                <tr><td colSpan="4" className="pred-none">{users.length ? 'No users match these filters.' : 'No users yet. Add one or import a CSV.'}</td></tr>
                            ) : visibleUsers.map(u => {
                                const role = ROLE_META[u.role] || ROLE_META.user;
                                const RoleIcon = role.icon;
                                const status = u.is_active ? 'active' : u.is_pending_admin ? 'locked' : 'inactive';
                                return (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="um-user">
                                                <span className={`um-avatar ${u.is_permanent ? 'core' : ''}`} style={{ '--hue': avatarHue(u.username) }}>
                                                    {u.is_permanent ? <FiStar /> : initials(u.username)}
                                                </span>
                                                <div className="um-user-text">
                                                    <strong>
                                                        {u.username}
                                                        {u.id === user.id && <span className="um-tag you">You</span>}
                                                        {u.is_permanent && <span className="um-tag core" title="Protected from deletion and deactivation"><FiLock /> Protected</span>}
                                                    </strong>
                                                    <small>{u.email}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="um-role" style={{ '--role': u.is_permanent ? '#f59e0b' : role.color }}>
                                                {u.is_permanent ? <FiStar /> : <RoleIcon />} {u.is_permanent ? 'Core admin' : role.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`um-status ${status}`}>
                                                <i />{status === 'active' ? 'Active' : status === 'locked' ? 'Awaiting approval' : 'Not activated'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="um-actions">
                                                {u.is_pending_admin && (
                                                    <button className="um-text-btn warn" onClick={() => handleApproveAdmin(u.id)} disabled={approvingId === u.id}>
                                                        {approvingId === u.id ? <DynamicLoader size={14} color="currentColor" /> : <><FiUnlock /> Approve</>}
                                                    </button>
                                                )}
                                                {!u.is_active && !u.is_pending_admin && (
                                                    <button className="um-text-btn" onClick={() => handleManualActivate(u.id)} title="Activate without the email link">
                                                        <FiUserCheck /> Activate
                                                    </button>
                                                )}
                                                <button className="um-icon-btn" onClick={() => openEditModal(u)} title="Edit user" aria-label={`Edit ${u.username}`}>
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="um-icon-btn danger"
                                                    onClick={() => handleDelete(u)}
                                                    disabled={u.is_permanent || deletingId === u.id}
                                                    title={u.is_permanent ? 'Protected account' : 'Delete user'}
                                                    aria-label={`Delete ${u.username}`}
                                                >
                                                    {deletingId === u.id ? <DynamicLoader size={14} color="currentColor" /> : <FiTrash2 />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!loading && <p className="um-foot">Showing {visibleUsers.length} of {users.length} users</p>}
            </section>

            {/* Bulk import */}
            {showBulkImport && (
                <Portal>
                    <div className="modal show" onClick={closeImport}>
                        <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                            <div className="modal-content">
                                <div className="modal-header d-block">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="fw-bold mb-0">Import users from CSV</h5>
                                        <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={closeImport}></button>
                                    </div>
                                    <p className="text-muted small mb-0 mt-1">Each new user gets an activation email. Existing emails are skipped.</p>
                                </div>
                                <div className="modal-body text-start">
                                    {result ? (
                                        <div className="um-import-result">
                                            <div className={`ml-result-head ${result.success ? '' : 'warn'}`}>
                                                <span className="ml-result-icon">{result.success ? <FiCheckCircle /> : <FiAlertCircle />}</span>
                                                <div>
                                                    <h3>{result.success ? 'Import complete' : 'Import failed'}</h3>
                                                    <p>{result.message}</p>
                                                </div>
                                            </div>
                                            {result.success && (
                                                <div className="ml-metrics compact">
                                                    <div className="ml-metric tone-good"><small>Added</small><strong>{result.added ?? 0}</strong></div>
                                                    <div className="ml-metric"><small>Skipped</small><strong>{result.skipped ?? 0}</strong></div>
                                                    <div className="ml-metric"><small>Errors</small><strong>{result.errors?.length ?? 0}</strong></div>
                                                </div>
                                            )}
                                            {result.errors?.length > 0 && (
                                                <ul className="um-errors">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                                            )}
                                            <button className="btn btn-primary-dim w-100" onClick={() => { setResult(null); setFile(null); }}>Import another file</button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleImport}>
                                            {!file ? (
                                                <label className="ml-drop">
                                                    <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
                                                    <span className="ml-drop-icon"><FiUpload /></span>
                                                    <strong>Drop a CSV here or <u>browse</u></strong>
                                                    <small>Columns: email, username, password, role</small>
                                                </label>
                                            ) : (
                                                <div className="ml-file">
                                                    <span className="ml-file-icon"><FiFileText /></span>
                                                    <div className="ml-file-text">
                                                        <strong title={file.name}>{file.name}</strong>
                                                        <small>{(file.size / 1024).toFixed(1)} KB</small>
                                                    </div>
                                                    <button type="button" onClick={() => setFile(null)} aria-label="Remove file"><FiX /></button>
                                                </div>
                                            )}
                                            <div className="um-import-notes">
                                                <span><FiMail /> Activation email per user</span>
                                                <span><FiUserCheck /> Duplicate emails skipped</span>
                                                <span><FiKey /> Passwords stored hashed</span>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-primary-dim flex-grow-1" onClick={downloadTemplate}><FiDownload className="me-2" /> Template</button>
                                                <button type="submit" className="btn btn-gradient flex-grow-1" disabled={!file || importing}>
                                                    {importing ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : 'Start import'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {showAddModal && (
                <Portal>
                <div className="modal show" onClick={() => setShowAddModal(false)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="fw-bold mb-0">Add New User</h5>
                                <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={() => setShowAddModal(false)}></button>
                            </div>
                            <form onSubmit={handleAddSingleUser}>
                                <div className="modal-body text-start">
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
                                    <div className="mb-0 form-check">
                                        <input type="checkbox" className="form-check-input" id="autoAct" checked={singleUser.auto_activate}
                                            onChange={e => setSingleUser({ ...singleUser, auto_activate: e.target.checked })} />
                                        <label className="form-check-label small" htmlFor="autoAct" style={{ color: 'var(--text-secondary)' }}>Skip email activation (Auto-activate)</label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary-dim" onClick={() => setShowAddModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-lg btn-gradient flex-grow-1 fw-bold">Create User Account</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                </Portal>
            )}

            {/* Edit User Modal */}
            {editTarget && (
                <Portal>
                <div className="modal show" onClick={() => setEditTarget(null)}>
                    <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header d-block">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="fw-bold mb-0">Edit User Profile</h5>
                                    <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={() => setEditTarget(null)}></button>
                                </div>
                                <p className="text-muted small mb-0 mt-1">Editing configuration for {editTarget.username}</p>
                            </div>
                            <form onSubmit={handleEditUser}>
                                <div className="modal-body text-start">
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
                                    <div className="d-flex gap-3 p-3 rounded-3" style={{ background: 'var(--bg-elevated)' }}>
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
                                </div>
                                <div className="modal-footer">
                                    <div className="d-flex gap-2 w-100">
                                        <button type="button" className="btn btn-primary-dim flex-grow-1" onClick={() => setEditTarget(null)}>Cancel</button>
                                        <button type="submit" className="btn btn-gradient flex-grow-1 fw-bold" disabled={editSaving}>
                                            {editSaving ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                </Portal>
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
                tone="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Users;
