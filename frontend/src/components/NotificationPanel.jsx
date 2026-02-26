import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api';
import { FiBell, FiAlertCircle, FiCheckCircle, FiTrash2, FiClock, FiWifiOff, FiDatabase, FiActivity } from 'react-icons/fi';

function NotificationPanel({ user }) {
    // ─── Local State & Persistence ───
    const [notifications, setNotifications] = useState(() => {
        const saved = localStorage.getItem(`notifications_${user.id}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [open, setOpen] = useState(false);
    const [offline, setOffline] = useState(!navigator.onLine);
    const panelRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // ─── Persistence Sync ───
    useEffect(() => {
        localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }, [notifications, user.id]);

    // ─── Online/Offline Detection ───
    useEffect(() => {
        const handleOnline = () => setOffline(false);
        const handleOffline = () => setOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [loading, setLoading] = useState(false);

    // ─── Fetch & Poll ───
    useEffect(() => {
        fetchNotifications(true);
        const interval = setInterval(() => fetchNotifications(false), 15000); // 15s for better responsiveness
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async (isInitial = false) => {
        if (!navigator.onLine) return;
        if (isInitial) setLoading(true);
        try {
            const res = await api.get('/api/notifications');
            // Server is source of truth for new items
            setNotifications(res.data);
        } catch (err) {
            console.error("Notification Sync Failed:", err);
            // On failure, we just keep using our local state (loaded from init)
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        // Optimistic UI Update
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );

        if (!navigator.onLine) return; // Keep as locally read until online

        try {
            await api.post(`/api/notifications/${id}/read`);
        } catch (err) {
            console.error("Status Sync Failed (Read):", err);
        }
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem(`notifications_${user.id}`);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'admin_request': return <FiAlertCircle style={{ color: '#f59e0b' }} />;
            case 'user_deletion_alert': return <FiTrash2 style={{ color: '#ef4444' }} />;
            case 'admin_approved': return <FiCheckCircle style={{ color: '#10b981' }} />;
            case 'energy_report': return <FiZap style={{ color: '#00d26a' }} />;
            default: return <FiActivity style={{ color: '#6366f1' }} />;
        }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        if (diffMs < 0) return 'Just now'; // Handle clock drift
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h ago`;
        return `${Math.floor(diffH / 24)}d ago`;
    };

    // Outside Click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={panelRef} style={{ position: 'fixed', top: 0, right: '11.9rem', zIndex: 1001 }}>
            {/* Bell Button — ceiling-attached */}
            <button
                onClick={() => setOpen(!open)}
                title="Notifications"
                className="notif-bell-ceiling"
                style={{
                    position: 'relative',
                    padding: '0.6rem 0.9rem',
                    borderRadius: '0 0 14px 14px',
                    border: '1px solid var(--border)',
                    borderTop: 'none',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                }}
            >
                <FiBell className={unreadCount > 0 ? 'bell-ring' : ''} size={16} />
                {unreadCount > 0 && (
                    <span
                        className="notif-badge-pulse"
                        style={{
                            position: 'absolute',
                            top: '4px',
                            right: '6px',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.6rem',
                            fontWeight: '800',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            width: '350px',
                            maxHeight: '480px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(20px)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text)' }}>
                                    Portal Notifications
                                </span>
                                <div className="d-flex align-items-center gap-2">
                                    {offline && <span title="Offline Mode" className="text-danger d-flex align-items-center"><FiWifiOff size={14} /></span>}
                                    <button onClick={clearAll} className="btn p-0 text-muted small hover-text-danger" style={{ fontSize: '0.6rem', fontWeight: 'bold', transition: 'color 0.2s' }}>CLEAR ALL</button>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <FiDatabase size={10} className="text-primary" />
                                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    {offline ? 'Local Storage Active' : 'Synced with Cloud Hub'}
                                </span>
                            </div>
                        </div>

                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="skeleton p-3 mb-2" style={{ height: '70px', borderRadius: '12px' }}></div>
                                ))
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center', opacity: 0.5 }}>
                                    <FiBell size={40} className="mb-3 text-muted" />
                                    <p className="m-0 small fw-bold text-muted">No notifications yet</p>
                                    <p className="m-0 text-muted" style={{ fontSize: '0.7rem' }}>System status is currently nominal.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <motion.div
                                        key={n.id}
                                        layout
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                        style={{
                                            padding: '1rem',
                                            marginBottom: '0.5rem',
                                            borderRadius: '12px',
                                            background: n.is_read ? 'transparent' : 'rgba(0, 210, 106, 0.05)',
                                            border: '1px solid',
                                            borderColor: n.is_read ? 'transparent' : 'rgba(0, 210, 106, 0.1)',
                                            cursor: n.is_read ? 'default' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            gap: '12px'
                                        }}
                                        whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'var(--bg-elevated)', display: 'flex',
                                            alignItems: 'center', justifyCenter: 'center', flexShrink: 0,
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ margin: 'auto' }}>{getIcon(n.type)}</div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800', opacity: 0.6, color: 'var(--text-muted)' }}>
                                                    {n.type.replace(/_/g, ' ')}
                                                </span>
                                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }} className="d-flex align-items-center gap-1">
                                                    <FiClock size={10} /> {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4, fontWeight: n.is_read ? '400' : '600' }}>
                                                {n.message}
                                            </p>
                                        </div>
                                        {!n.is_read && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', alignSelf: 'center', boxShadow: '0 0 10px var(--primary)', flexShrink: 0 }} />
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Footer Activity Tracker */}
                        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    <FiActivity size={12} className="text-primary" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SYSTEM TRACKING</span>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                    <div className="pulse-green" style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '900' }}>ONLINE</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default NotificationPanel;
