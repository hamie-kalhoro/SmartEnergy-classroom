import React, { useState } from 'react';
import axios from 'axios';
import { FiUpload, FiDatabase, FiCpu, FiCheckCircle, FiAlertCircle, FiBarChart2, FiActivity } from 'react-icons/fi';

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
            const res = await axios.post(endpoint, formData, {
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
                                { key: 'train', icon: <FiDatabase />, label: 'Train Model', desc: 'Upload data to retrain the AI' },
                                { key: 'predict', icon: <FiActivity />, label: 'Batch Predict', desc: 'Get predictions for a dataset' }
                            ].map(m => (
                                <div
                                    key={m.key}
                                    className={`p-3 border rounded-3 cursor-pointer transition-all ${mode === m.key ? 'border-primary bg-primary bg-opacity-5' : ''}`}
                                    onClick={() => { setMode(m.key); setResult(null); setError(''); }}
                                >
                                    <div className="d-flex align-items-center gap-3">
                                        <div className={`p-2 rounded-3 ${mode === m.key ? 'bg-primary text-white' : 'bg-secondary bg-opacity-10 text-muted'}`}>
                                            {m.icon}
                                        </div>
                                        <div>
                                            <div className="fw-bold small">{m.label}</div>
                                            <div className="extra-small text-muted">{m.desc}</div>
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
                            <button type="submit" className="btn btn-primary w-100 py-3" disabled={!file || loading}>
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm me-2"></span>
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

                    {result && mode === 'train' && (
                        <div className="card border-0 shadow-sm">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <FiCheckCircle className="text-success h3 mb-0" />
                                <div>
                                    <h5 className="fw-bold mb-0">Training Complete</h5>
                                    <small className="text-muted">Model updated successfully</small>
                                </div>
                            </div>

                            <div className="row g-3 mb-4">
                                {[
                                    { label: 'Total Records', val: result.report.total_records },
                                    { label: 'Train Set', val: result.report.training_records },
                                    { label: 'Test Set', val: result.report.test_records },
                                    { label: 'Accuracy', val: `${result.report.accuracy}%`, color: 'success' }
                                ].map((s, i) => (
                                    <div className="col-md-3" key={i}>
                                        <div className={`p-3 rounded-3 ${s.color ? `bg-${s.color} bg-opacity-10` : 'bg-secondary bg-opacity-5'}`}>
                                            <div className={`h5 fw-bold mb-0 ${s.color ? `text-${s.color}` : ''}`}>{s.val}</div>
                                            <small className="text-muted">{s.label}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <h6 className="fw-bold text-muted small mb-3">Feature Importance</h6>
                            <div className="row g-2">
                                {Object.entries(result.report.feature_importance).map(([key, val]) => (
                                    <div className="col-md-6" key={key}>
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="text-capitalize small">{key}</span>
                                            <span className="small fw-bold">{Math.round(val * 100)}%</span>
                                        </div>
                                        <div className="progress" style={{ height: '8px' }}>
                                            <div className="progress-bar bg-primary" style={{ width: `${val * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result && mode === 'predict' && (
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

                            <div className="row g-3 mb-4">
                                {[
                                    { label: 'Low Occupancy', val: result.summary.low_occupancy, color: 'danger' },
                                    { label: 'Medium', val: result.summary.medium_occupancy, color: 'warning' },
                                    { label: 'High', val: result.summary.high_occupancy, color: 'success' },
                                    { label: 'Optimized', val: result.summary.optimized_count, color: 'primary' }
                                ].map((s, i) => (
                                    <div className="col-md-3" key={i}>
                                        <div className={`p-3 rounded-3 bg-${s.color} bg-opacity-10 text-center`}>
                                            <div className={`h4 fw-bold mb-0 text-${s.color}`}>{s.val}</div>
                                            <small className="text-muted">{s.label}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table>
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
                                        {result.predictions.slice(0, 50).map((p, i) => (
                                            <tr key={i}>
                                                <td>{p.day}</td>
                                                <td>{p.hour}</td>
                                                <td className="text-capitalize">{p.type}</td>
                                                <td>{p.attendance}%</td>
                                                <td>
                                                    <span className={`badge bg-${p.predicted_occupancy === 'High' ? 'success' : p.predicted_occupancy === 'Medium' ? 'warning' : 'danger'} bg-opacity-10 text-${p.predicted_occupancy === 'High' ? 'success' : p.predicted_occupancy === 'Medium' ? 'warning' : 'danger'}`}>
                                                        {p.predicted_occupancy}
                                                    </span>
                                                </td>
                                                <td className="small">{p.recommendation}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {result.predictions.length > 50 && (
                                <p className="text-muted small text-center mt-3">Showing first 50 of {result.predictions.length} results</p>
                            )}
                        </div>
                    )}

                    {!result && !error && (
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
