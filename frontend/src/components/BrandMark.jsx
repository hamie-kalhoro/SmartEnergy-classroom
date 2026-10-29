import React from 'react';

/**
 * SmartEnergy brand mark: an open "power" ring with a lightning bolt through it,
 * on an emerald tile. Motion is deliberately restrained — the ring draws in once,
 * a soft sheen passes every few seconds, and the bolt brightens on hover.
 * All motion is disabled under prefers-reduced-motion (see .brand-mark in index.css).
 */
const BrandMark = ({ size = 36, title = 'SmartEnergy' }) => (
    <span className="brand-mark" style={{ width: size, height: size }} role="img" aria-label={title}>
        <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} fill="none" aria-hidden="true">
            {/* Open ring, gap centred at the top like a power symbol */}
            <path
                className="brand-mark-ring"
                d="M16.125 4.855A8.25 8.25 0 1 1 7.875 4.855"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                pathLength="1"
            />
            <path
                className="brand-mark-bolt"
                d="M13.3 5.4 8.2 13.1h3.5l-.95 5.5 5.05-7.7h-3.5l1-5.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeLinejoin="round"
            />
        </svg>
    </span>
);

export default BrandMark;
