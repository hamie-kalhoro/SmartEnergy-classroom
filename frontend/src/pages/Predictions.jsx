import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiCpu, FiPlay, FiTrendingUp, FiActivity, FiZap, FiSun, FiWind, FiCheckCircle } from 'react-icons/fi';

function Predictions() {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);

    const runPredictions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/predict');
            setPredictions(res.data);
            setHasRun(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getOccupancyColor = (level) => {
        if (level === 'High') return '#10b981';
        if (level === 'Medium') return '#f59e0b';
        return '#ef4444';
    };

    const stats = {
        total: predictions.length,
        optimized: predictions.filter(p => p.occupancy !== 'High').length,
        savingsEstimate: predictions.filter(p => p.occupancy !== 'High').length * 2.5
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-end mb-5">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', fontSize: '0.7rem' }}>
                            <FiCpu className="me-1" /> AI ENGINE
                        </span>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Prediction <span className="text-gradient">Intelligence</span>
                    </h2>
                    <p className="text-muted small m-0">ML-driven occupancy forecasting & energy optimization</p>
                </div>
                <button
                    className="btn btn-gradient py-3 px-4"
                    onClick={runPredictions}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                        <><FiPlay className="me-2" /> Run Analysis</>
                    )}
                </button>
            </div>

            {/* Results Summary */}
            {hasRun && (
                <div className="row g-3 mb-5 fade-in">
                    {[
                        { label: 'Classes Analyzed', val: stats.total, icon: <FiActivity />, color: '#00d26a' },
                        { label: 'Optimizable Slots', val: stats.optimized, icon: <FiTrendingUp />, color: '#06b6d4' },
                        { label: 'Est. Savings', val: `${stats.savingsEstimate.toFixed(1)} kWh`, icon: <FiZap />, color: '#10b981' }
                    ].map((s, i) => (
                        <div className="col-md-4" key={i}>
                            <div className="card d-flex flex-row align-items-center gap-4" style={{ padding: '1.25rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: `${s.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: s.color,
                                    fontSize: '1.25rem'
                                }}>
                                    {s.icon}
                                </div>
                                <div>
                                    <h4 className="fw-bold mb-0">{s.val}</h4>
                                    <span className="text-muted small text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{s.label}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results Grid */}
            {predictions.length > 0 ? (
                <div className="row g-4">
                    {predictions.map((p, i) => (
                        <div className="col-md-6 col-lg-4" key={i}>
                            <div className="card h-100 fade-in-delay" style={{ animationDelay: `${i * 0.05}s` }}>
                                {/* Top Glow */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-1px',
                                    left: '20%',
                                    right: '20%',
                                    height: '2px',
                                    background: getOccupancyColor(p.occupancy),
                                    opacity: 0.8,
                                    filter: 'blur(1px)'
                                }} />

                                <div className="d-flex justify-content-between align-items-start mb-4">
                                    <div>
                                        <h5 className="fw-bold mb-1">{p.classroom}</h5>
                                        <span className="text-muted small">{p.subject}</span>
                                    </div>
                                    <span className="badge fw-bold" style={{
                                        background: `${getOccupancyColor(p.occupancy)}20`,
                                        color: getOccupancyColor(p.occupancy)
                                    }}>
                                        {p.occupancy}
                                    </span>
                                </div>

                                {/* Metrics */}
                                <div className="row g-3 mb-4">
                                    <div className="col-6">
                                        <div className="p-2 rounded-2" style={{ background: 'var(--bg-elevated)' }}>
                                            <div className="small text-muted" style={{ fontSize: '0.65rem' }}>TIME</div>
                                            <div className="fw-bold">{p.time}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded-2" style={{ background: 'var(--bg-elevated)' }}>
                                            <div className="small text-muted" style={{ fontSize: '0.65rem' }}>ATTENDANCE</div>
                                            <div className="fw-bold">{p.attendance}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendation */}
                                <div className="p-3 rounded-3" style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.1)' }}>
                                    <div className="small text-muted mb-2" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Recommendation</div>
                                    <div className="d-flex gap-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <FiSun style={{ color: p.recommendation.includes('Lights ON') ? '#f59e0b' : 'var(--text-muted)', opacity: p.recommendation.includes('Lights ON') ? 1 : 0.3 }} />
                                            <span className="small">{p.recommendation.includes('Lights ON') ? 'ON' : 'OFF'}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <FiWind style={{ color: p.recommendation.includes('AC ON') ? '#06b6d4' : 'var(--text-muted)', opacity: p.recommendation.includes('AC ON') ? 1 : 0.3 }} />
                                            <span className="small">{p.recommendation.includes('AC ON') ? 'ON' : 'OFF'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-5">
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        borderRadius: '50%',
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FiCpu style={{ fontSize: '2rem', opacity: 0.3 }} />
                    </div>
                    <h5 className="fw-bold mb-2">No Predictions Yet</h5>
                    <p className="text-muted mb-4">Click "Run Analysis" to generate AI predictions for all scheduled classes</p>
                    <button className="btn btn-gradient mx-auto py-3 px-5" onClick={runPredictions} disabled={loading}>
                        {loading ? <span className="spinner-border spinner-border-sm"></span> : <><FiPlay className="me-2" /> Run Analysis</>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default Predictions;
