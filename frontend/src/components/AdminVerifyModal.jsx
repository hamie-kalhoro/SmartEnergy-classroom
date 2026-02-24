import React, { useState } from 'react';
import axios from 'axios';
import { FiShield, FiLock } from 'react-icons/fi';
import DynamicLoader from './DynamicLoader';

function AdminVerifyModal({ show, onVerify, onCancel }) {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/verify-admin', credentials);
            if (res.data.success) {
                onVerify();
            }
        } catch (err) {
            setError('Admin verification failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content card border-primary bd-width-2">
                    <div className="modal-header bg-primary text-white border-0">
                        <h5 className="modal-title fw-bold d-flex align-items-center">
                            <FiShield className="me-2" /> Admin Verification Required
                        </h5>
                    </div>
                    <form onSubmit={handleVerify}>
                        <div className="modal-body p-4">
                            <p className="small text-muted mb-4">
                                To perform this update, please enter the administrator credentials for verification.
                            </p>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Admin Username</label>
                                <input
                                    type="text" className="form-control" placeholder="hamid"
                                    onChange={e => setCredentials({ ...credentials, username: e.target.value })} required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Admin Password</label>
                                <input
                                    type="password" className="form-control" placeholder="••••••••"
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })} required
                                />
                            </div>
                            {error && <div className="alert alert-danger p-2 small text-center">{error}</div>}
                        </div>
                        <div className="modal-footer border-0">
                            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                                {loading ? <DynamicLoader size={20} color="var(--bg-deep)" /> : 'Verify & Proceed'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminVerifyModal;
