import React from 'react';

/**
 * LuminousBackground — low-cost ambient backdrop behind the app.
 *
 * Every animated layer only changes `transform` or `opacity`, which the browser
 * composites on the GPU without repainting. Softness comes from radial gradients
 * painted once, never from `filter: blur()` (re-rasterised every frame when animated,
 * which is what made the previous version slow). Styles live in index.css (.lbg-*);
 * motion stops under prefers-reduced-motion.
 */
const GLINTS = [
    { top: '18%', left: '22%', delay: '0s' },
    { top: '34%', left: '78%', delay: '2.5s' },
    { top: '66%', left: '40%', delay: '5s' },
    { top: '80%', left: '86%', delay: '7.5s' }
];

const LuminousBackground = ({ className = '' }) => (
    <div className={`lbg-root ${className}`} aria-hidden="true">
        <div className="lbg-glow lbg-glow-a" />
        <div className="lbg-glow lbg-glow-b" />
        <div className="lbg-grid" />
        {GLINTS.map((g, i) => (
            <span key={i} className="lbg-glint" style={{ top: g.top, left: g.left, animationDelay: g.delay }} />
        ))}
    </div>
);

export default LuminousBackground;
