import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SmartEnergy Custom Modal — replaces native alert() and confirm() dialogs.
 *
 * Props:
 *   show        (bool)    — whether to display
 *   type        (string)  — 'confirm' | 'alert' | 'success' | 'error' | 'warning'
 *   title       (string)  — heading text
 *   message     (string)  — body text
 *   onConfirm   (fn)      — called on OK / Confirm click
 *   onCancel    (fn)      — called on Cancel or backdrop click (confirm only)
 *   confirmText (string)  — custom confirm button label
 *   cancelText  (string)  — custom cancel button label
 */

const iconMap = {
    confirm: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#52eea3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    alert: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    success: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

const accentMap = {
    confirm: '#00d26a',
    alert: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
};

function ConfirmModal({
    show,
    type = 'confirm',
    title = 'Are you sure?',
    message = '',
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
}) {
    const isConfirm = type === 'confirm' || type === 'warning';
    const accent = accentMap[type] || accentMap.confirm;

    // Default button labels
    const okLabel = confirmText || (isConfirm ? 'Confirm' : 'OK');
    const noLabel = cancelText || 'Cancel';

    // Close on Escape
    useEffect(() => {
        if (!show) return;
        const handler = (e) => {
            if (e.key === 'Escape') {
                isConfirm ? onCancel?.() : onConfirm?.();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [show, isConfirm, onCancel, onConfirm]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            isConfirm ? onCancel?.() : onConfirm?.();
                        }
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            width: '100%',
                            maxWidth: '380px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            boxShadow: `0 25px 60px rgba(0,0,0,0.4), 0 0 40px ${accent}15`,
                        }}
                    >
                        {/* Accent Top Bar */}
                        <div style={{
                            height: '3px',
                            background: `linear-gradient(90deg, ${accent}, ${accent}88)`,
                        }} />

                        {/* Content */}
                        <div style={{ padding: '1.75rem 1.75rem 1.25rem', textAlign: 'center' }}>
                            {/* Icon */}
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '16px',
                                background: `${accent}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem',
                            }}>
                                {iconMap[type] || iconMap.confirm}
                            </div>

                            {/* Title */}
                            <h4 style={{
                                margin: '0 0 0.5rem',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: 'var(--text)',
                                fontFamily: 'var(--font-heading)',
                            }}>
                                {title}
                            </h4>

                            {/* Message */}
                            {message && (
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.5,
                                }}>
                                    {message}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            padding: '0 1.75rem 1.5rem',
                            justifyContent: 'center',
                        }}>
                            {isConfirm && (
                                <button
                                    onClick={onCancel}
                                    style={{
                                        flex: 1,
                                        padding: '0.65rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-elevated)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'var(--border)'}
                                    onMouseLeave={(e) => e.target.style.background = 'var(--bg-elevated)'}
                                >
                                    {noLabel}
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '0.6rem 1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: accent,
                                    color: 'white',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: `0 4px 15px ${accent}40`,
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                {okLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ConfirmModal;
