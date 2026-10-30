import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    FiZap, FiUsers, FiCpu, FiActivity, FiChevronRight, FiThermometer, FiDroplet, FiTrendingUp, FiWind, FiTarget
} from 'react-icons/fi';

ChartJS.register(...registerables);

const RANGES = [
    { label: 'Today', val: '1d', period: 'today', noun: 'day' },
    { label: '7 days', val: '1w', period: 'this week', noun: 'week' },
    { label: '30 days', val: '1m', period: 'this month', noun: 'month' }
];

const LEVEL_COLORS = { Maximum: '#10b981', Balanced: '#06b6d4', Light: '#f59e0b', Trace: '#f97316', Empty: '#ef4444' };
const KG_CO2_PER_KWH = 0.5; // backend reports co2_reduced in tonnes at 0.5 kg/kWh

const num = (v) => parseFloat(v) || 0;
const fmt = (v, digits = 1) => num(v).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

/** Theme colours from CSS variables, re-read when the light/dark theme flips. */
function useThemeColors() {
    const read = () => {
        const css = getComputedStyle(document.documentElement);
        return {
            text: css.getPropertyValue('--text').trim() || '#fff',
            muted: css.getPropertyValue('--text-muted').trim() || '#9ca3af',
            border: css.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.1)',
            surface: css.getPropertyValue('--bg-surface').trim() || '#041418',
            bar: css.getPropertyValue('--chart-bar').trim(),
            barSoft: css.getPropertyValue('--chart-bar-soft').trim(),
            line: css.getPropertyValue('--chart-line').trim() || '#38bdf8'
        };
    };
    const [colors, setColors] = useState(read);
    useEffect(() => {
        const observer = new MutationObserver(() => setColors(read()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);
    return colors;
}

function Sparkline({ data, color }) {
    const values = data.length ? data : [0];
    const max = Math.max(...values, 1);
    const w = 96;
    const h = 32;
    const step = values.length > 1 ? w / (values.length - 1) : w;
    const points = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 6)]);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const id = `spark-${color.replace('#', '')}`;
    return (
        <svg className="dash-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function KpiCard({ icon: Icon, label, value, unit, color, footer, children }) {
    return (
        <div className="dash-kpi" style={{ '--kpi-color': color }}>
            <div className="dash-kpi-head">
                <span className="dash-kpi-icon"><Icon /></span>
                <span className="dash-kpi-label">{label}</span>
            </div>
            <div className="dash-kpi-value">
                <strong>{value}</strong>
                {unit && <span>{unit}</span>}
            </div>
            {children}
            {footer && <div className="dash-kpi-foot">{footer}</div>}
        </div>
    );
}

function CardHeader({ title, subtitle, children }) {
    return (
        <div className="dash-card-head">
            <div>
                <h3>{title}</h3>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const theme = useThemeColors();
    const [stats, setStats] = useState({ energy_saved: 0, active_classrooms: 0, avg_occupancy: 0, co2_reduced: 0, total_decisions: 0 });
    const [charts, setCharts] = useState({ weekly: { labels: [], data: [] }, hourly: { labels: [], data: [] } });
    const [activeRange, setActiveRange] = useState('1w');
    const [recentDecisions, setRecentDecisions] = useState([]);
    const [maturity, setMaturity] = useState({ evolution_level: '—', accuracy: 0 });
    const [climate, setClimate] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`/api/dashboard/stats?range=${activeRange}`),
            api.get(`/api/dashboard/charts?range=${activeRange}`),
            api.get(`/api/decisions/recent?range=${activeRange}`),
            api.get('/api/ml/intelligence-pulse'),
            api.get('/api/climate')
        ]).then(([statsRes, chartsRes, recentRes, mlRes, climateRes]) => {
            setStats(statsRes.data);
            setCharts(chartsRes.data);
            setRecentDecisions(recentRes.data);
            setMaturity(mlRes.data);
            setClimate(climateRes.data);
        }).catch(err => {
            console.error('Dashboard fetch error:', err);
        }).finally(() => setLoading(false));
    }, [activeRange]);

    const range = RANGES.find(r => r.val === activeRange);
    const energyLabels = charts?.weekly?.labels || [];
    const energyData = (charts?.weekly?.data || []).map(num);
    const occupancyLabels = charts?.hourly?.labels || [];
    const occupancyData = (charts?.hourly?.data || []).map(num);

    const saved = num(stats.energy_saved);
    const baseline = num(stats.baseline_energy);
    const consumed = Math.max(baseline - saved, 0);
    const efficiency = baseline > 0 ? (saved / baseline) * 100 : 0;
    const co2Kg = num(stats.co2_reduced) * 1000;
    const occupancy = num(stats.avg_occupancy);

    const energySummary = useMemo(() => {
        const active = energyData.filter(v => v > 0);
        const peakIndex = energyData.indexOf(Math.max(...energyData, 0));
        return {
            total: energyData.reduce((a, b) => a + b, 0),
            avg: active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0,
            peak: energyData.length && energyData[peakIndex] > 0 ? energyLabels[peakIndex] : '—',
            activeDays: active.length
        };
    }, [energyData.join(), energyLabels.join()]);

    const axis = {
        grid: { color: theme.border, drawTicks: false },
        border: { display: false },
        ticks: { color: theme.muted, font: { size: 11 }, padding: 8 }
    };

    const tooltip = {
        backgroundColor: theme.surface,
        titleColor: theme.text,
        bodyColor: theme.muted,
        borderColor: theme.border,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 250,
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: ctx => `${fmt(ctx.parsed.y)} kWh saved` } } },
        scales: {
            y: { ...axis, beginAtZero: true, ticks: { ...axis.ticks, maxTicksLimit: 5 } },
            x: {
                ...axis,
                grid: { display: false },
                ticks: {
                    ...axis.ticks,
                    color: ctx => (ctx.index === energyLabels.length - 1 ? theme.text : theme.muted),
                    font: ctx => ({ size: 11, weight: ctx.index === energyLabels.length - 1 ? '700' : '400' }),
                    maxRotation: 0,
                    autoSkipPadding: 12
                }
            }
        }
    };

    const barData = {
        labels: energyLabels,
        datasets: [{
            data: energyData,
            backgroundColor: ctx => {
                const last = ctx.dataIndex === energyLabels.length - 1;
                const { chart } = ctx;
                if (theme.bar) return last ? theme.bar : theme.barSoft;
                if (!chart.chartArea) return last ? '#00f59b' : 'rgba(0, 245, 155, 0.35)';
                const g = chart.ctx.createLinearGradient(0, chart.chartArea.bottom, 0, chart.chartArea.top);
                g.addColorStop(0, last ? 'rgba(6, 182, 212, 0.9)' : 'rgba(6, 182, 212, 0.25)');
                g.addColorStop(1, last ? '#00f59b' : 'rgba(0, 245, 155, 0.45)');
                return g;
            },
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: activeRange === '1m' ? 14 : 36,
            minBarLength: 3
        }]
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 250,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { label: ctx => `${fmt(ctx.parsed.y, 0)}% occupancy` } } },
        scales: {
            y: { ...axis, beginAtZero: true, suggestedMax: 100, ticks: { ...axis.ticks, maxTicksLimit: 5, callback: v => `${v}%` } },
            x: { ...axis, grid: { display: false }, ticks: { ...axis.ticks, maxRotation: 0, autoSkipPadding: 12 } }
        }
    };

    const lineData = {
        labels: occupancyLabels,
        datasets: [{
            data: occupancyData,
            borderColor: theme.line,
            borderWidth: 2,
            backgroundColor: ctx => {
                const { chart } = ctx;
                if (!chart.chartArea) return 'rgba(56, 189, 248, 0.1)';
                const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
                g.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
                g.addColorStop(1, 'rgba(56, 189, 248, 0)');
                return g;
            },
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: theme.line,
            pointHoverBorderColor: theme.surface,
            pointHoverBorderWidth: 2
        }]
    };

    const gaugeR = 62;
    const gaugeC = 2 * Math.PI * gaugeR;

    const actionCounts = recentDecisions.reduce((acc, d) => ({ ...acc, [d.occupancy]: (acc[d.occupancy] || 0) + 1 }), {});

    return (
        <div className="fade-in dash-page">
            {/* Header */}
            <div className="dash-header">
                <div>
                    <span className="rooms-eyebrow">
                        Operations overview · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Operational <span className="text-gradient">Intelligence</span>
                    </h2>
                    <div className="dash-chips">
                        <span className="dash-chip"><i className="dash-live" />Live</span>
                        <span className="dash-chip"><FiCpu /> {maturity.evolution_level}{maturity.accuracy ? ` · ${fmt(maturity.accuracy)}% accuracy` : ''}</span>
                        {climate && (
                            <span className="dash-chip" style={{ '--chip-color': climate.climate_mode_color || '#f59e0b' }}>
                                <FiThermometer /> {climate.city} {fmt(climate.temperature)}°C · {climate.season_label}
                            </span>
                        )}
                    </div>
                </div>
                <div className="tt-segmented" role="tablist" aria-label="Reporting period">
                    {RANGES.map(r => (
                        <button key={r.val} type="button" role="tab" aria-selected={activeRange === r.val} className={activeRange === r.val ? 'active' : ''} onClick={() => setActiveRange(r.val)}>
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="dash-kpis">
                {loading ? [1, 2, 3, 4].map(i => <div className="dash-kpi skeleton" key={i} />) : (
                    <>
                        <KpiCard
                            icon={FiZap}
                            label="Energy saved"
                            value={fmt(saved)}
                            unit="kWh"
                            color="#00f59b"
                            footer={<><span>Projected {range.period}</span><strong>{fmt(stats.today_estimation ?? saved)} kWh</strong></>}
                        >
                            <Sparkline data={energyData} color="#00f59b" />
                        </KpiCard>
                        <KpiCard
                            icon={FiTarget}
                            label="Efficiency vs baseline"
                            value={fmt(efficiency, 0)}
                            unit="%"
                            color="#06b6d4"
                            footer={<><span>Baseline {fmt(baseline)} kWh</span><strong>−{fmt(saved)} kWh</strong></>}
                        >
                            <div className="dash-meter"><span style={{ width: `${Math.min(100, efficiency)}%` }} /></div>
                        </KpiCard>
                        <KpiCard
                            icon={FiUsers}
                            label="Average occupancy"
                            value={fmt(occupancy, 0)}
                            unit="%"
                            color="#38bdf8"
                            footer={<><span>Across {stats.active_classrooms} rooms</span><strong>{occupancy >= 75 ? 'High' : occupancy >= 50 ? 'Balanced' : 'Light'}</strong></>}
                        >
                            <Sparkline data={occupancyData} color="#38bdf8" />
                        </KpiCard>
                        <KpiCard
                            icon={FiWind}
                            label="CO₂ avoided"
                            value={co2Kg >= 1000 ? fmt(co2Kg / 1000, 2) : fmt(co2Kg, 0)}
                            unit={co2Kg >= 1000 ? 't' : 'kg'}
                            color="#a78bfa"
                            footer={<><span>{stats.total_decisions} AI decisions</span><strong>{KG_CO2_PER_KWH} kg / kWh</strong></>}
                        >
                            <div className="dash-meter"><span style={{ width: `${Math.min(100, (stats.total_decisions / Math.max(stats.active_classrooms * 10, 1)) * 100)}%` }} /></div>
                        </KpiCard>
                    </>
                )}
            </div>

            {/* Energy + efficiency */}
            <div className="dash-row">
                <section className={`dash-card dash-span-8 ${loading ? 'skeleton' : ''}`}>
                    {!loading && (
                        <>
                            <CardHeader title="Energy saved" subtitle={`kWh saved by AI recommendations, ${range.period}`}>
                                <div className="dash-mini-stats">
                                    <div><small>Total</small><strong>{fmt(energySummary.total)} kWh</strong></div>
                                    <div><small>Daily avg</small><strong>{fmt(energySummary.avg)} kWh</strong></div>
                                    <div><small>Peak</small><strong>{energySummary.peak}</strong></div>
                                </div>
                            </CardHeader>
                            <div className="dash-chart" style={{ minHeight: 280 }}>
                                <Bar data={barData} options={barOptions} />
                            </div>
                        </>
                    )}
                </section>

                <section className={`dash-card dash-span-4 ${loading ? 'skeleton' : ''}`}>
                    {!loading && (
                        <>
                            <CardHeader title="Optimisation rate" subtitle="Saved energy against the all-on baseline" />
                            <div className="dash-gauge">
                                <svg viewBox="0 0 160 160" aria-hidden="true">
                                    <defs>
                                        <linearGradient id="dashGauge" x1="0" x2="1" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#00f59b" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="80" cy="80" r={gaugeR} className="dash-gauge-track" />
                                    <circle
                                        cx="80" cy="80" r={gaugeR}
                                        className="dash-gauge-value"
                                        strokeDasharray={`${(Math.min(100, efficiency) / 100) * gaugeC} ${gaugeC}`}
                                    />
                                </svg>
                                <div className="dash-gauge-label">
                                    <strong>{fmt(efficiency, 0)}%</strong>
                                    <small>optimised</small>
                                </div>
                            </div>
                            <div className="dash-breakdown">
                                <div><span><i style={{ background: theme.bar || '#00f59b' }} />Saved</span><strong>{fmt(saved)} kWh</strong></div>
                                <div><span><i style={{ background: theme.muted }} />Consumed</span><strong>{fmt(consumed)} kWh</strong></div>
                                <div className="total"><span>Baseline</span><strong>{fmt(baseline)} kWh</strong></div>
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* Occupancy + climate + actions */}
            <div className="dash-row">
                <section className={`dash-card dash-span-5 ${loading ? 'skeleton' : ''}`}>
                    {!loading && (
                        <>
                            <CardHeader title="Occupancy trend" subtitle={`Average classroom occupancy, ${range.period}`}>
                                <span className="dash-pill"><FiTrendingUp /> {fmt(occupancy, 0)}% avg</span>
                            </CardHeader>
                            <div className="dash-chart">
                                <Line data={lineData} options={lineOptions} />
                            </div>
                        </>
                    )}
                </section>

                <section className={`dash-card dash-span-3 ${loading ? 'skeleton' : ''}`}>
                    {!loading && climate && (
                        <>
                            <CardHeader title="Campus climate" subtitle={`${climate.city} · ${climate.weather}`} />
                            <div className="dash-climate">
                                <div className="dash-climate-temp">
                                    <strong>{fmt(climate.temperature)}°</strong>
                                    <span>Feels like {fmt(climate.feels_like)}°C</span>
                                </div>
                                <span className="dash-climate-mode" style={{ '--chip-color': climate.climate_mode_color || '#10b981' }}>
                                    {climate.climate_mode_label}
                                </span>
                            </div>
                            <p className="dash-climate-note">{climate.description}</p>
                            <div className="dash-climate-grid">
                                <div><FiDroplet /><small>Humidity</small><strong>{climate.humidity}%</strong></div>
                                <div><FiThermometer /><small>Typical</small><strong>{climate.typical_temp_range}</strong></div>
                            </div>
                        </>
                    )}
                </section>

                <section className={`dash-card dash-span-4 ${loading ? 'skeleton' : ''}`}>
                    {!loading && (
                        <>
                            <CardHeader title={activeRange === '1d' ? 'Recent AI actions' : 'Top AI actions'} subtitle={`${recentDecisions.length} recommendations ${range.period}`}>
                                <FiActivity className="dash-head-icon" />
                            </CardHeader>
                            {recentDecisions.length > 0 && (
                                <div className="dash-level-bar" aria-label="Recommendations by occupancy level">
                                    {Object.keys(LEVEL_COLORS).filter(l => actionCounts[l]).map(l => (
                                        <span key={l} style={{ flex: actionCounts[l], background: LEVEL_COLORS[l] }} title={`${l}: ${actionCounts[l]}`} />
                                    ))}
                                </div>
                            )}
                            <div className="dash-actions">
                                {recentDecisions.length > 0 ? recentDecisions.slice(0, 5).map(d => (
                                    <div key={d.id} className="dash-action">
                                        <span className="dash-action-dot" style={{ '--level': LEVEL_COLORS[d.occupancy] || '#94a3b8' }} />
                                        <div className="dash-action-text">
                                            <strong>{d.classroom}</strong>
                                            <small>{d.occupancy} occupancy{d.timestamp ? ` · ${d.timestamp}` : ''}</small>
                                        </div>
                                        <span className="dash-action-saved">−{fmt(d.saved)} kWh</span>
                                    </div>
                                )) : (
                                    <p className="dash-empty">No AI actions in this period yet.</p>
                                )}
                            </div>
                            <button type="button" onClick={() => navigate('/ml-lab')} className="dash-link">
                                View all decisions <FiChevronRight />
                            </button>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Dashboard;
