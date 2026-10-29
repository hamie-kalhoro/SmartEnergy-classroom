import React, { useState, useMemo, Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api';
import {
    FiCpu, FiPlay, FiActivity, FiZap, FiSun, FiWind, FiThermometer, FiDroplet, FiArrowUpRight, FiSearch,
    FiChevronDown, FiTarget, FiLayers, FiRefreshCw, FiMapPin
} from 'react-icons/fi';
import { TbAirConditioning } from 'react-icons/tb';
import DynamicLoader from '../components/DynamicLoader';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const LEVELS = [
    { key: 'Empty', color: '#ef4444' },
    { key: 'Trace', color: '#f97316' },
    { key: 'Light', color: '#f59e0b' },
    { key: 'Balanced', color: '#06b6d4' },
    { key: 'Maximum', color: '#10b981' }
];
const LEVEL_COLOR = Object.fromEntries(LEVELS.map(l => [l.key, l.color]));
const ENERGY_MODES = {
    eco: { label: 'Eco', color: '#10b981' },
    balanced: { label: 'Balanced', color: '#06b6d4' },
    comfort: { label: 'Comfort', color: '#f59e0b' },
    full: { label: 'Full power', color: '#ef4444' }
};
// Estimated kWh saved per class by energy mode (mirrors /api/predict)
const MODE_SAVING = { eco: 3.5, balanced: 2.0, comfort: 0.8, full: 0.1 };

/** "Operating Systems (Batch 3 - Section I)" -> { course, section: 'Batch 3 · Sec I' } */
function splitSubject(subject = '') {
    const m = subject.match(/^(.*?)\s*\(Batch\s*(\d+)\s*-\s*Section\s*(II|I)\)\s*$/i);
    return m ? { course: m[1], section: `Batch ${m[2]} · Sec ${m[3].toUpperCase()}` } : { course: subject, section: null };
}

function deviceTone(state) {
    if (!state || state === 'OFF') return 'off';
    if (state === 'ECO' || state === 'LOW' || state.startsWith('DIM')) return 'eco';
    return 'on';
}

function DeviceState({ icon: Icon, label, state }) {
    const value = state || 'OFF';
    return (
        <span className={`pred-device tone-${deviceTone(value)}`} title={`${label}: ${value}`}>
            <Icon />
            <span>{value.replace(' (50%)', ' 50%')}</span>
        </span>
    );
}

function Predictions() {
    const [predictions, setPredictions] = useState([]);
    const [climate, setClimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastRun, setLastRun] = useState(null);
    const [activeDay, setActiveDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return DAYS.includes(today) ? today : 'Monday';
    });
    const [levelFilter, setLevelFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(null);

    const runPredictions = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/predict');
            setPredictions(res.data.predictions || res.data);
            setClimate(res.data.climate || null);
            setLastRun(new Date());
            setExpanded(null);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'The analysis could not be completed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const rows = useMemo(() => predictions.map((p, i) => ({
        ...p,
        key: p.id ?? i,
        ...splitSubject(p.subject),
        saving: MODE_SAVING[p.energy_mode] ?? 0,
        confidence: parseFloat(p.confidence) || 0
    })), [predictions]);

    const summary = useMemo(() => {
        const counts = Object.fromEntries(LEVELS.map(l => [l.key, 0]));
        rows.forEach(r => { counts[r.occupancy] = (counts[r.occupancy] || 0) + 1; });
        return {
            total: rows.length,
            optimisable: rows.filter(r => r.occupancy !== 'Maximum').length,
            saving: rows.reduce((s, r) => s + r.saving, 0),
            confidence: rows.length ? rows.reduce((s, r) => s + r.confidence, 0) / rows.length : 0,
            counts
        };
    }, [rows]);

    const hasDays = rows.some(r => r.day);
    const dayCounts = useMemo(() => Object.fromEntries(DAYS.map(d => [d, rows.filter(r => r.day === d).length])), [rows]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows
            .filter(r => !hasDays || r.day === activeDay)
            .filter(r => levelFilter === 'all' || r.occupancy === levelFilter)
            .filter(r => !q || `${r.classroom} ${r.course} ${r.section || ''}`.toLowerCase().includes(q))
            .sort((a, b) => a.time.localeCompare(b.time) || a.classroom.localeCompare(b.classroom));
    }, [rows, hasDays, activeDay, levelFilter, query]);

    const daySaving = visible.reduce((s, r) => s + r.saving, 0);

    return (
        <div className="fade-in pred-page">
            {/* Header */}
            <div className="dash-header">
                <div>
                    <span className="rooms-eyebrow">AI engine · occupancy forecasting</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Prediction <span className="text-gradient">Intelligence</span>
                    </h2>
                    <p className="text-muted small m-0">Predicted occupancy for every timetabled class, with climate-aware device recommendations.</p>
                </div>
                <div className="pred-actions">
                    <NavLink to="/model-status" className="pred-link">Model health <FiArrowUpRight /></NavLink>
                    <button className="btn btn-gradient" onClick={runPredictions} disabled={loading}>
                        {loading ? <DynamicLoader size={20} color="var(--bg-deep)" /> : (
                            <>{lastRun ? <FiRefreshCw className="me-2" /> : <FiPlay className="me-2" />}{lastRun ? 'Re-run analysis' : 'Run analysis'}</>
                        )}
                    </button>
                </div>
            </div>

            {error && <div className="tt-form-note error mb-3"><FiActivity /> {error}</div>}

            {!lastRun ? (
                <section className="pred-empty">
                    <span className="pred-empty-icon"><FiCpu /></span>
                    <h3>Run the occupancy forecast</h3>
                    <p>
                        The model predicts how full each timetabled class will be, then recommends lighting, fan and AC settings
                        for the current weather in Jamshoro.
                    </p>
                    <ol className="pred-steps">
                        <li><span>1</span>Reads the weekly timetable</li>
                        <li><span>2</span>Predicts an occupancy level per class</li>
                        <li><span>3</span>Applies the live climate rules</li>
                    </ol>
                    <button className="btn btn-lg btn-gradient" onClick={runPredictions} disabled={loading}>
                        {loading ? <DynamicLoader size={20} color="var(--bg-deep)" /> : <><FiPlay className="me-2" /> Run analysis</>}
                    </button>
                </section>
            ) : (
                <>
                    {/* Climate strip */}
                    {climate && (
                        <section className="pred-climate" style={{ '--chip-color': climate.climate_mode_color || '#10b981' }}>
                            <div className="pred-climate-main">
                                <span className="pred-climate-icon"><FiThermometer /></span>
                                <div>
                                    <strong>{climate.climate_mode_label}</strong>
                                    <small>{climate.city} · {climate.season} · recommendations below follow this climate mode</small>
                                </div>
                            </div>
                            <div className="pred-climate-stats">
                                <div><small>Temperature</small><strong>{climate.temperature}°C</strong></div>
                                <div><small>Feels like</small><strong>{climate.feels_like}°C</strong></div>
                                <div><small><FiDroplet /> Humidity</small><strong>{climate.humidity}%</strong></div>
                                <div><small>Updated</small><strong>{lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                            </div>
                        </section>
                    )}

                    {/* KPIs */}
                    <div className="dash-kpis">
                        <div className="dash-kpi" style={{ '--kpi-color': '#00f59b' }}>
                            <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiLayers /></span><span className="dash-kpi-label">Classes analysed</span></div>
                            <div className="dash-kpi-value"><strong>{summary.total}</strong><span>slots</span></div>
                            <div className="dash-kpi-foot"><span>Weekly timetable</span><strong>{DAYS.length} days</strong></div>
                        </div>
                        <div className="dash-kpi" style={{ '--kpi-color': '#06b6d4' }}>
                            <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiActivity /></span><span className="dash-kpi-label">Optimisable slots</span></div>
                            <div className="dash-kpi-value"><strong>{summary.optimisable}</strong><span>of {summary.total}</span></div>
                            <div className="dash-meter"><span style={{ width: `${summary.total ? (summary.optimisable / summary.total) * 100 : 0}%` }} /></div>
                            <div className="dash-kpi-foot"><span>Below maximum occupancy</span><strong>{summary.total ? Math.round((summary.optimisable / summary.total) * 100) : 0}%</strong></div>
                        </div>
                        <div className="dash-kpi" style={{ '--kpi-color': '#10b981' }}>
                            <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiZap /></span><span className="dash-kpi-label">Estimated saving</span></div>
                            <div className="dash-kpi-value"><strong>{summary.saving.toFixed(1)}</strong><span>kWh / week</span></div>
                            <div className="dash-kpi-foot"><span>{activeDay}</span><strong>{daySaving.toFixed(1)} kWh</strong></div>
                        </div>
                        <div className="dash-kpi" style={{ '--kpi-color': '#a78bfa' }}>
                            <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiTarget /></span><span className="dash-kpi-label">Average confidence</span></div>
                            <div className="dash-kpi-value"><strong>{summary.confidence.toFixed(0)}</strong><span>%</span></div>
                            <div className="dash-meter"><span style={{ width: `${Math.min(100, summary.confidence)}%` }} /></div>
                            <div className="dash-kpi-foot"><span>Model probability</span><strong>per class</strong></div>
                        </div>
                    </div>

                    {/* Distribution */}
                    <section className="pred-dist">
                        <div className="pred-dist-head">
                            <h3>Predicted occupancy mix</h3>
                            <small>Share of {summary.total} classes by predicted level</small>
                        </div>
                        <div className="pred-dist-bar">
                            {LEVELS.filter(l => summary.counts[l.key]).map(l => (
                                <span key={l.key} style={{ flex: summary.counts[l.key], background: l.color }} title={`${l.key}: ${summary.counts[l.key]}`} />
                            ))}
                        </div>
                        <div className="pred-dist-legend">
                            {LEVELS.map(l => (
                                <span key={l.key}>
                                    <i style={{ background: l.color }} />{l.key}
                                    <strong>{summary.counts[l.key] || 0}</strong>
                                    <small>{summary.total ? Math.round(((summary.counts[l.key] || 0) / summary.total) * 100) : 0}%</small>
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Table */}
                    <section className="tt-card">
                        <div className="tt-card-head">
                            <div>
                                <h3>{hasDays ? `${activeDay} schedule` : 'All classes'}</h3>
                                <p>{visible.length} classes · {daySaving.toFixed(1)} kWh estimated saving · select a row for the reasoning</p>
                            </div>
                            {hasDays && (
                                <div className="tt-day-tabs" role="tablist" aria-label="Day">
                                    {DAYS.map(day => (
                                        <button key={day} type="button" role="tab" aria-selected={activeDay === day} className={activeDay === day ? 'active' : ''} onClick={() => { setActiveDay(day); setExpanded(null); }}>
                                            {day.slice(0, 3)} <small>{dayCounts[day]}</small>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="pred-filters">
                            <div className="rooms-filters" role="tablist" aria-label="Filter by predicted level">
                                {['all', ...LEVELS.map(l => l.key)].map(key => (
                                    <button key={key} type="button" role="tab" aria-selected={levelFilter === key} className={levelFilter === key ? 'active' : ''} onClick={() => setLevelFilter(key)}>
                                        {key !== 'all' && <i style={{ background: LEVEL_COLOR[key] }} />}
                                        {key === 'all' ? 'All levels' : key}
                                    </button>
                                ))}
                            </div>
                            <label className="rooms-search">
                                <FiSearch />
                                <input type="search" placeholder="Search room, course or section" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search predictions" />
                            </label>
                        </div>

                        <div className="tt-grid-scroll">
                            <table className="pred-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Class</th>
                                        <th>Predicted occupancy</th>
                                        <th className="num">Expected</th>
                                        <th>Recommended devices</th>
                                        <th>Mode</th>
                                        <th className="num">Saving</th>
                                        <th aria-label="Details" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visible.length === 0 ? (
                                        <tr><td colSpan="8" className="pred-none">No classes match these filters.</td></tr>
                                    ) : visible.map(r => {
                                        const mode = ENERGY_MODES[r.energy_mode] || ENERGY_MODES.balanced;
                                        const open = expanded === r.key;
                                        return (
                                            <Fragment key={r.key}>
                                                <tr className={`pred-row ${open ? 'open' : ''}`} onClick={() => setExpanded(open ? null : r.key)}>
                                                    <td className="pred-time">{r.time}</td>
                                                    <td>
                                                        <div className="pred-class">
                                                            <strong>{r.course}</strong>
                                                            <small>
                                                                {r.section && <span>{r.section}</span>}
                                                                <span><FiMapPin /> {r.classroom}</span>
                                                                {r.type === 'lab' && <span className="pred-lab">Lab</span>}
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="pred-level" style={{ '--level': LEVEL_COLOR[r.occupancy] || '#94a3b8' }}>
                                                            <span className="pred-level-pill">{r.occupancy}</span>
                                                            <div className="pred-confidence" title={`${r.confidence.toFixed(0)}% model confidence`}>
                                                                <div><i style={{ width: `${Math.min(100, r.confidence)}%` }} /></div>
                                                                <small>{r.confidence.toFixed(0)}%</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="num">{parseFloat(r.attendance || 0).toFixed(0)}%</td>
                                                    <td>
                                                        <div className="pred-devices">
                                                            <DeviceState icon={FiSun} label="Lights" state={r.lights_action} />
                                                            <DeviceState icon={FiWind} label="Fans" state={r.fan_action} />
                                                            <DeviceState icon={TbAirConditioning} label="AC" state={r.ac_action} />
                                                        </div>
                                                    </td>
                                                    <td><span className="pred-mode" style={{ '--mode': mode.color }}>{mode.label}</span></td>
                                                    <td className="num pred-saving">{r.saving ? `−${r.saving.toFixed(1)} kWh` : '—'}</td>
                                                    <td className="pred-chevron"><FiChevronDown /></td>
                                                </tr>
                                                {open && (
                                                    <tr className="pred-detail">
                                                        <td colSpan="8">
                                                            <div className="pred-detail-grid">
                                                                <div>
                                                                    <small><FiCpu /> Why this occupancy</small>
                                                                    <p>{r.reasoning || 'No model reasoning returned.'}</p>
                                                                </div>
                                                                <div>
                                                                    <small><FiThermometer /> Climate recommendation</small>
                                                                    <p>{r.climate_reasoning || r.recommendation || 'No climate adjustment.'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default Predictions;
