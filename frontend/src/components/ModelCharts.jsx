// Model evaluation charts shared by the ML Laboratory and the Intelligence Profile.
import React from 'react';

export const FEATURE_LABELS = {
    day: 'Day of week',
    hour: 'Time slot',
    type: 'Theory / lab',
    batch: 'Batch',
    section: 'Section',
    week: 'Semester week',
    hist_attendance: 'Recent average attendance',
    prev_attendance: 'Last class attendance'
};

export function BaselineBars({ accuracy, history, majority }) {
    const rows = [
        { label: 'This model', value: accuracy, primary: true },
        { label: 'Reuse recent average', value: history },
        { label: 'Always most common level', value: majority }
    ];
    return (
        <div className="ml-bars">
            {rows.map(r => (
                <div key={r.label} className={`ml-bar-row ${r.primary ? 'primary' : ''}`}>
                    <span>{r.label}</span>
                    <div className="ml-bar"><i style={{ width: `${Math.min(100, r.value || 0)}%` }} /></div>
                    <strong>{(r.value || 0).toFixed(1)}%</strong>
                </div>
            ))}
        </div>
    );
}

export function FeatureBars({ importance, limit }) {
    const entries = Object.entries(importance || {}).sort((a, b) => b[1] - a[1]).slice(0, limit || undefined);
    const max = Math.max(...entries.map(e => e[1]), 0.0001);
    return (
        <div className="ml-features">
            {entries.map(([key, val]) => (
                <div key={key} className="ml-feature">
                    <div className="ml-feature-head">
                        <span>{FEATURE_LABELS[key] || key}</span>
                        <strong>{Math.round(val * 100)}%</strong>
                    </div>
                    <div className="ml-feature-bar"><i style={{ width: `${(val / max) * 100}%` }} /></div>
                </div>
            ))}
        </div>
    );
}

export function ConfusionMatrix({ cm }) {
    if (!cm?.matrix?.length) return null;
    const max = Math.max(...cm.matrix.flat(), 1);
    return (
        <div className="ml-cm">
            <div className="ml-cm-grid" style={{ gridTemplateColumns: `88px repeat(${cm.labels.length}, minmax(0, 1fr))` }}>
                <span className="ml-cm-corner">Actual ↓ / Predicted →</span>
                {cm.labels.map(l => <span key={`h-${l}`} className="ml-cm-head" title={l}>{l.slice(0, 3)}</span>)}
                {cm.matrix.map((row, i) => (
                    <React.Fragment key={cm.labels[i]}>
                        <span className="ml-cm-label">{cm.labels[i]}</span>
                        {row.map((v, j) => (
                            <span
                                key={j}
                                className={`ml-cm-cell ${i === j ? 'diag' : ''}`}
                                style={{ '--a': v / max }}
                                title={`Actual ${cm.labels[i]}, predicted ${cm.labels[j]}: ${v}`}
                            >
                                {v}
                            </span>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}
