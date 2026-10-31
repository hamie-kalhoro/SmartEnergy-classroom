import React, { useEffect, useState } from 'react';
import { FiMail, FiSend, FiUser, FiUserMinus, FiUserPlus } from 'react-icons/fi';
import api from '../api';
import ConfirmModal from './ConfirmModal';
import DynamicLoader from './DynamicLoader';
import Portal from './Portal';
import { timeAgo } from './LoadAlerts';

const MAX_NOTE_LENGTH = 500;
const EMPTY_PERSON = { username: '', email: '', password: '' };

function AssignModal({ room, onClose, onDone }) {
    const [mode, setMode] = useState('existing');
    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState('');
    const [person, setPerson] = useState(EMPTY_PERSON);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/api/users')
            .then(res => setUsers(res.data.filter(u => u.is_active && !u.is_pending_admin)))
            .catch(() => setError('Could not load the user list. You can still add a new person.'));
    }, []);

    const setField = (field) => (event) => setPerson({ ...person, [field]: event.target.value });

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const body = mode === 'existing' ? { user_id: Number(userId) } : person;
            const { data } = await api.post(`/api/map/rooms/${room.id}/assistant`, body);
            onDone(data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not add the assistant.');
            setSaving(false);
        }
    };

    return (
        <Portal>
            <div className="modal show" onClick={onClose}>
                <div className="modal-dialog modal-dialog-centered" onClick={event => event.stopPropagation()}>
                    <div className="modal-content">
                        <div className="modal-header d-block">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">Add assistant</h5>
                                <button type="button" className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={onClose} aria-label="Close" />
                            </div>
                            <p className="text-muted small mb-0 mt-1">{room.name} has no assistant.</p>
                        </div>
                        <form onSubmit={submit}>
                            <div className="modal-body text-start">
                                <div className="campus-segmented assistant-tabs mb-3" role="group" aria-label="Who to add">
                                    {[['existing', 'Existing user'], ['new', 'New person']].map(([key, label]) => (
                                        <button key={key} type="button" className={mode === key ? 'active' : ''} aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>
                                    ))}
                                </div>
                                {mode === 'existing' ? (
                                    <>
                                        <label className="form-label small" htmlFor="assistant-user">User</label>
                                        <select id="assistant-user" className="form-select" required value={userId} onChange={event => setUserId(event.target.value)}>
                                            <option value="">Select a user…</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.username} · {u.email}</option>)}
                                        </select>
                                        <p className="assistant-hint">A student becomes a lab assistant. Faculty and administrators keep their role.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label small" htmlFor="assistant-name">Full name / username</label>
                                            <input id="assistant-name" type="text" className="form-control" required value={person.username} onChange={setField('username')} />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label small" htmlFor="assistant-email">Email address</label>
                                            <input id="assistant-email" type="email" className="form-control" required value={person.email} onChange={setField('email')} />
                                        </div>
                                        <label className="form-label small" htmlFor="assistant-password">Initial password</label>
                                        <input id="assistant-password" type="password" className="form-control" required minLength={6} autoComplete="new-password" value={person.password} onChange={setField('password')} />
                                        <p className="assistant-hint">They get an activation email. Share the password with them yourself.</p>
                                    </>
                                )}
                                {error && <p className="assistant-error" role="alert">{error}</p>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary-dim" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-gradient flex-grow-1 fw-bold" disabled={saving}>
                                    {saving ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : <><FiUserPlus className="me-2" /> Add as assistant</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

function EmailModal({ room, assistant, energy, onClose, onDone }) {
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const extras = energy.rows.filter(row => row.live > row.plan);

    const send = async (event) => {
        event.preventDefault();
        setSending(true);
        setError('');
        try {
            const { data } = await api.post(`/api/map/rooms/${room.id}/assistant/email`, { note });
            onDone(data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'The email could not be sent.');
            setSending(false);
        }
    };

    return (
        <Portal>
            <div className="modal show" onClick={onClose}>
                <div className="modal-dialog modal-dialog-centered" onClick={event => event.stopPropagation()}>
                    <div className="modal-content">
                        <div className="modal-header d-block">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">Email energy report</h5>
                                <button type="button" className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={onClose} aria-label="Close" />
                            </div>
                            <p className="text-muted small mb-0 mt-1">To {assistant.username} · {assistant.email}</p>
                        </div>
                        <form onSubmit={send}>
                            <div className="modal-body text-start">
                                <p className="assistant-mail-subject">Action required: {room.name} is using {energy.excessKw.toFixed(2)} kW more than required</p>
                                <div className="assistant-mail-summary">
                                    <div><small>Required</small><strong>{energy.planKw.toFixed(2)} kW</strong></div>
                                    <div><small>Current</small><strong>{energy.liveKw.toFixed(2)} kW</strong></div>
                                    <div className="extra"><small>Extra</small><strong>{energy.excessKw.toFixed(2)} kW</strong></div>
                                </div>
                                <ul className="assistant-mail-list">
                                    {extras.map(row => <li key={row.key}>{row.label}: {row.live} on, {row.plan} required</li>)}
                                    {energy.overcooling && <li>AC set-point: {energy.temp} °C, {energy.planTemp} °C required</li>}
                                </ul>
                                <label className="form-label small" htmlFor="assistant-note">Note (optional)</label>
                                <textarea
                                    id="assistant-note"
                                    className="form-control"
                                    rows="3"
                                    maxLength={MAX_NOTE_LENGTH}
                                    placeholder="Anything the assistant should know"
                                    value={note}
                                    onChange={event => setNote(event.target.value)}
                                />
                                {error && <p className="assistant-error" role="alert">{error}</p>}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary-dim" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-gradient flex-grow-1 fw-bold" disabled={sending}>
                                    {sending ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : <><FiSend className="me-2" /> Send report</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

/** The room's assistant: administrators can add or remove them and email an energy report. */
function LabAssistantPanel({ room, assistant, energy, isAdmin, isMine, onChanged }) {
    const [modal, setModal] = useState(null);
    const [message, setMessage] = useState('');
    const [removeFailed, setRemoveFailed] = useState(false);
    const hasExtraUse = energy.excessKw >= 0.01;

    const finish = (text) => {
        setModal(null);
        setMessage(text);
        onChanged();
    };

    const remove = async () => {
        setModal(null);
        setMessage('');
        try {
            await api.delete(`/api/map/rooms/${room.id}/assistant`);
            setRemoveFailed(false);
            onChanged();
        } catch (err) {
            setRemoveFailed(true);
        }
    };

    if (!assistant && !isAdmin) return null;

    return (
        <section className="campus-panel assistant-panel">
            <div className="campus-panel-head">
                <span className="campus-section-title">Lab assistant</span>
                {isMine && <span className="campus-panel-value">Your room</span>}
            </div>

            {assistant ? (
                <div className="assistant-card">
                    <span className="assistant-avatar"><FiUser /></span>
                    <div className="assistant-text">
                        <strong>{assistant.username}</strong>
                        {assistant.email && <small title={assistant.email}>{assistant.email}</small>}
                    </div>
                    {isAdmin && (
                        <button type="button" className="assistant-icon-btn" title="Remove assistant" aria-label={`Remove ${assistant.username} as assistant`} onClick={() => setModal('remove')}>
                            <FiUserMinus />
                        </button>
                    )}
                </div>
            ) : (
                <div className="assistant-empty">
                    <p>No assistant is assigned to this room.</p>
                    <button type="button" className="assistant-btn" onClick={() => { setMessage(''); setModal('assign'); }}><FiUserPlus /> Add assistant</button>
                </div>
            )}

            {isAdmin && assistant && (
                <>
                    <button type="button" className="assistant-btn primary" disabled={!hasExtraUse} onClick={() => { setMessage(''); setModal('email'); }}>
                        <FiMail /> Email energy report
                    </button>
                    {!hasExtraUse && <p className="assistant-hint">Available when this room uses more than it requires.</p>}
                    {assistant.last_report && (
                        <p className="assistant-hint">
                            Last report by {assistant.last_report.sent_by}, {timeAgo(assistant.last_report.sent_at)} ({assistant.last_report.excess_kw.toFixed(2)} kW extra)
                        </p>
                    )}
                </>
            )}
            {message && <p className="assistant-success" role="status">{message}</p>}
            {removeFailed && <p className="assistant-error" role="alert">Could not remove the assistant. Please try again.</p>}

            {modal === 'assign' && <AssignModal room={room} onClose={() => setModal(null)} onDone={finish} />}
            {modal === 'email' && <EmailModal room={room} assistant={assistant} energy={energy} onClose={() => setModal(null)} onDone={finish} />}
            <ConfirmModal
                show={modal === 'remove'}
                type="confirm"
                title={`Remove ${assistant?.username || 'assistant'}?`}
                message={`They will no longer control ${room.name} or receive its energy reports. Their account stays.`}
                confirmText="Remove"
                tone="danger"
                onConfirm={remove}
                onCancel={() => setModal(null)}
            />
        </section>
    );
}

export default LabAssistantPanel;
