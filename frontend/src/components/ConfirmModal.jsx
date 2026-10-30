import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiInfo, FiXCircle } from 'react-icons/fi';

/**
 * SmartEnergy dialog — replaces native alert() and confirm().
 *
 * Props:
 *   show        (bool)    — whether to display
 *   type        (string)  — 'confirm' | 'alert' | 'success' | 'error' | 'warning'
 *   title       (string)  — heading text
 *   message     (string)  — body text
 *   onConfirm   (fn)      — called on OK / Confirm click
 *   onCancel    (fn)      — called on Cancel, Escape or backdrop click (confirm only)
 *   confirmText (string)  — custom confirm button label
 *   cancelText  (string)  — custom cancel button label
 *   tone        (string)  — confirm button style: 'primary' (default) | 'danger'
 *   icon        (node)    — overrides the type icon
 *   children    (node)    — optional extra content shown under the message
 */

const TYPES = {
    confirm: { icon: FiHelpCircle, accent: '#10b981' },
    alert: { icon: FiInfo, accent: 'var(--accent-sky-text)' },
    success: { icon: FiCheckCircle, accent: '#10b981' },
    error: { icon: FiXCircle, accent: '#ef4444' },
    warning: { icon: FiAlertTriangle, accent: '#f59e0b' },
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
    tone = 'primary',
    icon,
    children,
}) {
    const dialogRef = useRef(null);
    const isConfirm = type === 'confirm' || type === 'warning';
    const { icon: TypeIcon, accent } = TYPES[type] || TYPES.confirm;
    const okLabel = confirmText || (isConfirm ? 'Confirm' : 'OK');
    const noLabel = cancelText || 'Cancel';
    const dismiss = () => (isConfirm ? onCancel?.() : onConfirm?.());

    useEffect(() => {
        if (!show) return undefined;
        // Focus the safe choice first: Cancel for destructive actions, otherwise the primary button
        const target = dialogRef.current?.querySelector(tone === 'danger' && isConfirm ? '[data-cancel]' : '[data-confirm]');
        target?.focus();

        const handler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                dismiss();
            } else if (e.key === 'Tab' && dialogRef.current) {
                // Keep keyboard focus inside the dialog
                const focusable = dialogRef.current.querySelectorAll('button:not([disabled])');
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, isConfirm, tone, onCancel, onConfirm]);

    if (!show) return null;

    return ReactDOM.createPortal(
        <motion.div
            className="cmodal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <motion.div
                ref={dialogRef}
                className="cmodal"
                role={isConfirm ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby="cmodal-title"
                aria-describedby={message ? 'cmodal-message' : undefined}
                style={{ '--cmodal-accent': accent }}
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="cmodal-body">
                    <span className="cmodal-icon" aria-hidden="true">{icon || <TypeIcon />}</span>
                    <div className="cmodal-text">
                        <h2 id="cmodal-title">{title}</h2>
                        {message && <p id="cmodal-message">{message}</p>}
                    </div>
                </div>

                {children && <div className="cmodal-extra">{children}</div>}

                <div className="cmodal-footer">
                    {isConfirm && (
                        <button type="button" className="cmodal-btn secondary" onClick={onCancel} data-cancel>
                            {noLabel}
                        </button>
                    )}
                    <button type="button" className={`cmodal-btn ${tone === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm} data-confirm>
                        {okLabel}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}

export default ConfirmModal;
