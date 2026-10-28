import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
    Chart as ChartJS,
    registerables
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FiZap, FiHome, FiUsers, FiGlobe, FiCpu, FiActivity, FiArrowUpRight, FiChevronRight, FiThermometer } from 'react-icons/fi';

ChartJS.register(...registerables);

// PERFECT WEEKEND PLUGIN: Draws the "Stylish Underline" for Sat/Sun
const weekendPlugin = {
    id: 'weekendUnderline',
    afterDraw: (chart) => {
        try {
            const { ctx, chartArea: { bottom }, scales } = chart;
            const x = scales?.x;
            if (!x || !x.ticks) return;
            
            x.ticks.forEach((tick, index) => {
                const label = x.getLabelForValue(tick.value);
                if (label === 'Sat' || label === 'Sun') {
                    const xPos = x.getPixelForTick(index);
                    ctx.save();
                    ctx.strokeStyle = '#f59e0b'; // Amber Glow
                    ctx.lineWidth = 2;
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = '#f59e0b';
                    ctx.beginPath();
                    ctx.moveTo(xPos - 12, bottom + 25);
                    ctx.lineTo(xPos + 12, bottom + 25);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        } catch (e) {
            console.error("Plugin Error:", e);
        }
    }
};

function Dashboard() {
    console.log('>> [DEBUG] Dashboard Component Mount/Render');
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        energy_saved: 0, active_classrooms: 0, avg_occupancy: 0, co2_reduced: 0, total_decisions: 0
    });
    const [charts, setCharts] = useState({
        weekly: { labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], data: [0, 0, 0, 0, 0, 0, 0] },
        hourly: { labels: ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'], data: [0, 0, 0, 0, 0, 0, 0, 0] }
    });
    const [activeRange, setActiveRange] = useState('1w'); // '1w' or '1m'
    const [recentDecisions, setRecentDecisions] = useState([]);
    const [maturity, setMaturity] = useState({ evolution_level: 'Seedling', coverage_pct: 10 });
    const [climateData, setClimateData] = useState(null);
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
            setClimateData(climateRes.data);
        }).catch(err => {
            console.error("Dashboard Fetch Error:", err);
        }).finally(() => setLoading(false));
    }, [activeRange]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                ticks: { color: '#71717a', font: { size: 10 } }
            },
            x: {
                grid: { display: false },
                ticks: { 
                    color: (context) => {
                        const label = context.tick.label;
                        if (label === 'Sat' || label === 'Sun') return '#f59e0b';
                        // Today highlight
                        if (context.index === context.chart.scales.x.ticks.length - 1) return '#ffffff';
                        return '#71717a';
                    },
                    font: { size: 11, weight: (context) => context.index === context.chart.scales.x.ticks.length - 1 ? '700' : '400' }
                },
                border: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
        },
        // Auto-scale bars based on count
        categoryPercentage: activeRange === '1w' ? 0.8 : 0.9,
        barPercentage: activeRange === '1w' ? 0.7 : 0.8
    };

    const barData = {
        labels: charts?.weekly?.labels || [],
        datasets: [
            {
                label: 'Actual Saved',
                data: (charts?.weekly?.data || []).map(v => parseFloat(v) || 0),
                backgroundColor: (charts?.weekly?.labels || []).map((l, i) => 
                    i === (charts?.weekly?.labels || []).length - 1 ? '#00f59b' : 'rgba(0, 245, 155, 0.3)'
                ),
                borderRadius: 6,
                borderSkipped: false,
                barThickness: activeRange === '1w' ? 28 : (window.innerWidth < 768 ? 6 : 12)
            },
            {
                label: 'Projected Total',
                data: (charts?.weekly?.labels || []).map((l, i) => 
                    i === (charts?.weekly?.labels || []).length - 1 ? (parseFloat(charts?.weekly?.today_projection) || 0) : 0
                ),
                backgroundColor: 'rgba(0, 245, 155, 0.1)',
                borderRadius: 6,
                borderSkipped: false,
                barThickness: activeRange === '1w' ? 28 : (window.innerWidth < 768 ? 6 : 12),
                grouped: false // Stake on top
            }
        ]
    };

    const lineData = {
        labels: charts?.hourly?.labels || [],
        datasets: [{
            data: (charts?.hourly?.data || []).map(v => parseFloat(v) || 0),
            borderColor: '#00f59b',
            backgroundColor: 'rgba(0, 245, 155, 0.08)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00f59b',
            pointBorderColor: '#09090b',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
        }]
    };

    const doughnutData = {
        labels: ['Optimized', 'Baseline'],
        datasets: [{
            data: [
                parseFloat(stats.energy_saved) || 0, 
                Math.max((parseFloat(stats.baseline_energy) || 3000) - (parseFloat(stats.energy_saved) || 0), 1)
            ],
            backgroundColor: ['#00f59b', '#27272a'],
            borderWidth: 0,
            cutout: '75%',
        }]
    };

    const statCards = [
        {
            label: 'Total Saved',
            val: stats.energy_saved,
            unit: 'kWh',
            icon: <FiZap />,
            gradient: 'linear-gradient(135deg, #00f59b 0%, #22e6b6 50%, #06b6d4 100%)',
            sub: stats.today_estimation !== undefined ? `${activeRange === '1d' ? 'Today' : activeRange === '1w' ? 'Weekly' : 'Monthly'} Projection: ${stats.today_estimation} kWh` : `Est. Period EOD: ${stats.energy_saved || 0} kWh`
        },
        stats.efficiency_growth !== undefined ? {
            label: 'Growth Rate',
            val: stats.efficiency_growth || 0,
            unit: '%',
            icon: <FiActivity />,
            gradient: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)', // Restored to PINK/RED
            sub: `${stats.growth_label || 'stable'} vs last ${activeRange === '1d' ? 'day' : activeRange === '1w' ? 'week' : 'month'}`
        } : null,
        { label: 'Avg Occupancy', val: stats.avg_occupancy, unit: '%', icon: <FiUsers />, gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
        { label: 'Active Nodes', val: stats.active_classrooms, unit: '', icon: <FiHome />, gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' },
    ].filter(Boolean);

    return (
        <div className="fade-in">
            <div className="d-flex align-items-end justify-content-between mb-4">
                <div>
                    <div className="d-flex align-items-center gap-3 mb-2">
                        <h2 className="fw-bold m-0" style={{ letterSpacing: '-0.02em', fontSize: '1.75rem' }}>
                            Operational <span className="text-secondary-glow">Intelligence</span>
                        </h2>
                        <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ 
                            background: 'rgba(0, 245, 155, 0.08)', 
                            border: '1px solid rgba(0, 245, 155, 0.2)',
                            boxShadow: '0 0 15px rgba(0, 245, 155, 0.05)'
                        }}>
                            <div className="pulse-dot"></div>
                            <span className="fw-bold extra-small text-uppercase tracking-wider" style={{ color: 'var(--primary-light)', fontSize: '0.65rem' }}>
                                AI Level: {maturity.evolution_level}
                            </span>
                        </div>
                        {climateData && (
                            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ 
                                background: `${climateData.climate_mode_color || '#f59e0b'}10`, 
                                border: `1px solid ${climateData.climate_mode_color || '#f59e0b'}30`,
                                boxShadow: `0 0 15px ${climateData.climate_mode_color || '#f59e0b'}08`
                            }}>
                                <FiThermometer style={{ fontSize: '0.7rem', color: climateData.climate_mode_color || '#f59e0b' }} />
                                <span className="fw-bold extra-small text-uppercase tracking-wider" style={{ color: climateData.climate_mode_color || '#f59e0b', fontSize: '0.65rem' }}>
                                    {climateData.climate_mode_icon} {climateData.temperature}°C · {climateData.season_label}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-muted small m-0">Live energy consumption & climate-aware forecasting</p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge" style={{ background: 'rgba(0, 245, 155, 0.08)', color: 'var(--primary-light)', padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid rgba(0,210,106,0.15)' }}>
                        <FiCpu className="me-2" /> {stats.total_decisions} Decisions
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="row g-4 mb-5">
                {loading ? (
                    [1, 2, 3, 4].map(i => (
                        <div className="col-md-6 col-lg-3" key={i}>
                            <div className="card h-100 border-0 skeleton" style={{ minHeight: '148px' }}></div>
                        </div>
                    ))
                ) : (
                    statCards.map((s, i) => (
                        <div className="col-md-6 col-lg-3" key={i}>
                            <div className="card h-100 border-0 glow-border" style={{ background: 'var(--bg-card)' }}>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="icon-box" style={{ background: s.gradient }}>
                                        {s.icon}
                                    </div>
                                    <FiArrowUpRight className="text-muted" style={{ opacity: 0.4 }} />
                                </div>
                                <h3 className="fw-bold mb-1 stat-value" style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>
                                    {s.val}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{s.unit}</span>
                                </h3>
                                <p className="text-muted small m-0 text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{s.label}</p>
                                {s.sub && (
                                    <p className="m-0 mt-3 small" style={{ 
                                        fontSize: '0.65rem', 
                                        color: s.label === 'Growth Rate' ? '#f43f5e' : 'var(--primary-light)', 
                                        fontWeight: '600', 
                                        opacity: 0.8 
                                    }}>
                                        {s.sub}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Charts Row */}
            <div className="row g-4 mb-5">
                <div className="col-lg-8">
                    <div className={`card h-100 ${loading ? 'skeleton' : ''}`} style={{ minHeight: '350px' }}>
                        {!loading && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h6 className="fw-bold mb-1">{activeRange === '1d' ? "Today's Energy Consumption" : activeRange === '1w' ? "Weekly Energy Consumption" : "Monthly Energy Consumption"}</h6>
                                        <p className="text-muted small m-0">kWh usage by day</p>
                                    </div>
                                    <div className="d-flex gap-2">
                                        {[
                                            { label: 'Today', val: '1d' },
                                            { label: '1Week', val: '1w' },
                                            { label: '1Month', val: '1m' }
                                        ].map((t) => (
                                            <button 
                                                key={t.val} 
                                                onClick={() => setActiveRange(t.val)}
                                                className={`btn btn-sm ${activeRange === t.val ? 'btn-primary' : 'btn-primary-dim'}`} 
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ height: '300px' }}>
                                    <Bar data={barData} options={chartOptions} plugins={[weekendPlugin]} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className={`card h-100 text-center ${loading ? 'skeleton' : ''}`} style={{ minHeight: '350px' }}>
                        {!loading && (
                            <>
                                <h6 className="fw-bold mb-1">Optimization Rate</h6>
                                <p className="text-muted small mb-4">Energy saved vs baseline</p>
                                <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                                    <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                                        <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '75%' }} />
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                            <h3 className="fw-bold text-gradient mb-0">{parseFloat(stats.baseline_energy) > 0 ? Math.round((parseFloat(stats.energy_saved) / parseFloat(stats.baseline_energy)) * 100) : 0}%</h3>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>Efficiency</small>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="row g-4">
                <div className="col-lg-8">
                    <div className={`card ${loading ? 'skeleton' : ''}`} style={{ minHeight: '300px' }}>
                        {!loading && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h6 className="fw-bold mb-1">Occupancy Trend</h6>
                                        <p className="text-muted small m-0">{activeRange === '1d' ? "Today's" : activeRange === '1w' ? "Weekly" : "Monthly"} classroom activity</p>
                                    </div>
                                </div>
                                <div style={{ height: '200px' }}>
                                    <Line data={lineData} options={chartOptions} />
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className={`card h-100 ${loading ? 'skeleton' : ''}`} style={{ minHeight: '300px' }}>
                        {!loading && (
                            <>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h6 className="fw-bold m-0">
                                        <FiActivity className="me-2 text-primary" /> {activeRange === '1d' ? 'Recent' : 'Top'} AI Actions
                                    </h6>
                                </div>
                                <div className="d-flex flex-column gap-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                                    {recentDecisions.length > 0 ? recentDecisions.slice(0, 5).map(d => (
                                        <div key={d.id} className="d-flex justify-content-between align-items-center mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div style={{ 
                                                    width: '8px', height: '8px', borderRadius: '50%', 
                                                    background: d.occupancy === 'Maximum' ? '#10b981' : 
                                                                d.occupancy === 'Balanced' ? '#06b6d4' : 
                                                                d.occupancy === 'Light' ? '#f59e0b' : 
                                                                d.occupancy === 'Trace' ? '#f97316' : '#ef4444' 
                                                }}></div>
                                                <span className="small fw-bold" style={{ color: 'var(--text)' }}>{d.classroom}</span>
                                            </div>
                                            <span className="text-muted small">{d.saved} kWh</span>
                                        </div>
                                    )) : (
                                        <p className="text-muted small text-center py-4">No actions yet</p>
                                    )}
                                </div>
                                <button onClick={() => navigate('/ml-lab')} className="btn btn-sm btn-primary-dim w-100 mt-3">
                                    View All <FiChevronRight className="ms-1" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
