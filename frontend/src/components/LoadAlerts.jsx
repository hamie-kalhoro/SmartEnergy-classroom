import React, { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiChevronDown, FiCornerUpLeft, FiCrosshair, FiUser } from 'react-icons/fi';

const SEVERITY_RANK = { warning: 1, critical: 2 };
const SEVERITY_LABEL = { warning: 'Warning', critical: 'Critical' };

// Small excesses (a light or a single fan) are normal and must not raise an alarm.
const WARNING_MIN_KW = 0.15;
const WARNING_MIN_PCT = 20;
const WARNING_ALWAYS_KW = 0.3;  // an AC-heavy lab hides this behind its large base load
const CRITICAL_MIN_KW = 1;      // about one AC above the plan
const CRITICAL_PCT = 50;
const CRITICAL_PCT_MIN_KW = 0.5;

function severityFor(excessKw, pct) {
    if (excessKw >= CRITICAL_MIN_KW || (pct >= CRITICAL_PCT && excessKw >= CRITICAL_PCT_MIN_KW)) return 'critical';
    if (excessKw >= WARNING_ALWAYS_KW || (excessKw >= WARNING_MIN_KW && pct >= WARNING_MIN_PCT)) return 'warning';
    return null;
}

/** Compare a room's live devices with its recommended plan. Returns null when within plan. */
export function evaluateLoadAlert(room, state, plan, liveKw, planKw) {
    const excessKw = Number((liveKw - planKw).toFixed(2));
    const pct = planKw > 0 ? (excessKw / planKw) * 100 : 0;
    const severity = severityFor(excessKw, pct);
    return severity ? { room, severity, liveKw, planKw, excessKw } : null;
}

export function sortAlerts(alerts) {
    return [...alerts].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.excessKw - a.excessKw);
}

export function isAcknowledged(alert, meta) {
    return (SEVERITY_RANK[meta?.ack_severity] || 0) >= SEVERITY_RANK[alert.severity];
}

export function timeAgo(value) {
    if (!value) return '';
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

function changedBy(meta) {
    if (!meta?.updated_by) return 'Change source not recorded';
    return `Changed by ${meta.updated_by}, ${timeAgo(meta.updated_at)}`;
}

function StatusChip({ alert, meta }) {
    return isAcknowledged(alert, meta)
        ? <span className="load-alert-chip acked"><FiCheck /> Acknowledged</span>
        : <span className="load-alert-chip">Unacknowledged</span>;
}

/** Overlay on the map listing every active alert, most serious first. */
export function AlertCenter({ alerts, metaFor, selectedId, canControlRoom, onView, onAcknowledge }) {
    const [collapsed, setCollapsed] = useState(false);
    if (!alerts.length) return null;
    const unacknowledged = alerts.filter(alert => !isAcknowledged(alert, metaFor(alert.room.id))).length;

    return (
        <section className={`load-alert-center ${collapsed ? 'collapsed' : ''}`} aria-label="Load alerts">
            <button
                type="button"
                className="load-alert-center-head"
                onClick={() => setCollapsed(!collapsed)}
                aria-expanded={!collapsed}
            >
                <FiAlertTriangle />
                <span>
                    <strong>{alerts.length} load {alerts.length === 1 ? 'alert' : 'alerts'}</strong>
                    <small>{unacknowledged ? `${unacknowledged} need acknowledgement` : 'All acknowledged'}</small>
                </span>
                <FiChevronDown className="load-alert-chevron" />
            </button>
            {!collapsed && (
                <ul>
                    {alerts.map(alert => {
                        const meta = metaFor(alert.room.id);
                        const acknowledged = isAcknowledged(alert, meta);
                        return (
                            <li key={alert.room.id} className={`sev-${alert.severity} ${selectedId === alert.room.id ? 'active' : ''}`}>
                                <div className="load-alert-row">
                                    <span className={`load-alert-dot ${acknowledged ? '' : 'blink'}`} />
                                    <strong title={alert.room.name}>{alert.room.name}</strong>
                                    <span className="load-alert-excess">+{alert.excessKw.toFixed(2)} kW</span>
                                </div>
                                <div className="load-alert-meta">
                                    <p title={changedBy(meta)}>{SEVERITY_LABEL[alert.severity]} · {changedBy(meta)}</p>
                                    <button type="button" title="Locate on map" aria-label={`Locate ${alert.room.name} on map`} onClick={() => onView(alert.room)}><FiCrosshair /></button>
                                    {canControlRoom(alert.room) && !acknowledged && (
                                        <button type="button" title="Acknowledge" aria-label={`Acknowledge alert for ${alert.room.name}`} onClick={() => onAcknowledge(alert)}><FiCheck /></button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/** Required versus current energy of the selected room, always visible in the inspector. */
export function EnergyPanel({ energy, severity }) {
    const { liveKw, planKw, excessKw, rows, overcooling, temp, planTemp } = energy;
    const scale = Math.max(liveKw, planKw) || 1;
    const status = excessKw >= 0.01
        ? { tone: 'over', label: `${excessKw.toFixed(2)} kW extra` }
        : excessKw <= -0.01
            ? { tone: 'under', label: `${Math.abs(excessKw).toFixed(2)} kW saved` }
            : { tone: 'on', label: 'As required' };

    return (
        <section className={`campus-panel energy-panel ${severity ? `sev-${severity}` : ''}`}>
            <div className="campus-panel-head">
                <span className="campus-section-title">Energy consumption</span>
                <span className={`energy-status ${status.tone}`}>{status.label}</span>
            </div>
            <div className="energy-bars">
                <span>Required</span>
                <div><i className="plan" style={{ width: `${(planKw / scale) * 100}%` }} /></div>
                <b>{planKw.toFixed(2)} kW</b>
                <span>Currently using</span>
                <div><i className={`live ${status.tone}`} style={{ width: `${(liveKw / scale) * 100}%` }} /></div>
                <b>{liveKw.toFixed(2)} kW</b>
            </div>
            <table className="energy-devices">
                <thead>
                    <tr><th scope="col">Device</th><th scope="col">Required</th><th scope="col">On now</th><th scope="col">Load now</th></tr>
                </thead>
                <tbody>
                    {rows.map(row => (
                        <tr key={row.key} className={row.live > row.plan ? 'over' : ''}>
                            <td>{row.label}</td>
                            <td>{row.plan}</td>
                            <td>{row.live}</td>
                            <td>{row.liveKw.toFixed(2)} kW</td>
                        </tr>
                    ))}
                    {overcooling && (
                        <tr className="over"><td>AC set-point</td><td>{planTemp} °C</td><td>{temp} °C</td><td>Too low</td></tr>
                    )}
                </tbody>
            </table>
            <p className="energy-note">Estimated from rated device power and this room&apos;s headcount. 1 kW used for one hour is 1 kWh.</p>
        </section>
    );
}

/** The selected room's alert, shown at the top of the inspector. */
export function RoomAlertBanner({ alert, meta, canControl, onAcknowledge, onRestore }) {
    const acknowledged = isAcknowledged(alert, meta);

    return (
        <section className={`load-alert-banner sev-${alert.severity} ${acknowledged ? '' : 'blink'}`} role="status">
            <div className="load-alert-banner-head">
                <FiAlertTriangle />
                <strong>{SEVERITY_LABEL[alert.severity]} load deviation</strong>
                <StatusChip alert={alert} meta={meta} />
            </div>
            <p className="load-alert-summary">
                This room is using <b>{alert.excessKw.toFixed(2)} kW more</b> than its headcount requires.
            </p>

            <p className="load-alert-audit"><FiUser /> {changedBy(meta)}</p>
            {acknowledged && meta?.ack_by && (
                <p className="load-alert-audit"><FiCheck /> Acknowledged by {meta.ack_by}, {timeAgo(meta.ack_at)}</p>
            )}

            {canControl ? (
                <div className="load-alert-actions">
                    {!acknowledged && <button type="button" onClick={() => onAcknowledge(alert)}><FiCheck /> Acknowledge</button>}
                    <button type="button" className="primary" onClick={() => onRestore(alert.room)}><FiCornerUpLeft /> Restore plan</button>
                </div>
            ) : (
                <p className="load-alert-audit">This room&apos;s assistant, faculty or an administrator can resolve this alert.</p>
            )}
        </section>
    );
}
