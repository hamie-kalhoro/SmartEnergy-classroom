import React, { useState } from 'react';
import api from '../api';
import { FiUpload, FiDatabase, FiCpu, FiCheckCircle, FiAlertCircle, FiBarChart2, FiActivity } from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';

function MLDataset() {
    const [mode, setMode] = useState('train'); // 'train' or 'predict'
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const endpoint = mode === 'train' ? '/api/ml/upload-train' : '/api/ml/predict-batch';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Processing failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="mb-5">
                <h2 className="fw-bold tracking-tight">ML Dataset Laboratory</h2>
                <p className="text-muted small m-0">Upload datasets to train or run batch predictions</p>
            </div>

            <div className="row g-4">
                <div className="col-lg-4">
                    <div className="card h-100 border-0 shadow-sm">
                        <h6 className="fw-bold text-muted text-uppercase mb-4" style={{ fontSize: '0.75rem' }}>
                            <FiCpu className="me-2" /> Operation Mode
                        </h6>

                        <div className="d-flex flex-column gap-2 mb-4">
                            {[
                                { 
                                    key: 'train', 
                                    icon: (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <defs>
                                                <linearGradient id="trainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#00f59b" />
                                                    <stop offset="100%" stopColor="#06b6d4" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M12 2C6.48 2 2 4.24 2 7V17C2 19.76 6.48 22 12 22C17.52 22 22 19.76 22 17V7C22 4.24 17.52 2 12 2Z" fill="url(#trainGrad)" fillOpacity="0.2" stroke="url(#trainGrad)" strokeWidth="2" />
                                            <ellipse cx="12" cy="7" rx="10" ry="5" stroke="url(#trainGrad)" strokeWidth="2" fill="url(#trainGrad)" fillOpacity="0.1" />
                                            <path d="M22 12C22 14.76 17.52 17 12 17C6.48 17 2 14.76 2 12" stroke="url(#trainGrad)" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    ), 
                                    label: 'Train Model', 
                                    desc: 'Build AI intelligence patterns' 
                                },
                                { 
                                    key: 'predict', 
                                    icon: (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <defs>
                                                <linearGradient id="predictGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#7c3aed" />
                                                    <stop offset="100%" stopColor="#ec4899" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M22 12H18L15 21L9 3L6 12H2" stroke="url(#predictGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <circle cx="12" cy="12" r="9" stroke="url(#predictGrad)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                                        </svg>
                                    ), 
                                    label: 'Batch Predict', 
                                    desc: 'Run forecasting on datasets' 
                                }
                            ].map(m => (
                                <div
                                    key={m.key}
                                    className={`p-3 border rounded-4 cursor-pointer transition-all ${mode === m.key ? 'bg-primary border-primary shadow-lg' : 'bg-surface hover-bg-elevated'}`}
                                    onClick={() => { setMode(m.key); setResult(null); setError(''); }}
                                    style={{ 
                                        transform: mode === m.key ? 'translateY(-3px)' : 'none',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        borderWidth: '2px !important'
                                    }}
                                >
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`icon-box ${mode === m.key ? 'bg-white bg-opacity-20' : 'bg-secondary bg-opacity-5'}`}>
                                            {m.icon}
                                        </div>
                                        <div>
                                            <div className={`fw-bold ${mode === m.key ? 'text-white' : ''}`} style={{ color: mode === m.key ? '#ffffff' : 'var(--text)' }}>
                                                {m.label}
                                            </div>
                                            <div className={`small ${mode === m.key ? 'text-white text-opacity-80' : 'text-muted'}`}>
                                                {m.desc}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label className="form-label small fw-bold text-muted">Dataset File (CSV)</label>
                            <input
                                type="file"
                                className="form-control mb-3"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <small className="text-muted d-block mb-4">
                                Required columns: <code>day, hour, type, attendance</code>
                            </small>
                            <button type="submit" className="btn btn-lg btn-primary w-100" disabled={!file || loading}>
                                {loading ? (
                                    <DynamicLoader size={20} color="var(--bg-deep)" className="me-2" />
                                ) : (
                                    <FiUpload className="me-2" />
                                )}
                                {loading ? 'Processing...' : (mode === 'train' ? 'Upload & Train' : 'Upload & Predict')}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="col-lg-8">
                    {error && (
                        <div className="alert bg-danger bg-opacity-10 text-danger border-0 d-flex align-items-center gap-3">
                            <FiAlertCircle className="h4 mb-0" /> {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="card border-0 shadow-sm skeleton" style={{ minHeight: '500px' }}>
                            {/* Inner structure for skeleton mockup if needed, but the base card skeleton handles it */}
                        </div>
                    ) : result ? (
                        <>
                            {mode === 'train' && (
                                <div className="card border-0 shadow-sm">
                                    <div className="d-flex align-items-center gap-3 mb-4">
                                        <FiCheckCircle className="text-success h3 mb-0" />
                                        <div>
                                            <h5 className="fw-bold mb-0" style={{ color: 'var(--text)' }}>Training Complete</h5>
                                            <small className="text-secondary fw-medium">Model behavioral patterns updated successfully</small>
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-4">
                                        {[
                                            { label: 'Knowledge Base', val: result?.report?.total_records || 0, icon: <FiDatabase size={14} /> },
                                            { label: 'Accuracy', val: `${result?.report?.accuracy || 0}%`, color: result?.report?.status === 'warning' ? 'danger' : 'success' },
                                            { label: 'Precision', val: `${result?.report?.precision || 0}%`, color: 'primary' },
                                            { label: 'Recall', val: `${result?.report?.recall || 0}%`, color: 'warning' },
                                            { label: 'F1 Score', val: `${result?.report?.f1_score || 0}%`, color: 'info' }
                                        ].map((s, i) => (
                                            <div className="col-md" key={i}>
                                                <div className={`p-3 rounded-4 h-100 ${s.color ? `bg-${s.color} bg-opacity-10 border border-${s.color} border-opacity-10` : 'bg-surface border'}`}>
                                                    <div className={`h5 fw-bold mb-1 ${s.color ? `text-${s.color}` : 'var(--text)'}`}>{s.val}</div>
                                                    <small className="text-secondary fw-medium d-flex align-items-center gap-1">
                                                        {s.icon} {s.label}
                                                    </small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Insight Section */}
                                    <div className={`p-3 rounded-4 mb-4 border ${result?.report?.status === 'warning' ? 'border-danger bg-danger bg-opacity-5' : 'border-success bg-success bg-opacity-5'}`}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 className={`fw-bold small mb-1 ${result?.report?.status === 'warning' ? 'text-danger' : 'text-success'}`}>
                                                    {result?.report?.status === 'warning' ? 'Stability Alert' : 'Intelligence Expanded'}
                                                </h6>
                                                <p className="extra-small text-muted m-0">{result?.report?.analysis}</p>
                                            </div>
                                            {result?.report?.status === 'warning' && (
                                                <button className="btn btn-sm btn-danger px-3 py-1 fw-bold" style={{ fontSize: '0.65rem' }}>ROLLBACK</button>
                                            )}
                                        </div>
                                    </div>

                                    <h6 className="fw-bold text-muted small mb-3">Feature Importance Mapping</h6>
                                    <div className="row g-2">
                                        {Object.entries(result?.report?.feature_importance || {}).map(([key, val]) => (
                                            <div className="col-md-6" key={key}>
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-capitalize small fw-bold text-secondary">{key.replace('_', ' ')}</span>
                                                        <span className="extra-small opacity-50" title={key} style={{ color: 'var(--text)' }}>
                                                            {key === 'attendance' ? '(Count)' : key === 'type' ? '(Lab/Lec)' : key === 'hour' ? '(Time)' : '(Context)'}
                                                        </span>
                                                    </div>
                                                    <span className="small fw-bold text-primary">{Math.round((val || 0) * 100)}%</span>
                                                </div>
                                                <div className="progress" style={{ height: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                                    <div className="progress-bar bg-primary" style={{ width: `${(val || 0) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                                        <h6 className="fw-bold small mb-2"><FiAlertCircle className="me-2" /> Understanding Importance</h6>
                                        <p className="extra-small text-muted m-0 lh-sm"> 
                                            <strong>Attendance:</strong> Direct driver of occupancy levels. <br/>
                                            <strong>Why are some 0%?</strong> Features like "Is Weekend" or "Time Bin" are currently redundant because the model already learned these patterns from the raw "Day" and "Hour" data.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {mode === 'predict' && (
                                <div className="card border-0 shadow-sm">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <div className="d-flex align-items-center gap-3">
                                            <FiBarChart2 className="text-primary h3 mb-0" />
                                            <div>
                                                <h5 className="fw-bold mb-0">Batch Prediction Results</h5>
                                                <small className="text-muted">{result.summary.total_records} records processed</small>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row g-2 mb-4">
                                         {[
                                             { label: 'Empty', val: result.summary.empty_count, color: 'danger' },
                                             { label: 'Trace', val: result.summary.trace_count, color: 'warning' },
                                             { label: 'Light', val: result.summary.light_count, color: 'info' },
                                             { label: 'Balanced', val: result.summary.balanced_count, color: 'primary' },
                                             { label: 'Maximum', val: result.summary.maximum_count, color: 'success' }
                                         ].map((s, i) => (
                                             <div className="col" key={i}>
                                                 <div className={`p-2 rounded-3 bg-${s.color} bg-opacity-10 text-center border border-${s.color} border-opacity-10`}>
                                                     <div className={`h6 fw-bold mb-0 text-${s.color}`}>{s.val}</div>
                                                     <div className="extra-small text-secondary fw-medium" style={{ fontSize: '0.6rem' }}>{s.label}</div>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>

                                     <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                         <table className="table">
                                             <thead>
                                                 <tr>
                                                     <th>Day</th>
                                                     <th>Hour</th>
                                                     <th>Type</th>
                                                     <th>Attendance</th>
                                                     <th>Prediction</th>
                                                     <th>Recommendation</th>
                                                 </tr>
                                             </thead>
                                             <tbody>
                                                 {result.predictions.slice(0, 50).map((p, i) => {
                                                     const getBadgeColor = (lvl) => {
                                                         if (lvl === 'Maximum') return 'success';
                                                         if (lvl === 'Balanced') return 'primary';
                                                         if (lvl === 'Light') return 'info';
                                                         if (lvl === 'Trace') return 'warning';
                                                         return 'danger';
                                                     };
                                                     const color = getBadgeColor(p.predicted_occupancy);
                                                     return (
                                                         <tr key={i}>
                                                             <td className="fw-bold py-3 text-white">{p.day}</td>
                                                             <td className="py-3">{p.hour}</td>
                                                             <td className="text-capitalize py-3">{p.type || 'N/A'}</td>
                                                             <td className="fw-bold text-primary py-3">{p.attendance !== undefined ? `${p.attendance}%` : '--'}</td>
                                                             <td className="py-3">
                                                                 <span className={`badge bg-${color} bg-opacity-10 text-${color}`}>
                                                                     {p.predicted_occupancy}
                                                                 </span>
                                                             </td>
                                                             <td className="small text-secondary py-3">{p.recommendation}</td>
                                                         </tr>
                                                     );
                                                 })}
                                             </tbody>
                                         </table>
                                     </div>
                                    {result.predictions.length > 50 && (
                                        <p className="text-muted small text-center mt-3">Showing first 50 of {result.predictions.length} results</p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="card border-0 shadow-sm d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                            <div className="text-center text-muted">
                                <FiDatabase className="h1 mb-3 opacity-25" />
                                <p>Select a mode and upload a CSV to begin</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MLDataset;
