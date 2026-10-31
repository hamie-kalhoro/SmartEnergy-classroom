import React from 'react';
import './ChargeEffects.css';

/** A pulse of charge that runs along a hairline now and then. The parent must be positioned. */
export const ChargeLine = ({ className = '' }) => (
    <span className={`charge-line ${className}`} aria-hidden="true"><span /></span>
);

/** A short electric arc inside an SVG: a soft halo under a bright core. */
export const ChargeArc = ({ d, slow = false }) => (
    <g className={`charge-arc ${slow ? 'is-slow' : ''}`}>
        <path className="charge-arc-halo" d={d} />
        <path className="charge-arc-core" d={d} />
    </g>
);
