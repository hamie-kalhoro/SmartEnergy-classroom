import React from 'react';
import { ChargeArc } from './ChargeEffects';

const STEPS = ['Predict occupancy', 'Recommend lights, fans and AC', 'Flag rooms above their load'];

// Charge flows from the occupancy prediction, through SmartClass, out to each device.
const DEVICE_TRACES = [
    { label: 'Lights', x: 80, d: 'M240 262 V300 H80 V356' },
    { label: 'Fans', x: 240, d: 'M240 262 V356' },
    { label: 'AC', x: 400, d: 'M240 262 V300 H400 V356' }
];

/** Decorative panel beside the sign-in forms. It runs on CSS alone, so it never re-renders a form. */
const AuthVisual = () => (
    <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-inner">
            <svg className="auth-circuit" viewBox="0 0 480 420">
                <path className="auth-trace" d="M240 72 V178" />
                <path className="auth-pulse auth-pulse-in" pathLength="100" d="M240 72 V178" />

                {DEVICE_TRACES.map(trace => (
                    <g key={trace.label}>
                        <path className="auth-trace" d={trace.d} />
                        <path className="auth-pulse auth-pulse-out" pathLength="100" d={trace.d} />
                    </g>
                ))}

                <g className="auth-node auth-node-in">
                    <rect x="180" y="32" width="120" height="40" rx="6" />
                    <text x="240" y="57">Occupancy</text>
                </g>

                <circle className="auth-core-ring" cx="240" cy="220" r="42" />
                <path className="auth-core-bolt" transform="translate(213 193) scale(2.25)" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />

                <ChargeArc d="M198 208 L184 200 L188 216 L170 212" />
                <ChargeArc slow d="M282 232 L298 226 L292 244 L312 240" />

                {DEVICE_TRACES.map(trace => (
                    <g key={trace.label} className={`auth-node auth-node-out ${trace.label === 'AC' ? 'is-over' : ''}`}>
                        <rect x={trace.x - 52} y="356" width="104" height="40" rx="6" />
                        <text x={trace.x} y="381">{trace.label}</text>
                    </g>
                ))}
            </svg>

            <ol className="auth-steps">
                {STEPS.map((step, i) => (
                    <li key={step} className={`auth-step auth-step-${i + 1}`}>{step}</li>
                ))}
            </ol>
        </div>
    </aside>
);

export default AuthVisual;
