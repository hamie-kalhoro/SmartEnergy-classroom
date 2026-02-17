import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api';

function NotificationPanel({ user }) {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Fetch notifications on mount and periodically
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Close panel on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications');
            setNotifications(res.data);
        } catch (err) {
            // Silently fail
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.post(`/api/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            // Silently fail
        }
    };

    const getIcon = (type) => {
        if (type === 'admin_request') {
            return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
            );
        }
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        );
    };

    const timeAgo = (dateStr) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h ago`;
        const diffD = Math.floor(diffH / 24);
        return `${diffD}d ago`;
    };

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
                {/* Dynamic Bell SVG */}
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={unreadCount > 0 ? 'bell-ring' : ''}
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* Badge */}
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
                            fontWeight: '700',
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
                            width: '340px',
                            maxHeight: '420px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(20px)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '1rem 1.25rem',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>
                                Notifications
                            </span>
                            {unreadCount > 0 && (
                                <span
                                    style={{
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#ef4444',
                                        padding: '2px 8px',
                                        borderRadius: '99px',
                                        fontSize: '0.7rem',
                                        fontWeight: '600',
                                    }}
                                >
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        {/* List */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {notifications.length === 0 ? (
                                <div
                                    style={{
                                        padding: '2.5rem 1rem',
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: '8px' }}>
                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    </svg>
                                    <p style={{ margin: 0 }}>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                        style={{
                                            padding: '0.85rem 1.25rem',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: n.is_read ? 'default' : 'pointer',
                                            background: n.is_read
                                                ? 'transparent'
                                                : 'rgba(124, 58, 237, 0.04)',
                                            transition: 'background 0.2s ease',
                                            display: 'flex',
                                            gap: '10px',
                                            alignItems: 'flex-start',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!n.is_read)
                                                e.currentTarget.style.background =
                                                    'rgba(124, 58, 237, 0.08)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = n.is_read
                                                ? 'transparent'
                                                : 'rgba(124, 58, 237, 0.04)';
                                        }}
                                    >
                                        {/* Icon */}
                                        <div
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '10px',
                                                background:
                                                    n.type === 'admin_request'
                                                        ? 'rgba(245, 158, 11, 0.12)'
                                                        : 'rgba(34, 197, 94, 0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '2px',
                                            }}
                                        >
                                            {getIcon(n.type)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: '0.8rem',
                                                    fontWeight: n.is_read ? '400' : '600',
                                                    color: 'var(--text)',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {n.message}
                                            </p>
                                            <span
                                                style={{
                                                    fontSize: '0.65rem',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '3px',
                                                    display: 'block',
                                                }}
                                            >
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>

                                        {/* Unread Dot */}
                                        {!n.is_read && (
                                            <div
                                                style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#7c3aed',
                                                    flexShrink: 0,
                                                    marginTop: '6px',
                                                    boxShadow: '0 0 6px rgba(124, 58, 237, 0.5)',
                                                }}
                                            />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default NotificationPanel;
