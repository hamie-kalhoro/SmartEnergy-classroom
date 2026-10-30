import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiActivity, FiAlertTriangle, FiCpu, FiLogIn, FiLogOut, FiPower, FiRadio, FiRefreshCw, FiShield, FiSun, FiWind, FiZap
} from 'react-icons/fi';
import api from '../api';
import './HardwarePortal.css';

const POLL_MS = 1000;
const FULL_LOAD_STUDENTS = 6;

const DEVICES = [
    { key: 'light_1', label: 'Light 1', icon: FiSun, stage: 'Stage 1' },
    { key: 'fan_1', label: 'Fan 1', icon: FiWind, stage: 'Stage 1' },
    { key: 'light_2', label: 'Light 2', icon: FiSun, stage: 'Stage 2' },
    { key: 'fan_2', label: 'Fan 2', icon: FiWind, stage: 'Stage 2' },
];

const RULES = [
    { load: 0, occupancy: '0 students', action: 'Everything off' },
    { load: 50, occupancy: '1 to 5 students', action: 'Light 1 and Fan 1 on' },
    { load: 100, occupancy: '6 or more students', action: 'Both lights and both fans on' },
];

const PIPELINE = [
    { icon: FiRadio, title: 'IR sensors', text: 'Detect each person crossing the doorway' },
    { icon: FiCpu, title: 'ESP32', text: 'Updates the count and picks the load stage' },
    { icon: FiZap, title: 'Relays', text: 'Switch the lights and fans directly' },
    { icon: FiActivity, title: 'This portal', text: 'Mirrors the board live over USB' },
];

const EVENT_META = {
    entry: { icon: FiLogIn, tone: 'in', title: 'Student entered', detail: e => `${e.students} in room` },
    exit: { icon: FiLogOut, tone: 'out', title: 'Student exited', detail: e => `${e.students} in room` },
    load: { icon: FiZap, tone: 'load', title: 'Load changed', detail: e => `${e.load_percent}%` },
    boot: { icon: FiPower, tone: 'boot', title: 'Board restarted', detail: () => 'Count reset to 0' },
};

const deviceState = (devices, key) => (devices ? (devices[key] ? 'on' : 'off') : 'unknown');
const stateLabel = { on: 'ON', off: 'OFF', unknown: '--' };

function timeAgo(iso) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}

function Bulb({ cx, baseX, label, state }) {
    return (
        <g className={`hwp-bulb is-${state}`}>
            <circle className="hwp-bulb-glow" cx={cx} cy="235" r="96" fill="url(#hwp-bulb-glow)" />
            <rect className="hwp-part" x={baseX} y="215" width="45" height="40" rx="5" />
            <circle className="hwp-bulb-glass" cx={cx} cy="235" r="50" />
            <text className="hwp-svg-label" x={cx} y="312" textAnchor="middle">{label}</text>
            <text className="hwp-svg-state" x={cx} y="332" textAnchor="middle">{stateLabel[state]}</text>
        </g>
    );
}

function Fan({ cx, cy, labelY, label, state }) {
    return (
        <g className={`hwp-fan is-${state}`}>
            <rect className="hwp-part" x={cx - 44} y={cy - 44} width="88" height="88" rx="14" />
            <circle className="hwp-fan-well" cx={cx} cy={cy} r="35" />
            <g className="hwp-rotor">
                {[0, 90, 180, 270].map(angle => (
                    <ellipse key={angle} cx={cx} cy={cy - 18} rx="9" ry="16" transform={`rotate(${angle} ${cx} ${cy})`} />
                ))}
            </g>
            <text className="hwp-svg-label" x={cx} y={labelY} textAnchor="middle">{label}</text>
            <text className="hwp-svg-state" x={cx} y={labelY + 19} textAnchor="middle">{stateLabel[state]}</text>
        </g>
    );
}

function HardwareTwin({ devices, flash, stale }) {
    const state = key => deviceState(devices, key);
    const wire = (key, d) => <path className={`hwp-wire is-${state(key)}`} d={d} />;
    const relayX = { light_1: 325, fan_1: 395, light_2: 465, fan_2: 535 };

    return (
        <svg className={`hwp-twin ${stale ? 'is-stale' : ''}`} viewBox="0 0 860 470" role="img"
            aria-label={`Diagram of the demo board. ${DEVICES.map(d => `${d.label} ${stateLabel[state(d.key)]}`).join(', ')}.`}>
            <defs>
                <radialGradient id="hwp-bulb-glow">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
            </defs>

            {wire('light_1', 'M295 295 H250 V235 H197')}
            {wire('fan_1', 'M295 330 H240 V385 H219')}
            {wire('fan_2', 'M565 295 H605 V95 H641')}
            {wire('light_2', 'M565 330 H632 V235 H663')}

            <Bulb cx="105" baseX="152" label="LIGHT 1" state={state('light_1')} />
            <Bulb cx="755" baseX="663" label="LIGHT 2" state={state('light_2')} />
            <Fan cx="175" cy="385" labelY="447" label="FAN 1" state={state('fan_1')} />
            <Fan cx="685" cy="95" labelY="157" label="FAN 2" state={state('fan_2')} />

            <rect className="hwp-enclosure" x="270" y="90" width="320" height="290" rx="18" />
            <path className="hwp-signal" d="M355 190 V270" />
            <path className="hwp-signal" d="M470 135 H415" />
            <path className="hwp-signal" d="M402 378 H283 V151 H295" />

            <g>
                <rect className="hwp-board" x="295" y="112" width="120" height="78" rx="8" />
                <rect className="hwp-chip" x="325" y="128" width="60" height="46" rx="4" />
                <text className="hwp-svg-chip" x="355" y="156" textAnchor="middle">ESP32</text>
            </g>

            <g className={`hwp-sensor ${flash === 'entry' ? 'is-firing' : ''}`}>
                <rect className="hwp-board" x="470" y="112" width="95" height="46" rx="7" />
                <circle className="hwp-sensor-led" cx="490" cy="135" r="6" />
                <text className="hwp-svg-small" x="526" y="139" textAnchor="middle">IR ENTRY</text>
            </g>

            <g className={`hwp-sensor ${flash === 'exit' ? 'is-firing' : ''}`}>
                <rect className="hwp-board" x="402" y="358" width="96" height="40" rx="7" />
                <circle className="hwp-sensor-led" cx="420" cy="378" r="6" />
                <text className="hwp-svg-small" x="458" y="382" textAnchor="middle">IR EXIT</text>
            </g>

            <rect className="hwp-board" x="295" y="270" width="270" height="78" rx="8" />
            {DEVICES.map(({ key, label }) => (
                <g key={key} className={`hwp-relay is-${state(key)}`}>
                    <rect x={relayX[key] - 26} y="282" width="52" height="34" rx="4" />
                    <circle cx={relayX[key]} cy="329" r="4" />
                    <text className="hwp-svg-small" x={relayX[key]} y="303" textAnchor="middle">
                        {label.replace('Light ', 'L').replace('Fan ', 'F')}
                    </text>
                </g>
            ))}
        </svg>
    );
}

function HardwarePortal() {
    const [status, setStatus] = useState(null);
    const [apiError, setApiError] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [resetError, setResetError] = useState('');
    const [flash, setFlash] = useState(null);
    const lastEventId = useRef(null);
    const flashTimer = useRef(null);

    const refresh = useCallback(async () => {
        try {
            const res = await api.get('/api/hardware/status');
            setStatus(res.data);
            setApiError(false);
        } catch {
            setApiError(true);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let timer;
        const tick = async () => {
            await refresh();
            if (!cancelled) timer = setTimeout(tick, POLL_MS);
        };
        tick();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [refresh]);

    // Light up the sensor that fired, for events that arrive while the page is open.
    // An entry and its load change can land in the same poll, so search all new events.
    useEffect(() => {
        const latest = status?.events ?? [];
        if (latest.length === 0) return;
        const previousId = lastEventId.current;
        lastEventId.current = latest[0].id;
        if (previousId === null) return;
        const fired = latest.find(e => e.id > previousId && (e.type === 'entry' || e.type === 'exit'));
        if (!fired) return;
        setFlash(fired.type);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
    }, [status]);

    useEffect(() => () => clearTimeout(flashTimer.current), []);

    const handleReset = async () => {
        setResetting(true);
        setResetError('');
        try {
            await api.post('/api/hardware/reset');
            await refresh();
        } catch (err) {
            setResetError(err.response?.data?.message || 'The board could not be restarted.');
        } finally {
            setResetting(false);
        }
    };

    const connected = !apiError && !!status?.connected;
    const students = status?.students ?? null;
    const load = status?.load_percent ?? null;
    const devices = status?.devices ?? null;
    const events = status?.events ?? [];
    const toFullLoad = students === null ? null : Math.max(0, FULL_LOAD_STUDENTS - students);

    const pill = apiError
        ? { tone: 'bad', text: 'Backend unreachable' }
        : !status
            ? { tone: 'wait', text: 'Connecting' }
            : connected
                ? { tone: 'good', text: `Live on ${status.port}` }
                : { tone: 'bad', text: 'Board offline' };

    let notice = null;
    if (apiError) {
        notice = { tone: 'bad', title: 'The backend is not responding', text: 'Values below are the last ones received. Check that the Flask server is running.' };
    } else if (status && !connected) {
        notice = { tone: 'bad', title: 'The board is offline', text: `${status.error || 'Waiting for the board.'} Values below are the last ones received.` };
    } else if (connected && students === null) {
        notice = { tone: 'wait', title: 'Count not synced yet', text: 'The portal joined after the board started. Use Reset & sync to start from zero, or wait for the next sensor event.' };
    }

    return (
        <div className="hwp">
            <header className="hwp-header">
                <div>
                    <span className="hwp-eyebrow"><FiShield size={13} /> Admin only</span>
                    <h1>Hardware <span className="text-gradient">Portal</span></h1>
                    <p>Live view of the classroom demo board: occupancy sensing and automatic load control.</p>
                </div>
                <div className="hwp-header-actions">
                    <span className={`hwp-pill is-${pill.tone}`}><span className="hwp-pill-dot" />{pill.text}</span>
                    <button type="button" className="hwp-reset" onClick={handleReset} disabled={!connected || resetting}>
                        <FiRefreshCw size={15} className={resetting ? 'is-spinning' : ''} />
                        {resetting ? 'Restarting' : 'Reset & sync'}
                    </button>
                </div>
            </header>

            {notice && (
                <div className={`hwp-notice is-${notice.tone}`} role="status">
                    <FiAlertTriangle size={18} />
                    <div><strong>{notice.title}</strong><span>{notice.text}</span></div>
                </div>
            )}
            {resetError && (
                <div className="hwp-notice is-bad" role="alert">
                    <FiAlertTriangle size={18} />
                    <div><strong>Reset failed</strong><span>{resetError}</span></div>
                </div>
            )}

            <div className={`hwp-main ${connected ? '' : 'is-stale'}`}>
                <section className="hwp-card hwp-twin-card" aria-labelledby="hwp-twin-title">
                    <div className="hwp-card-head">
                        <h2 id="hwp-twin-title">Live board</h2>
                        <span className="hwp-muted">{connected ? 'Follows the real relays' : 'Last known state'}</span>
                    </div>
                    <HardwareTwin devices={devices} flash={flash} stale={!connected} />
                    <div className="hwp-devices">
                        {DEVICES.map(({ key, label, icon: Icon, stage }) => {
                            const state = deviceState(devices, key);
                            return (
                                <div className={`hwp-device is-${state}`} key={key}>
                                    <span className="hwp-device-icon"><Icon size={17} /></span>
                                    <div><strong>{label}</strong><small>{stage}</small></div>
                                    <em>{stateLabel[state]}</em>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="hwp-side">
                    <section className="hwp-card hwp-occupancy" aria-labelledby="hwp-count-title">
                        <h2 id="hwp-count-title">Students in room</h2>
                        <div className="hwp-count" aria-live="polite" key={students}>{students ?? '--'}</div>
                        <div className="hwp-seats" aria-hidden="true">
                            {Array.from({ length: FULL_LOAD_STUDENTS }, (_, i) => (
                                <span key={i} className={students !== null && i < students ? 'on' : ''} />
                            ))}
                        </div>
                        <p className="hwp-muted">
                            {toFullLoad === null
                                ? 'Waiting for a sensor event'
                                : toFullLoad === 0
                                    ? 'Full load reached'
                                    : `${toFullLoad} more to reach full load`}
                        </p>
                        <dl className="hwp-stats">
                            <div><dt>Entries</dt><dd>{status?.entries ?? 0}</dd></div>
                            <div><dt>Exits</dt><dd>{status?.exits ?? 0}</dd></div>
                            <div><dt>Last event</dt><dd>{status?.last_event_at ? timeAgo(status.last_event_at) : 'None'}</dd></div>
                        </dl>
                    </section>

                    <section className="hwp-card" aria-labelledby="hwp-rules-title">
                        <div className="hwp-card-head">
                            <h2 id="hwp-rules-title">Automation rules</h2>
                            <strong className="hwp-load">{load === null ? '--' : `${load}%`}</strong>
                        </div>
                        <ul className="hwp-rules">
                            {RULES.map(rule => (
                                <li key={rule.load} className={load === rule.load ? 'is-active' : ''} aria-current={load === rule.load ? 'true' : undefined}>
                                    <span className="hwp-rule-load">{rule.load}%</span>
                                    <div><strong>{rule.occupancy}</strong><small>{rule.action}</small></div>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>

            <div className="hwp-lower">
                <section className="hwp-card" aria-labelledby="hwp-flow-title">
                    <div className="hwp-card-head">
                        <h2 id="hwp-flow-title">How it works</h2>
                    </div>
                    <ol className="hwp-flow">
                        {PIPELINE.map(({ icon: Icon, title, text }) => (
                            <li key={title}>
                                <span className="hwp-flow-icon"><Icon size={17} /></span>
                                <div><strong>{title}</strong><small>{text}</small></div>
                            </li>
                        ))}
                    </ol>
                    <p className="hwp-footnote">
                        The board makes every switching decision itself, so the lights and fans keep working even if this portal or the laptop goes offline.
                    </p>
                </section>

                <section className="hwp-card" aria-labelledby="hwp-feed-title">
                    <div className="hwp-card-head">
                        <h2 id="hwp-feed-title">Live events</h2>
                        <span className="hwp-muted">Newest first</span>
                    </div>
                    {events.length === 0 ? (
                        <div className="hwp-empty">
                            <FiRadio size={22} />
                            <p>No events yet. Walk past a sensor to see it appear here.</p>
                        </div>
                    ) : (
                        <ul className="hwp-feed">
                            {events.slice(0, 12).map(event => {
                                const meta = EVENT_META[event.type];
                                const Icon = meta.icon;
                                return (
                                    <li key={event.id}>
                                        <span className={`hwp-feed-icon is-${meta.tone}`}><Icon size={14} /></span>
                                        <strong>{meta.title}</strong>
                                        <span className="hwp-feed-detail">{meta.detail(event)}</span>
                                        <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default HardwarePortal;
