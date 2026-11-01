import React from 'react';
import { Link } from 'react-router-dom';
import './ChargeEffects.css';

/** The SmartClass name and bolt, linking home. The className sets its colours. */
const Wordmark = ({ className }) => (
    <Link to="/" className={className} aria-label="SmartClass home">
        <svg className="wordmark-bolt" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span>SmartClass</span>
    </Link>
);

export default Wordmark;
