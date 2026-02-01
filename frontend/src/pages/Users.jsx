import React, { useState } from 'react';
import axios from 'axios';
import { FiUpload, FiDownload, FiCheckCircle, FiAlertCircle, FiUsers, FiMail, FiUserCheck, FiShield } from 'react-icons/fi';

function Users({ user }) {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [importing, setImporting] = useState(false);

    const [users, setUsers] = useState([]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
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
            const res = await axios.post('/api/users/bulk-import', formData);
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
            <div className="mb-5">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', fontSize: '0.7rem' }}>
                        <FiShield className="me-1" /> ADMIN ZONE
                    </span>
                </div>
                <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                    User <span className="text-gradient">Management</span>
                </h2>
                <p className="text-muted small m-0">Bulk import faculty and staff members</p>
            </div>

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
                                                        <div className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>{u.username}</div>
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
                                                <span className={`badge ${u.is_active ? 'text-success' : 'text-secondary'}`} style={{ background: 'transparent' }}>
                                                    <span className={`d-inline-block rounded-circle me-1 ${u.is_active ? 'bg-success' : 'bg-secondary'}`} style={{ width: '6px', height: '6px' }}></span>
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-end pe-4">
                                                <button className="btn btn-sm btn-primary-dim p-1 px-3" style={{ fontSize: '0.75rem' }}>Edit</button>
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
        </div>
    );
}

export default Users;
