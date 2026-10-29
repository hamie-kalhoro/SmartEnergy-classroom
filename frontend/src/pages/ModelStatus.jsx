import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api';
import {
    FiActivity, FiCpu, FiDatabase, FiTarget, FiLayers, FiShield, FiCheckCircle, FiAlertTriangle, FiInfo,
    FiArrowUpRight, FiClock, FiGitBranch, FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';
import { BaselineBars, FeatureBars } from '../components/ModelCharts';

// Maturity levels by scenario coverage (mirrors ml_engine.get_intelligence_profile)
const STAGES = [
    { name: 'Observant Seedling', from: 0, desc: 'Too little history to tell the time slots apart.' },
    { name: 'Knowledge Gatherer', from: 25, desc: 'Has seen attendance for a quarter of the weekly slots.' },
    { name: 'Pattern Engine', from: 45, desc: 'Recognises daily and theory/lab patterns for most of the week.' },
    { name: 'Strategic Analyst', from: 65, desc: 'Covers most morning slots for both theory and lab classes.' },
    { name: 'Intelligence Core', from: 85, desc: 'Has history for nearly every day, slot and class type.' }
];
const ESSENTIAL_SCENARIOS = 70; // 5 days x 7 slots x theory/lab
const LEVELS = [
    { key: 'Empty', color: '#ef4444' },
    { key: 'Trace', color: '#f97316' },
    { key: 'Light', color: '#f59e0b' },
    { key: 'Balanced', color: '#06b6d4' },
    { key: 'Maximum', color: '#10b981' }
];
const REC_STYLES = {
    warning: { icon: FiAlertTriangle, color: '#f59e0b', label: 'Warning' },
    strategy: { icon: FiTarget, color: '#a78bfa', label: 'Strategy' },
    optimization: { icon: FiTrendingUp, color: '#06b6d4', label: 'Optimisation' },
    action: { icon: FiActivity, color: '#f97316', label: 'Action' },
    status: { icon: FiInfo, color: '#10b981', label: 'Status' }
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function AccuracyRing({ value }) {
    const r = 54;
    const c = 2 * Math.PI * r;
    return (
        <div className="mp-ring">
            <svg viewBox="0 0 132 132" aria-hidden="true">
                <defs>
                    <linearGradient id="mpRing" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#00f59b" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
                <circle cx="66" cy="66" r={r} className="mp-ring-track" />
                <circle cx="66" cy="66" r={r} className="mp-ring-value" strokeDasharray={`${(Math.min(100, value) / 100) * c} ${c}`} />
            </svg>
            <div>
                <strong>{value.toFixed(1)}%</strong>
                <small>accuracy</small>
            </div>
        </div>
    );
}

function AccuracyHistory({ history }) {
    if (history.length < 2) {
        const only = history[0];
        return (
            <>
            <div className="mp-history-empty">
                <FiClock />
                <p>
                    {only
                        ? <>One training run so far: <strong>{only.accuracy}%</strong> on {fmtDate(only.timestamp)}. The trend appears after the next retrain (every 50 new attendance records).</>
                        : 'No training runs recorded yet.'}
                </p>
            </div>
            {only && (
                <div className="mp-run-metrics">
                    {[['Accuracy', only.accuracy], ['Precision', only.precision], ['Recall', only.recall], ['F1 score', only.f1_score], ['Train accuracy', only.train_accuracy]].map(([label, v]) => (
                        <div key={label}><small>{label}</small><strong>{v ?? '—'}%</strong></div>
                    ))}
                </div>
            )}
            </>
        );
    }
    const w = 520;
    const h = 150;
    const pad = { l: 34, r: 10, t: 12, b: 22 };
    const values = history.map(x => x.accuracy);
    const min = Math.max(0, Math.floor(Math.min(...values, ...history.map(x => x.baseline_history || 100)) / 10) * 10 - 5);
    const max = 100;
    const x = i => pad.l + (i / (history.length - 1)) * (w - pad.l - pad.r);
    const y = v => pad.t + (1 - (v - min) / (max - min)) * (h - pad.t - pad.b);
    const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
    const base = history.map((r, i) => `${i ? 'L' : 'M'}${x(i)} ${y(r.baseline_history || 0)}`).join(' ');
    return (
        <svg className="mp-history" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Accuracy across training runs">
            {[min, (min + max) / 2, max].map(t => (
                <g key={t}>
                    <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} className="mp-grid" />
                    <text x={pad.l - 6} y={y(t) + 3} className="mp-axis" textAnchor="end">{Math.round(t)}%</text>
                </g>
            ))}
            <path d={base} className="mp-base-line" />
            <path d={`${line} L${x(values.length - 1)} ${h - pad.b} L${x(0)} ${h - pad.b} Z`} className="mp-area" />
            <path d={line} className="mp-line" />
            {history.map((r, i) => (
                <circle key={r.timestamp || i} cx={x(i)} cy={y(r.accuracy)} r="3.5" className={`mp-dot ${r.status === 'warning' ? 'warn' : ''}`}>
                    <title>{`${fmtDate(r.timestamp)}: ${r.accuracy}%`}</title>
                </circle>
            ))}
            <text x={pad.l} y={h - 4} className="mp-axis">First run</text>
            <text x={w - pad.r} y={h - 4} className="mp-axis" textAnchor="end">Latest</text>
        </svg>
    );
}

const ModelStatus = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        api.get('/api/ml/intelligence-pulse')
            .then(res => setProfile(res.data))
            .catch(err => { console.error('Profile fetch error:', err); setFailed(true); })
            .finally(() => setLoading(false));
    }, []);

    const history = profile?.history || [];
    const latest = history.length ? history[history.length - 1] : null;

    const perLevel = useMemo(() => {
        const cm = latest?.confusion_matrix;
        if (!cm?.matrix) return [];
        return cm.labels.map((label, i) => {
            const row = cm.matrix[i] || [];
            const total = row.reduce((a, b) => a + b, 0);
            return { label, total, recall: total ? (row[i] / total) * 100 : 0 };
        });
    }, [latest]);

    const weakLevels = perLevel.filter(l => l.total >= 10 && l.recall < 25).map(l => l.label);

    if (loading) {
        return (
            <div className="fade-in">
                <div className="dash-kpis">{[1, 2, 3, 4].map(i => <div className="dash-kpi skeleton" key={i} />)}</div>
                <div className="dash-card skeleton" style={{ minHeight: 360 }} />
            </div>
        );
    }

    if (failed || !profile) {
        return (
            <div className="pred-empty">
                <span className="pred-empty-icon"><FiAlertTriangle /></span>
                <h3>Model profile unavailable</h3>
                <p>The backend did not return the model's training profile. Check that the API is running, then reload this page.</p>
            </div>
        );
    }

    const accuracy = profile.accuracy || 0;
    const lift = accuracy - (profile.baseline_history || 0);
    const healthy = latest ? latest.status !== 'warning' && lift > 0 : false;
    const stageIndex = Math.max(0, STAGES.findIndex(s => s.name === profile.evolution_level));
    const next = STAGES[stageIndex + 1];
    const gap = latest ? latest.train_accuracy - latest.accuracy : 0;
    const distribution = latest?.class_distribution || {};
    const distTotal = Object.values(distribution).reduce((a, b) => a + b, 0);

    return (
        <div className="fade-in mp-page">
            <div className="dash-header">
                <div>
                    <span className="rooms-eyebrow">Model health · diagnostics</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Intelligence <span className="text-gradient">Profile</span>
                    </h2>
                    <div className="dash-chips">
                        <span className="dash-chip"><FiGitBranch /> Random forest · 150 trees</span>
                        <span className="dash-chip"><FiClock /> Last trained {fmtDate(latest?.timestamp)}</span>
                        <span className="dash-chip"><FiActivity /> Retrains every 50 new records</span>
                    </div>
                </div>
                <NavLink to="/ml-lab" className="btn btn-primary-dim">Open ML Laboratory <FiArrowUpRight className="ms-1" /></NavLink>
            </div>

            {/* Health summary */}
            <section className="dash-card mp-hero">
                <div className="mp-hero-main">
                    <AccuracyRing value={accuracy} />
                    <div className="mp-verdict">
                        <span className={`mp-status ${healthy ? 'ok' : 'warn'}`}>
                            {healthy ? <FiCheckCircle /> : <FiAlertTriangle />} {healthy ? 'Healthy' : 'Needs attention'}
                        </span>
                        <h3>
                            {lift > 0
                                ? <>Beats the recent-average rule by <span className="mp-lift">+{lift.toFixed(1)} pts</span></>
                                : <>Not yet beating the recent-average rule</>}
                        </h3>
                        <p>
                            Measured on the {latest?.test_records?.toLocaleString() || 'most recent'} newest classes the model never trained on.
                            Day-to-day absence, cancellations and holidays can't be known in advance, so the goal is to beat these baselines, not to reach 100%.
                        </p>
                        <BaselineBars accuracy={accuracy} history={profile.baseline_history} majority={profile.baseline_majority} />
                    </div>
                </div>

                <div className="mp-stages">
                    <div className="mp-stages-head">
                        <h4>Maturity</h4>
                        <small>
                            {next
                                ? `${(next.from - profile.coverage_pct).toFixed(1)} pts of coverage to ${next.name}`
                                : 'Highest maturity level reached'}
                        </small>
                    </div>
                    <ol>
                        {STAGES.map((s, i) => (
                            <li key={s.name} className={i < stageIndex ? 'done' : i === stageIndex ? 'current' : ''}>
                                <span className="mp-stage-dot">{i < stageIndex ? <FiCheckCircle /> : i + 1}</span>
                                <div>
                                    <strong>{s.name}</strong>
                                    <small>{i === stageIndex ? s.desc : `From ${s.from}% coverage`}</small>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="mp-coverage">
                        <div className="mp-coverage-bar">
                            <i style={{ width: `${profile.coverage_pct}%` }} />
                            {STAGES.slice(1).map(s => <span key={s.name} style={{ left: `${s.from}%` }} />)}
                        </div>
                        <small>{profile.coverage_pct}% of weekly scenarios covered</small>
                    </div>
                </div>
            </section>

            {/* KPIs */}
            <div className="dash-kpis">
                <div className="dash-kpi" style={{ '--kpi-color': '#00f59b' }}>
                    <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiDatabase /></span><span className="dash-kpi-label">Records learned</span></div>
                    <div className="dash-kpi-value"><strong>{profile.total_hours.toLocaleString()}</strong><span>classes</span></div>
                    <div className="dash-kpi-foot"><span>Train / test split</span><strong>{latest ? `${latest.training_records.toLocaleString()} / ${latest.test_records.toLocaleString()}` : '—'}</strong></div>
                </div>
                <div className="dash-kpi" style={{ '--kpi-color': '#f59e0b' }}>
                    <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiLayers /></span><span className="dash-kpi-label">Scenario coverage</span></div>
                    <div className="dash-kpi-value"><strong>{profile.scenarios_mastered}</strong><span>of {ESSENTIAL_SCENARIOS}</span></div>
                    <div className="dash-meter"><span style={{ width: `${profile.coverage_pct}%` }} /></div>
                    <div className="dash-kpi-foot"><span>Day × slot × class type</span><strong>{profile.coverage_pct}%</strong></div>
                </div>
                <div className="dash-kpi" style={{ '--kpi-color': '#a78bfa' }}>
                    <div className="dash-kpi-head"><span className="dash-kpi-icon"><FiTarget /></span><span className="dash-kpi-label">Cross-validation</span></div>
                    <div className="dash-kpi-value"><strong>{latest?.cv_accuracy ?? '—'}</strong><span>% ± {latest?.cv_std ?? 0}</span></div>
                    <div className="dash-kpi-foot"><span>F1 score</span><strong>{latest?.f1_score ?? '—'}%</strong></div>
                </div>
                <div className="dash-kpi" style={{ '--kpi-color': gap > 15 ? '#f59e0b' : '#06b6d4' }}>
                    <div className="dash-kpi-head"><span className="dash-kpi-icon">{gap > 15 ? <FiTrendingDown /> : <FiShield />}</span><span className="dash-kpi-label">Generalisation gap</span></div>
                    <div className="dash-kpi-value"><strong>{gap.toFixed(1)}</strong><span>pts</span></div>
                    <div className="dash-kpi-foot"><span>Train {latest?.train_accuracy ?? '—'}% vs test {latest?.accuracy ?? '—'}%</span><strong>{gap > 15 ? 'Overfitting' : 'OK'}</strong></div>
                </div>
            </div>

            {/* Trend + class balance */}
            <div className="dash-row">
                <section className="dash-card dash-span-8" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>Accuracy over training runs</h3>
                            <p>{history.length > 1 ? `Last ${history.length} runs · dashed line is the recent-average baseline` : 'Latest training run'}</p>
                        </div>
                        {profile.delta !== 0 && (
                            <span className={`mp-delta ${profile.delta > 0 ? 'up' : 'down'}`}>
                                {profile.delta > 0 ? <FiTrendingUp /> : <FiTrendingDown />} {profile.delta > 0 ? '+' : ''}{profile.delta} pts since last run
                            </span>
                        )}
                    </div>
                    <AccuracyHistory history={history} />
                </section>
                <section className="dash-card dash-span-4" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>Training data balance</h3>
                            <p>Occupancy levels in the history</p>
                        </div>
                    </div>
                    <div className="mp-dist">
                        {LEVELS.map(l => {
                            const n = distribution[l.key] || 0;
                            const pct = distTotal ? (n / distTotal) * 100 : 0;
                            return (
                                <div key={l.key} className="mp-dist-row">
                                    <span><i style={{ background: l.color }} />{l.key}</span>
                                    <div className="ml-bar"><i style={{ width: `${pct}%`, background: l.color }} /></div>
                                    <strong>{n.toLocaleString()}</strong>
                                </div>
                            );
                        })}
                    </div>
                    {distTotal > 0 && (distribution.Trace || 0) / distTotal < 0.02 && (
                        <p className="ml-note">Few Trace and Light examples, so the model rarely predicts those levels.</p>
                    )}
                </section>
            </div>

            {/* Per-level accuracy + drivers */}
            <div className="dash-row">
                <section className="dash-card dash-span-6" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>Accuracy by occupancy level</h3>
                            <p>Share of each actual level the model predicted correctly (recall)</p>
                        </div>
                    </div>
                    <div className="mp-dist">
                        {perLevel.map(l => (
                            <div key={l.label} className="mp-dist-row">
                                <span><i style={{ background: LEVELS.find(x => x.key === l.label)?.color }} />{l.label}</span>
                                <div className="ml-bar"><i style={{ width: `${l.recall}%`, background: LEVELS.find(x => x.key === l.label)?.color }} /></div>
                                <strong title={`${l.total} test classes`}>{l.total ? `${l.recall.toFixed(0)}%` : '—'}<small>{l.total} tests</small></strong>
                            </div>
                        ))}
                    </div>
                    <p className="ml-note">
                        {weakLevels.length
                            ? <>The model rarely catches <strong>{weakLevels.join(', ')}</strong> classes. They are rare in the training data (see data balance), so it leans towards Balanced and Maximum. More recorded low-attendance classes will improve this.</>
                            : <>Based on {latest?.test_records?.toLocaleString() || 0} held-out classes.</>}
                    </p>
                </section>
                <section className="dash-card dash-span-6" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>What drives the prediction</h3>
                            <p>Feature importance in the latest model</p>
                        </div>
                    </div>
                    {latest?.feature_importance ? <FeatureBars importance={latest.feature_importance} limit={6} /> : <p className="ml-note">No training report yet.</p>}
                </section>
            </div>

            {/* Recommendations + guardrails */}
            <div className="dash-row">
                <section className="dash-card dash-span-7" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>Recommendations</h3>
                            <p>Generated from coverage, accuracy and recent training runs</p>
                        </div>
                    </div>
                    <div className="mp-recs">
                        {(profile.recommendations || []).map(r => {
                            const style = REC_STYLES[r.type] || REC_STYLES.status;
                            const Icon = style.icon;
                            return (
                                <div key={r.text} className="mp-rec" style={{ '--rec': style.color }}>
                                    <span className="mp-rec-icon"><Icon /></span>
                                    <div>
                                        <div className="mp-rec-meta">
                                            <span>{style.label}</span>
                                            <small className={`prio-${r.priority}`}>{r.priority} priority</small>
                                        </div>
                                        <p>{r.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {!profile.recommendations?.length && <p className="ml-note">No recommendations right now.</p>}
                    </div>
                </section>
                <section className="dash-card dash-span-5" style={{ minHeight: 0 }}>
                    <div className="dash-card-head">
                        <div>
                            <h3>Guardrails</h3>
                            <p>Rules enforced on every prediction and retrain</p>
                        </div>
                        <FiShield className="dash-head-icon" />
                    </div>
                    <ul className="mp-guards">
                        <li><FiCheckCircle /><span><strong>Never fully off when students are expected.</strong> An “Empty” prediction is raised to “Trace” (dimmed lights, fans on) when the class's recent attendance is above 5%.</span></li>
                        <li><FiCheckCircle /><span><strong>Honest testing.</strong> Accuracy is measured on the most recent weeks, after training only on earlier ones.</span></li>
                        <li><FiCheckCircle /><span><strong>Regression check.</strong> A run is flagged if it stops beating the recent-average rule or drops more than 0.5 pts from the previous run.</span></li>
                        <li><FiCheckCircle /><span><strong>Decision support only.</strong> Recommendations are advisory; devices are not switched automatically.</span></li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default ModelStatus;
