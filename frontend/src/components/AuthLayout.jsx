import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import AuthVisual from './AuthVisual';
import { ChargeLine } from './ChargeEffects';
import Wordmark from './Wordmark';
import './AuthLayout.css';

/** Shared frame of the sign-in, signup and password pages. */
const AuthLayout = ({ title, subtitle, children, footer }) => (
    <div className="auth-page">
        <header className="auth-header">
            <Wordmark className="auth-brand" />
            <Link to="/" className="auth-back">
                <FiArrowLeft aria-hidden="true" />
                Back to home
            </Link>
            <ChargeLine className="auth-header-charge" />
        </header>

        <div className="auth-main">
            <div className="auth-body">
                <div className="auth-column">
                    <h1 className="auth-title">{title}</h1>
                    {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                    <div className="auth-panel">{children}</div>
                    {footer && <p className="auth-footer">{footer}</p>}
                </div>
            </div>
            <AuthVisual />
        </div>
    </div>
);

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

function passwordStrength(password) {
    if (password.length < 8) return 0;
    const mixed = /[a-z]/.test(password) && /[A-Z]/.test(password);
    const digit = /\d/.test(password);
    const symbol = /[^A-Za-z0-9]/.test(password);
    return 1 + (password.length >= 12 ? 1 : 0) + (mixed && digit ? 1 : 0) + (symbol ? 1 : 0);
}

/** Fills up like a charge level as the password gets stronger. Advice only: the server sets the rule. */
const PasswordMeter = ({ password }) => {
    const score = passwordStrength(password);
    return (
        <div className={`auth-meter is-level-${score}`}>
            <div className="auth-meter-bars" aria-hidden="true">
                {[1, 2, 3, 4].map(level => (
                    <span key={level} className={score >= level ? 'is-on' : ''} />
                ))}
            </div>
            <span className="auth-meter-label" aria-live="polite">{STRENGTH_LABELS[score]}</span>
        </div>
    );
};

export const AuthNotice = ({ tone = 'info', children }) => (
    <div className={`auth-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
        {children}
    </div>
);

export const AuthField = ({ id, label, hint, action, ...inputProps }) => (
    <div className="auth-field">
        <div className="auth-label-row">
            <label htmlFor={id}>{label}</label>
            {action}
        </div>
        <input id={id} className="auth-input" aria-describedby={hint ? `${id}-hint` : undefined} {...inputProps} />
        {hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}
    </div>
);

export const PasswordField = ({ id, label, hint, action, meter = false, ...inputProps }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="auth-field">
            <div className="auth-label-row">
                <label htmlFor={id}>{label}</label>
                {action}
            </div>
            <div className="auth-password">
                <input
                    id={id}
                    className="auth-input"
                    type={visible ? 'text' : 'password'}
                    aria-describedby={hint ? `${id}-hint` : undefined}
                    {...inputProps}
                />
                <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                >
                    {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
            </div>
            {meter && inputProps.value && <PasswordMeter password={inputProps.value} />}
            {hint && <p id={`${id}-hint`} className="auth-hint">{hint}</p>}
        </div>
    );
};

export default AuthLayout;
