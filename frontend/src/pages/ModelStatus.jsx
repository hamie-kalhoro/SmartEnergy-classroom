import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiActivity, FiZap, FiCpu, FiTrendingUp, FiDatabase, FiAward, FiInfo, FiAlertTriangle, FiRefreshCcw, FiCheckCircle } from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';

const ModelStatus = () => {
    const [maturity, setMaturity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMaturity = async () => {
            try {
                const res = await api.get('/api/ml/intelligence-pulse');
                setMaturity(res.data);
            } catch (err) {
                console.error("Maturity Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMaturity();
    }, []);

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ height: '70vh' }}>
            <DynamicLoader size={40} color="var(--primary)" />
            <p className="mt-3 text-muted">Synchronizing with Intelligence Core...</p>
        </div>
    );

    if (!maturity) return <div className="p-5 text-center">Failed to load intelligence profile.</div>;

    const getLevelDescription = (level) => {
        const descriptions = {
            'Observant Seedling': 'Basic understanding of campus patterns. Relies heavily on synthetic baseline data.',
            'Knowledge Gatherer': 'Started absorbing real-world attendance. Recognizing daily occupancy fluctuations.',
            'Pattern Engine': 'Understands the relationship between Subject Types and energy needs. High reliability.',
            'Strategic Analyst': 'Can predict edge cases like rainy days or late-night occupancy with high precision.',
            'Intelligence Core': 'Maximum mastery. System is fully autonomous and perfectly optimized for this campus.'
        };
        return descriptions[level] || 'Continuously evolving neural patterns...';
    };

    return (
        <div className="fade-in px-2" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-start mb-5">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge" style={{ background: 'rgba(0, 210, 106, 0.1)', color: 'var(--primary)', fontSize: '0.75rem' }}>
                            <FiActivity className="me-1" /> CORE DIAGNOSTICS
                        </span>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Intelligence <span className="text-secondary-glow">Profile</span>
                    </h2>
                    <p className="text-muted small m-0">Technical transparency and predictive health metrics</p>
                </div>
                <div className="text-end">
                    <div className="text-muted small fw-bold mb-1">KNOWLEDGE XP</div>
                    <div className="h4 fw-bold text-gradient m-0">{(maturity.total_hours * 10).toLocaleString()} PTS</div>
                </div>
            </div>

            <div className="row g-4 mb-5">
                {/* 🌌 OUT OF THE BOX: 3D Intelligence Core Visualization */}
                <div className="col-lg-6">
                    <div className="card h-100 p-0 border-0 shadow-lg overflow-hidden" 
                         style={{ 
                             background: 'linear-gradient(135deg, rgba(20,20,30,0.4) 0%, rgba(10,10,15,0.6) 100%)',
                             backdropFilter: 'blur(20px)',
                             minHeight: '400px'
                         }}>
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 p-5 position-relative">
                            
                            {/* The Orb Decorations */}
                            <div className="orb-ring-large" />
                            <div className="orb-ring-medium" />
                            
                            {/* The Core Orb */}
                            <div className="intelligence-core-orb">
                                <div className="orb-inner-glow" />
                                <div className="orb-surface-patterns" />
                            </div>

                            {/* Core Label */}
                            <div className="mt-5 text-center z-index-1">
                                <h3 className="fw-bold text-white mb-2">{maturity.evolution_level}</h3>
                                <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-white bg-opacity-5 border border-white border-opacity-10 mx-auto w-fit">
                                    <div className="pulse-dot" style={{ width: '8px', height: '8px' }}></div>
                                    <span className="extra-small fw-bold text-uppercase" style={{ color: 'var(--primary-light)', letterSpacing: '0.1em' }}>Neural Core Active</span>
                                </div>
                            </div>

                            {/* Descriptions */}
                            <p className="text-center text-muted small mt-4 mb-0 px-4" style={{ lineHeight: '1.6' }}>
                                {getLevelDescription(maturity.evolution_level)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Technical Breakdown */}
                <div className="col-lg-6">
                    <div className="row g-3 h-100">
                        {/* Accuracy Card */}
                        <div className="col-12">
                            <div className="card p-4 h-100">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="icon-box-sm bg-primary bg-opacity-10 text-primary">
                                            <FiTrendingUp />
                                        </div>
                                        <div>
                                            <div className="text-muted extra-small fw-bold text-uppercase">Predictive Accuracy</div>
                                            <div className="h3 fw-bold m-0" style={{ color: 'var(--text)' }}>{maturity.accuracy}%</div>
                                        </div>
                                    </div>
                                    {maturity.delta !== 0 && (
                                        <div className={`badge ${maturity.delta > 0 ? 'bg-success' : 'bg-danger'} bg-opacity-10 border border-${maturity.delta > 0 ? 'success' : 'danger'} border-opacity-20 ${maturity.delta > 0 ? 'text-success' : 'text-danger'}`}>
                                            {maturity.delta > 0 ? '↑' : '↓'}{Math.abs(maturity.delta)}% Gain
                                        </div>
                                    )}
                                </div>
                                
                                {/* Learning Curve Chart */}
                                <div className="w-100" style={{ height: '100px' }}>
                                    {maturity.history?.length > 1 ? (
                                        <div className="d-flex align-items-end h-100 gap-1 pb-2 border-bottom border-white border-opacity-5">
                                            {maturity.history.map((h, i) => (
                                                <div key={i} className="flex-grow-1 transition-all rounded-top"
                                                    style={{ 
                                                        height: `${(h.accuracy / 100) * 80}px`,
                                                        background: h.status === 'warning' ? '#ef4444' : 'var(--primary)',
                                                        opacity: idxToOpacity(i, maturity.history.length),
                                                        cursor: 'help'
                                                    }}
                                                    title={`Cycle ${i+1}: ${h.accuracy}%`}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-100 d-flex align-items-center justify-content-center text-muted small italic opacity-50">
                                            Accumulating visual history...
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between mt-2">
                                        <span className="extra-small text-muted fw-bold">START</span>
                                        <span className="extra-small text-muted fw-bold">NOW</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Experience Card */}
                        <div className="col-md-6">
                            <div className="card p-4 h-100">
                                <div className="icon-box-sm bg-info bg-opacity-10 text-info mb-3">
                                    <FiDatabase />
                                </div>
                                <div className="text-muted extra-small fw-bold text-uppercase">Data Hours Learned</div>
                                <div className="h4 fw-bold m-0" style={{ color: 'var(--text)' }}>{maturity.total_hours.toLocaleString()}</div>
                                <p className="extra-small text-muted mt-2 mb-0">Total unique academic hours processed into history.</p>
                            </div>
                        </div>

                        {/* Coverage Card */}
                        <div className="col-md-6">
                            <div className="card p-4 h-100">
                                <div className="icon-box-sm bg-warning bg-opacity-10 text-warning mb-3">
                                    <FiAward />
                                </div>
                                <div className="text-muted extra-small fw-bold text-uppercase">Scenario Mastery</div>
                                <div className="h4 fw-bold m-0" style={{ color: 'var(--text)' }}>{maturity.coverage_pct}%</div>
                                <div className="progress mt-3" style={{ height: '4px', background: 'var(--bg-elevated)' }}>
                                    <div className="progress-bar bg-warning" style={{ width: `${maturity.coverage_pct}%`, boxShadow: '0 0 10px #f59e0b' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Insights & Definitions */}
            <div className="row g-4 mb-5">
                <div className="col-lg-8">
                    <div className="card p-4 border-0" style={{ background: 'var(--bg-elevated)' }}>
                        <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <FiCpu className="text-primary" /> Intelligence Insights Engine
                        </h6>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <FiCheckCircle className="text-success" size={14} />
                                        <span className="small fw-bold" style={{ color: 'var(--text)' }}>Stability Index</span>
                                    </div>
                                    <p className="extra-small text-muted m-0">The model shows high consistency on weekdays. Predictability for Lab rooms is 15% higher than classrooms.</p>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5">
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <FiRefreshCcw className="text-primary" size={14} />
                                        <span className="small fw-bold" style={{ color: 'var(--text)' }}>Self-Learning Goal</span>
                                    </div>
                                    <p className="extra-small text-muted m-0">AI identifies a data gap for Friday morning sessions (8AM-10AM). Uploading more data for this slot will boost accuracy.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card p-4" style={{ border: '1px solid rgba(124, 58, 237, 0.2)', background: 'linear-gradient(to bottom, transparent, rgba(124,58,237,0.03))' }}>
                        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <FiAlertTriangle className="text-warning" /> Security & Guardrails
                        </h6>
                        <p className="extra-small text-muted mb-4">
                            Operational guardrails prevent the AI from making erratic energy decisions if accuracy drops below 85% or if data noise is detected.
                        </p>
                        <button className="btn btn-outline-danger w-100 py-3 d-flex align-items-center justify-content-center gap-2" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                            <FiRefreshCcw size={14} /> EMERGENCY MODEL ROLLBACK
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom Styles for Orb and Theme Variables */}
            <style dangerouslySetInnerHTML={{ __html: `
                .text-secondary-glow { color: var(--primary); text-shadow: 0 0 20px rgba(0, 210, 106, 0.3); }
                
                .w-fit { width: fit-content; }
                .z-index-1 { z-index: 1; }
                
                /* Out-of-the-Box Orb Animations */
                .intelligence-core-orb {
                    width: 140px;
                    height: 140px;
                    background: radial-gradient(circle at 30% 30%, var(--primary-light), var(--primary));
                    border-radius: 50%;
                    position: relative;
                    box-shadow: 0 0 60px rgba(0, 210, 106, 0.4), inset -10px -10px 40px rgba(0,0,0,0.5);
                    animation: orbFloat 6s ease-in-out infinite;
                }

                .orb-inner-glow {
                    position: absolute;
                    inset: 5px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: inset 0 0 20px var(--primary-light);
                    animation: orbRotate 12s linear infinite;
                }

                .orb-surface-patterns {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.1) 49%, rgba(255,255,255,0.1) 51%, transparent 52%),
                        linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.1) 49%, rgba(255,255,255,0.1) 51%, transparent 52%);
                    background-size: 20px 20px;
                    border-radius: 50%;
                    opacity: 0.5;
                    animation: orbRotate -15s linear infinite;
                }

                .orb-ring-large {
                    position: absolute;
                    width: 240px;
                    height: 240px;
                    border: 1px dashed rgba(0, 210, 106, 0.15);
                    border-radius: 50%;
                    animation: orbRotate 20s linear infinite;
                }

                .orb-ring-medium {
                    position: absolute;
                    width: 190px;
                    height: 190px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    border-radius: 50%;
                    animation: orbRotate -15s linear infinite;
                }

                @keyframes orbFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }

                @keyframes orbRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .transition-all { transition: all 0.3s ease; }
                .hover-bg-elevated:hover { background: var(--bg-elevated); }
                
                [data-theme='light'] .bg-surface { background: #ffffff; }
                [data-theme='light'] .card { background: #ffffff; border-color: #f1f5f9; }
                [data-theme='light'] .bg-surface.border { border-color: #f1f5f9 !important; }
            `}} />
        </div>
    );
};

// Helper for chart opacity
const idxToOpacity = (idx, total) => {
    return 0.3 + (idx / total) * 0.7;
};

export default ModelStatus;
