import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FiZap, FiHome, FiUsers, FiGlobe, FiCpu, FiActivity, FiArrowUpRight, FiChevronRight } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

function Dashboard() {
    const [stats, setStats] = useState({
        energy_saved: 1240, active_classrooms: 8, avg_occupancy: 65, co2_reduced: 2.4, total_decisions: 128
    });
    const [recentDecisions, setRecentDecisions] = useState([]);

    useEffect(() => {
        api.get('/api/dashboard/stats').then(res => setStats(res.data));
        api.get('/api/decisions/recent').then(res => setRecentDecisions(res.data));
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 11 } },
                border: { display: false }
            }
        }
    };

    const barData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
            data: [42, 38, 55, 30, 48, 20],
            backgroundColor: 'rgba(124, 58, 237, 0.8)',
            hoverBackgroundColor: '#a78bfa',
            borderRadius: 8,
            borderSkipped: false,
        }]
    };

    const lineData = {
        labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
        datasets: [{
            data: [10, 45, 78, 65, 42, 15],
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#7c3aed',
            pointBorderColor: '#09090b',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
        }]
    };

    const doughnutData = {
        labels: ['Optimized', 'Baseline'],
        datasets: [{
            data: [stats.energy_saved, Math.max(3000 - stats.energy_saved, 500)],
            backgroundColor: ['#7c3aed', '#27272a'],
            borderWidth: 0,
            cutout: '75%',
        }]
    };

    const statCards = [
        { label: 'Energy Saved', val: stats.energy_saved, unit: 'kWh', icon: <FiZap />, gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
        { label: 'Active Nodes', val: stats.active_classrooms, unit: '', icon: <FiHome />, gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)' },
        { label: 'Avg Occupancy', val: stats.avg_occupancy, unit: '%', icon: <FiUsers />, gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
        { label: 'CO₂ Offset', val: stats.co2_reduced, unit: 'T', icon: <FiGlobe />, gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }
    ];

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '0.7rem' }}>LIVE</span>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></div>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Command <span className="text-gradient">Center</span>
                    </h2>
                    <p className="text-muted small m-0">Real-time AI optimization intelligence</p>
                </div>
                <div className="d-flex gap-2">
                    <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', padding: '0.5rem 1rem' }}>
                        <FiCpu className="me-2" /> {stats.total_decisions} Decisions
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="row g-4 mb-5">
                {statCards.map((s, i) => (
                    <div className="col-md-6 col-lg-3" key={i}>
                        <div className="card h-100 border-0" style={{ background: 'var(--bg-card)' }}>
                            <div className="d-flex justify-content-between align-items-start mb-4">
                                <div className="icon-box" style={{ background: s.gradient }}>
                                    {s.icon}
                                </div>
                                <FiArrowUpRight className="text-muted" style={{ opacity: 0.4 }} />
                            </div>
                            <h3 className="fw-bold mb-1 stat-value" style={{ fontSize: '2rem', letterSpacing: '-0.03em' }}>
                                {s.val}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{s.unit}</span>
                            </h3>
                            <p className="text-muted small m-0 text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="row g-4 mb-5">
                <div className="col-lg-8">
                    <div className="card h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h6 className="fw-bold mb-1">Weekly Energy Consumption</h6>
                                <p className="text-muted small m-0">kWh usage by day</p>
                            </div>
                            <div className="d-flex gap-2">
                                {['1W', '1M', '3M'].map((t, i) => (
                                    <button key={i} className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-primary-dim'}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ height: '280px' }}>
                            <Bar data={barData} options={chartOptions} />
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card h-100 text-center">
                        <h6 className="fw-bold mb-1">Optimization Rate</h6>
                        <p className="text-muted small mb-4">Energy saved vs baseline</p>
                        <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                                <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '75%' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <h3 className="fw-bold text-gradient mb-0">{Math.round((stats.energy_saved / 3000) * 100)}%</h3>
                                    <small className="text-muted" style={{ fontSize: '0.7rem' }}>Efficiency</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h6 className="fw-bold mb-1">Occupancy Trend</h6>
                                <p className="text-muted small m-0">Today's classroom activity</p>
                            </div>
                        </div>
                        <div style={{ height: '200px' }}>
                            <Line data={lineData} options={chartOptions} />
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card h-100">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h6 className="fw-bold m-0">
                                <FiActivity className="me-2 text-primary" /> Recent AI Actions
                            </h6>
                        </div>
                        <div className="d-flex flex-column gap-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                            {recentDecisions.length > 0 ? recentDecisions.slice(0, 5).map(d => (
                                <div key={d.id} className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'rgba(124, 58, 237, 0.04)' }}>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.occupancy === 'High' ? '#10b981' : d.occupancy === 'Medium' ? '#f59e0b' : '#ef4444' }}></div>
                                        <span className="small fw-medium">{d.classroom}</span>
                                    </div>
                                    <span className="text-muted small">{d.saved} kWh</span>
                                </div>
                            )) : (
                                <p className="text-muted small text-center py-4">No actions yet</p>
                            )}
                        </div>
                        <button className="btn btn-primary-dim w-100 mt-3 py-2 small">
                            View All <FiChevronRight className="ms-1" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
