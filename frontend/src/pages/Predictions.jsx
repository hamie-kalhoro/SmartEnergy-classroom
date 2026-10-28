import React, { useState } from 'react';
import api from '../api';
import { FiCpu, FiPlay, FiTrendingUp, FiActivity, FiZap, FiSun, FiWind, FiCheckCircle, FiArrowUpRight, FiDroplet, FiThermometer } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import DynamicLoader from '../components/DynamicLoader';

function Predictions() {
    const [predictions, setPredictions] = useState([]);
    const [climate, setClimate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);

    const runPredictions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/predict');
            setPredictions(res.data.predictions || res.data);
            setClimate(res.data.climate || null);
            setHasRun(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getOccupancyColor = (level) => {
        if (level === 'Maximum') return '#10b981'; // Success Green
        if (level === 'Balanced') return '#06b6d4'; // Cyan
        if (level === 'Light') return '#f59e0b'; // Amber
        if (level === 'Trace') return '#f97316'; // Orange
        return '#ef4444'; // Empty/Red
    };

    const getEnergyModeStyle = (mode) => {
        const styles = {
            eco: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'ECO' },
            balanced: { bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', label: 'BALANCED' },
            comfort: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'COMFORT' },
            full: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'FULL POWER' }
        };
        return styles[mode] || styles.balanced;
    };

    const getDeviceColor = (state) => {
        if (state === 'OFF') return '#64748b';
        if (state === 'ECO' || state === 'LOW') return '#06b6d4';
        if (state === 'DIM (50%)') return '#f59e0b';
        return '#10b981'; // ON, HIGH, FULL
    };

    const getDeviceOpacity = (state) => {
        return state === 'OFF' ? 0.4 : 1;
    };

    const stats = {
        total: predictions.length,
        optimized: predictions.filter(p => p.occupancy !== 'Maximum').length,
        savingsEstimate: predictions.reduce((acc, p) => acc + (parseFloat(p.energy_saved) || 1.5), 0)
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-end mb-4">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa', fontSize: '0.7rem' }}>
                            <FiCpu className="me-1" /> AI ENGINE
                        </span>
                        {climate && (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.7rem' }}>
                                <FiThermometer className="me-1" /> CLIMATE AWARE
                            </span>
                        )}
                    </div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Prediction <span className="text-gradient">Intelligence</span>
                    </h2>
                    <p className="text-muted small m-0">ML-driven occupancy forecasting & climate-aware energy optimization</p>
                </div>
                <button
                    className="btn btn-lg btn-gradient"
                    onClick={runPredictions}
                    disabled={loading}
                >
                    {loading ? (
                        <DynamicLoader size={20} color="var(--bg-deep)" />
                    ) : (
                        <><FiPlay className="me-2" /> Run Analysis</>
                    )}
                </button>
            </div>

            {/* Climate Intelligence Bar */}
            {climate && (
                <div className="card mb-5 fade-in" style={{
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
                    border: `1px solid ${climate.climate_mode_color}25`,
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {/* Accent glow line */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${climate.climate_mode_color}, transparent)`,
                        opacity: 0.7
                    }} />

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                        {/* Season & Mode */}
                        <div className="d-flex align-items-center gap-3">
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '16px',
                                background: `${climate.climate_mode_color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                border: `1px solid ${climate.climate_mode_color}25`
                            }}>
                                {climate.climate_mode_icon || climate.season_icon}
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <h6 className="fw-bold mb-0" style={{ color: 'var(--text)' }}>
                                        {climate.climate_mode_label}
                                    </h6>
                                    <span className="badge" style={{
                                        background: `${climate.climate_mode_color}15`,
                                        color: climate.climate_mode_color,
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em'
                                    }}>
                                        {climate.season} Season
                                    </span>
                                </div>
                                <p className="text-muted small m-0" style={{ fontSize: '0.75rem' }}>
                                    {climate.description}
                                </p>
                            </div>
                        </div>

                        {/* Climate Stats */}
                        <div className="d-flex gap-4 align-items-center">
                            <div className="text-center">
                                <div className="d-flex align-items-center gap-1 justify-content-center">
                                    <FiThermometer style={{ color: climate.climate_mode_color, fontSize: '0.9rem' }} />
                                    <span className="fw-bold" style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
                                        {climate.temperature}°C
                                    </span>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Temperature</div>
                            </div>
                            <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
                            <div className="text-center">
                                <div className="d-flex align-items-center gap-1 justify-content-center">
                                    <FiThermometer style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
                                    <span className="fw-bold" style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
                                        {climate.feels_like}°C
                                    </span>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Feels Like</div>
                            </div>
                            <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
                            <div className="text-center">
                                <div className="d-flex align-items-center gap-1 justify-content-center">
                                    <FiDroplet style={{ color: '#06b6d4', fontSize: '0.9rem' }} />
                                    <span className="fw-bold" style={{ fontSize: '1.2rem', color: 'var(--text)' }}>
                                        {climate.humidity}%
                                    </span>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Humidity</div>
                            </div>
                            <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
                            <div className="text-center">
                                <span className="badge" style={{
                                    background: climate.source === 'api' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: climate.source === 'api' ? '#10b981' : '#f59e0b',
                                    fontSize: '0.6rem',
                                    fontWeight: 700
                                }}>
                                    {climate.source === 'api' ? '● LIVE' : '◉ ESTIMATED'}
                                </span>
                                <div className="text-muted mt-1" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{climate.city}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Status Bar - NAVIGATION TO INTELLIGENCE PROFILE */}
            <div className="d-flex align-items-center justify-content-between p-3 rounded-4 mb-5 border" style={{ background: 'var(--bg-elevated)', borderStyle: 'dashed !important' }}>
                <div className="d-flex align-items-center gap-3">
                    <div className="icon-box-sm bg-primary bg-opacity-10 text-primary">
                        <FiActivity size={18} />
                    </div>
                    <div>
                        <div className="fw-bold small" style={{ color: 'var(--text)' }}>Looking for AI Health?</div>
                        <div className="extra-small text-muted">Deep technical metrics and accuracy history have moved to the Intelligence Profile.</div>
                    </div>
                </div>
                <NavLink to="/model-status" className="btn btn-sm btn-link text-primary fw-bold text-decoration-none d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                    OPEN PROFILE <FiArrowUpRight size={14} />
                </NavLink>
            </div>

            {/* Results Summary */}
            {hasRun && (
                <div className="row g-3 mb-5 fade-in">
                    {[
                        { label: 'Classes Analyzed', val: stats.total, icon: <FiActivity />, color: '#00f59b' },
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
                                    <h4 className="fw-bold mb-0" style={{ color: 'var(--text)' }}>{s.val}</h4>
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
                    {predictions.map((p, i) => {
                        const energyStyle = getEnergyModeStyle(p.energy_mode);
                        return (
                            <div className="col-md-6 col-lg-4" key={i}>
                                <div className="card h-100 fade-in-delay" style={{ animationDelay: `${i * 0.05}s` }}>
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

                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h5 className="fw-bold mb-1" style={{ color: 'var(--text)' }}>{p.classroom}</h5>
                                            <p className="text-secondary small fw-medium m-0">{p.subject}</p>
                                        </div>
                                        <div className="d-flex flex-column align-items-end gap-1">
                                            <span className="badge fw-bold" style={{
                                                background: `${getOccupancyColor(p.occupancy)}20`,
                                                color: getOccupancyColor(p.occupancy)
                                            }}>
                                                {p.occupancy}
                                            </span>
                                            {p.energy_mode && (
                                                <span className="badge" style={{
                                                    background: energyStyle.bg,
                                                    color: energyStyle.color,
                                                    fontSize: '0.55rem',
                                                    fontWeight: 800,
                                                    letterSpacing: '0.08em',
                                                    border: `1px solid ${energyStyle.border}`
                                                }}>
                                                    {energyStyle.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <div className="p-2 rounded-2" style={{ background: 'var(--bg-elevated)' }}>
                                                <div className="text-secondary opacity-75 fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>TIME</div>
                                                <div className="fw-bold mt-1" style={{ color: 'var(--text)' }}>{p.time}</div>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="p-2 rounded-2" style={{ background: 'var(--bg-elevated)' }}>
                                                <div className="text-secondary opacity-75 fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>ATTENDANCE</div>
                                                <div className="fw-bold text-primary mt-1">{p.attendance}%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3-Device Smart Recommendation Panel */}
                                    <div className="p-3 rounded-3" style={{ background: 'rgba(124, 58, 237, 0.04)', border: '1px solid rgba(124, 58, 237, 0.08)' }}>
                                        <div className="text-secondary small fw-bold mb-2 pb-1 border-bottom border-white border-opacity-10" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                            Climate-Aware Recommendation
                                        </div>
                                        <div className="d-flex justify-content-between mb-3">
                                            {/* Lights */}
                                            <div className="text-center" style={{ flex: 1 }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: `${getDeviceColor(p.lights_action || 'OFF')}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 6px',
                                                    opacity: getDeviceOpacity(p.lights_action || 'OFF')
                                                }}>
                                                    <FiSun style={{ color: getDeviceColor(p.lights_action || 'OFF'), fontSize: '1rem' }} />
                                                </div>
                                                <div className="fw-bold" style={{ fontSize: '0.65rem', color: getDeviceColor(p.lights_action || 'OFF'), opacity: getDeviceOpacity(p.lights_action || 'OFF') }}>
                                                    {p.lights_action || 'OFF'}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.55rem' }}>Lights</div>
                                            </div>

                                            {/* AC */}
                                            <div className="text-center" style={{ flex: 1 }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: `${getDeviceColor(p.ac_action || 'OFF')}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 6px',
                                                    opacity: getDeviceOpacity(p.ac_action || 'OFF')
                                                }}>
                                                    <FiWind style={{ color: getDeviceColor(p.ac_action || 'OFF'), fontSize: '1rem' }} />
                                                </div>
                                                <div className="fw-bold" style={{ fontSize: '0.65rem', color: getDeviceColor(p.ac_action || 'OFF'), opacity: getDeviceOpacity(p.ac_action || 'OFF') }}>
                                                    {p.ac_action || 'OFF'}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.55rem' }}>AC</div>
                                            </div>

                                            {/* Fan */}
                                            <div className="text-center" style={{ flex: 1 }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '10px',
                                                    background: `${getDeviceColor(p.fan_action || 'OFF')}15`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto 6px',
                                                    opacity: getDeviceOpacity(p.fan_action || 'OFF')
                                                }}>
                                                    <FiActivity style={{ color: getDeviceColor(p.fan_action || 'OFF'), fontSize: '1rem' }} />
                                                </div>
                                                <div className="fw-bold" style={{ fontSize: '0.65rem', color: getDeviceColor(p.fan_action || 'OFF'), opacity: getDeviceOpacity(p.fan_action || 'OFF') }}>
                                                    {p.fan_action || 'OFF'}
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '0.55rem' }}>Fan</div>
                                            </div>
                                        </div>

                                        {/* Climate Reasoning */}
                                        {p.climate_reasoning && (
                                            <div className="p-2 rounded-2 mt-1" style={{ background: 'var(--bg-elevated)', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                                <FiThermometer style={{ marginRight: '6px', color: climate?.climate_mode_color || '#f59e0b', fontSize: '0.75rem' }} />
                                                {p.climate_reasoning}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card text-center py-5">
                    <div style={{
                        width: '80px',
                        height: '80px',
                        margin: '0 auto 1.5rem',
                        borderRadius: '24px',
                        background: 'rgba(0, 245, 155, 0.05)',
                        border: '1px solid rgba(0, 245, 155, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FiCpu style={{ fontSize: '2rem', color: 'var(--primary)', opacity: 0.6 }} />
                    </div>
                    <h5 className="fw-bold mb-2">No Predictions Yet</h5>
                    <p className="text-muted mb-4">Click "Run Analysis" to generate AI predictions with climate-aware energy optimization</p>
                    <button className="btn btn-lg btn-gradient mx-auto" onClick={runPredictions} disabled={loading}>
                        {loading ? <DynamicLoader size={20} color="var(--bg-deep)" /> : <><FiPlay className="me-2" /> Run Analysis</>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default Predictions;
