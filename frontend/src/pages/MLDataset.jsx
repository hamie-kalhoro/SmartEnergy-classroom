import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import {
    FiUpload, FiDatabase, FiCpu, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiActivity, FiFileText, FiX,
    FiDownload, FiCheck, FiTarget, FiLayers, FiChevronLeft, FiChevronRight, FiZap, FiTrendingUp
} from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';
import { BaselineBars, FeatureBars, ConfusionMatrix } from '../components/ModelCharts';

const REQUIRED = ['day', 'hour', 'type', 'attendance'];
const OPTIONAL = ['semester', 'week', 'batch', 'section', 'subject'];
const LEVELS = [
    { key: 'Empty', color: '#ef4444' },
    { key: 'Trace', color: '#f97316' },
    { key: 'Light', color: '#f59e0b' },
    { key: 'Balanced', color: '#06b6d4' },
    { key: 'Maximum', color: '#10b981' }
];
const LEVEL_COLOR = Object.fromEntries(LEVELS.map(l => [l.key, l.color]));
const MODES = {
    train: {
        label: 'Train model',
        desc: 'Add attendance history and retrain the occupancy model',
        icon: FiDatabase,
        action: 'Upload & train',
        howTitle: 'How training works',
        steps: ['Rows are appended to the attendance history', 'The model retrains on all history in date order', 'It is tested on the most recent weeks it never saw']
    },
    predict: {
        label: 'Batch predict',
        desc: 'Forecast occupancy and device settings for a CSV of classes',
        icon: FiActivity,
        action: 'Upload & predict',
        howTitle: 'How batch prediction works',
        steps: ['Each row is scored by the current model', 'Live Jamshoro weather sets the device rules', 'Results can be filtered and exported as CSV']
    }
};
const TEMPLATE = 'semester,week,day,hour,batch,section,subject,type,attendance\n'
    + 'Fall-2026,3,Monday,8,3,I,Operating Systems,theory,41\n'
    + 'Fall-2026,3,Monday,10,3,I,Operating Systems Lab,lab,44\n'
    + 'Fall-2026,3,Tuesday,9,1,II,Programming Fundamentals,theory,39\n';
const PAGE_SIZE = 25;

const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

/** Read the header row and count data rows without uploading. */
function inspectCsv(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const lines = String(reader.result).split(/\r?\n/).filter(l => l.trim());
            const columns = (lines[0] || '').split(',').map(c => c.trim().replace(/^"|"$/g, '').toLowerCase()).filter(Boolean);
            resolve({ columns, rows: Math.max(lines.length - 1, 0) });
        };
        reader.onerror = () => resolve({ columns: [], rows: 0 });
        reader.readAsText(file);
    });
}

function MetricTile({ label, value, hint, tone }) {
    return (
        <div className={`ml-metric ${tone ? `tone-${tone}` : ''}`}>
            <small>{label}</small>
            <strong>{value}</strong>
            {hint && <span>{hint}</span>}
        </div>
    );
}

function MLDataset() {
    const [mode, setMode] = useState('train');
    const [file, setFile] = useState(null);
    const [fileInfo, setFileInfo] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(null);
    const [levelFilter, setLevelFilter] = useState('all');
    const [page, setPage] = useState(0);
    const inputRef = useRef(null);

    const loadProfile = () => api.get('/api/ml/intelligence-pulse').then(res => setProfile(res.data)).catch(() => {});
    useEffect(() => { loadProfile(); }, []);

    const latest = profile?.history?.length ? profile.history[profile.history.length - 1] : null;
    const missing = fileInfo ? REQUIRED.filter(c => !fileInfo.columns.includes(c)) : REQUIRED;

    const pickFile = async (f) => {
        if (!f) return;
        setError('');
        setResult(null);
        if (!f.name.toLowerCase().endsWith('.csv')) {
            setFile(null);
            setFileInfo(null);
            setError('Only .csv files are supported.');
            return;
        }
        setFile(f);
        setFileInfo(await inspectCsv(f));
    };

    const clearFile = () => {
        setFile(null);
        setFileInfo(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const switchMode = (key) => {
        setMode(key);
        setResult(null);
        setError('');
    };

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
            const res = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult({ ...res.data, mode });
            setLevelFilter('all');
            setPage(0);
            if (mode === 'train') loadProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Processing failed. Check the file and try again.');
        } finally {
            setLoading(false);
        }
    };

    const predictions = result?.mode === 'predict' ? result.predictions || [] : [];
    const filtered = useMemo(() => (
        levelFilter === 'all' ? predictions : predictions.filter(p => p.predicted_occupancy === levelFilter)
    ), [predictions, levelFilter]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const exportPredictions = () => {
        const cols = ['day', 'hour', 'type', 'attendance', 'predicted_occupancy', 'confidence', 'lights_action', 'fan_action', 'ac_action', 'energy_mode', 'recommendation'];
        const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        downloadText('batch_predictions.csv', [cols.join(','), ...predictions.map(p => cols.map(c => esc(p[c])).join(','))].join('\n'));
    };

    const report = result?.mode === 'train' ? result.report || {} : null;
    const ModeIcon = MODES[mode].icon;

    return (
        <div className="fade-in ml-page">
            <div className="dash-header">
                <div>
                    <span className="rooms-eyebrow">Model training · batch inference</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        ML Dataset <span className="text-gradient">Laboratory</span>
                    </h2>
                    <p className="text-muted small m-0">Retrain the occupancy model with new attendance data, or score a dataset in bulk.</p>
                </div>
                {profile && (
                    <div className="dash-chips">
                        <span className="dash-chip"><FiCpu /> {profile.evolution_level}</span>
                        <span className="dash-chip"><FiTarget /> {(profile.accuracy || 0).toFixed(1)}% accuracy</span>
                        <span className="dash-chip"><FiDatabase /> {(profile.total_hours || 0).toLocaleString()} records</span>
                    </div>
                )}
            </div>

            <div className="ml-layout">
                {/* Left: mode + upload */}
                <aside className="ml-panel">
                    <span className="ml-section-title">1 · Choose an operation</span>
                    <div className="ml-modes" role="radiogroup" aria-label="Operation mode">
                        {Object.entries(MODES).map(([key, m]) => {
                            const Icon = m.icon;
                            return (
                                <button key={key} type="button" role="radio" aria-checked={mode === key} className={`ml-mode ${mode === key ? 'active' : ''}`} onClick={() => switchMode(key)}>
                                    <span className="ml-mode-icon"><Icon /></span>
                                    <span className="ml-mode-text">
                                        <strong>{m.label}</strong>
                                        <small>{m.desc}</small>
                                    </span>
                                    <span className="ml-radio" />
                                </button>
                            );
                        })}
                    </div>

                    <span className="ml-section-title">2 · Upload a dataset</span>
                    <form onSubmit={handleSubmit}>
                        {!file ? (
                            <label
                                className={`ml-drop ${dragging ? 'dragging' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); }}
                            >
                                <input ref={inputRef} type="file" accept=".csv" onChange={e => pickFile(e.target.files[0])} />
                                <span className="ml-drop-icon"><FiUpload /></span>
                                <strong>Drop a CSV here or <u>browse</u></strong>
                                <small>Comma-separated, first row as column names</small>
                            </label>
                        ) : (
                            <div className="ml-file">
                                <span className="ml-file-icon"><FiFileText /></span>
                                <div className="ml-file-text">
                                    <strong title={file.name}>{file.name}</strong>
                                    <small>{fileInfo ? `${fileInfo.rows.toLocaleString()} rows · ${fileInfo.columns.length} columns · ` : ''}{formatBytes(file.size)}</small>
                                </div>
                                <button type="button" onClick={clearFile} aria-label="Remove file" title="Remove file"><FiX /></button>
                            </div>
                        )}

                        <div className="ml-schema">
                            <div className="ml-schema-head">
                                <span>Required columns</span>
                                <button type="button" onClick={() => downloadText('attendance_template.csv', TEMPLATE)}><FiDownload /> Template</button>
                            </div>
                            <div className="ml-cols">
                                {REQUIRED.map(c => {
                                    const ok = fileInfo?.columns.includes(c);
                                    return (
                                        <span key={c} className={`ml-col ${fileInfo ? (ok ? 'ok' : 'missing') : ''}`}>
                                            {fileInfo && (ok ? <FiCheck /> : <FiX />)}{c}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="ml-schema-head"><span>Optional · improves accuracy</span></div>
                            <div className="ml-cols">
                                {OPTIONAL.map(c => (
                                    <span key={c} className={`ml-col optional ${fileInfo?.columns.includes(c) ? 'ok' : ''}`}>
                                        {fileInfo?.columns.includes(c) && <FiCheck />}{c}
                                    </span>
                                ))}
                            </div>
                            <p>Rows should be in date order. <code>attendance</code> is a percentage (0–100) or a head count.</p>
                        </div>

                        {fileInfo && missing.length > 0 && (
                            <div className="tt-form-note warn"><FiAlertTriangle /> Missing required column{missing.length > 1 ? 's' : ''}: {missing.join(', ')}</div>
                        )}

                        <button type="submit" className="btn btn-lg btn-gradient w-100 mt-3" disabled={!file || loading || missing.length > 0}>
                            {loading ? <><DynamicLoader size={20} color="var(--bg-deep)" /> <span className="ms-2">Processing…</span></> : <><ModeIcon className="me-2" /> {MODES[mode].action}</>}
                        </button>
                    </form>
                </aside>

                {/* Right: results */}
                <section className="ml-main">
                    {error && <div className="tt-form-note error mb-3"><FiAlertCircle /> {error}</div>}

                    {loading ? (
                        <div className="ml-card ml-processing">
                            <DynamicLoader size={40} />
                            <h3>{mode === 'train' ? 'Training the model…' : 'Scoring the dataset…'}</h3>
                            <p>{mode === 'train' ? 'Merging history, retraining and testing on unseen recent weeks.' : 'Predicting occupancy and applying the climate rules to every row.'}</p>
                        </div>
                    ) : report ? (
                        <div className="ml-card">
                            <div className={`ml-result-head ${report.status === 'warning' ? 'warn' : ''}`}>
                                <span className="ml-result-icon">{report.status === 'warning' ? <FiAlertTriangle /> : <FiCheckCircle />}</span>
                                <div>
                                    <h3>{report.status === 'warning' ? 'Model trained, with warnings' : 'Model trained successfully'}</h3>
                                    <p>{(report.total_records || 0).toLocaleString()} records · trained on {(report.training_records || 0).toLocaleString()}, tested on {(report.test_records || 0).toLocaleString()} unseen</p>
                                </div>
                            </div>

                            <div className="ml-metrics">
                                <MetricTile label="Accuracy" value={`${report.accuracy ?? 0}%`} hint="on unseen weeks" tone={report.status === 'warning' ? 'warn' : 'good'} />
                                <MetricTile label="Precision" value={`${report.precision ?? 0}%`} />
                                <MetricTile label="Recall" value={`${report.recall ?? 0}%`} />
                                <MetricTile label="F1 score" value={`${report.f1_score ?? 0}%`} />
                                <MetricTile label="Cross-validation" value={`${report.cv_accuracy ?? 0}%`} hint={`± ${report.cv_std ?? 0}`} />
                            </div>

                            {report.analysis && (
                                <div className={`ml-callout ${report.status === 'warning' ? 'warn' : ''}`}>
                                    <FiTrendingUp />
                                    <p>{report.analysis}</p>
                                </div>
                            )}

                            <div className="ml-split">
                                <div>
                                    <h4>Against simple baselines</h4>
                                    <BaselineBars accuracy={report.accuracy} history={report.baseline_history} majority={report.baseline_majority} />
                                    <h4 className="mt-4">Confusion matrix</h4>
                                    <ConfusionMatrix cm={report.confusion_matrix} />
                                </div>
                                <div>
                                    <h4>What drives the prediction</h4>
                                    <FeatureBars importance={report.feature_importance} />
                                    <p className="ml-note">
                                        The class's own attendance is never an input: only previous weeks are used. Accuracy below 100% is expected
                                        because cancellations, holidays and day-to-day absence cannot be known before a class starts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : result?.mode === 'predict' ? (
                        <div className="ml-card">
                            <div className="ml-result-head">
                                <span className="ml-result-icon"><FiLayers /></span>
                                <div>
                                    <h3>Batch prediction complete</h3>
                                    <p>{result.summary.total_records.toLocaleString()} rows scored · {result.summary.optimized_count.toLocaleString()} below maximum occupancy{result.climate?.climate_mode_label ? ` · ${result.climate.climate_mode_label}, ${result.climate.temperature}°C` : ''}</p>
                                </div>
                                <button type="button" className="btn btn-primary-dim ms-auto" onClick={exportPredictions}><FiDownload className="me-2" /> Export CSV</button>
                            </div>

                            <div className="pred-dist-bar mb-2">
                                {LEVELS.filter(l => result.summary[`${l.key.toLowerCase()}_count`]).map(l => (
                                    <span key={l.key} style={{ flex: result.summary[`${l.key.toLowerCase()}_count`], background: l.color }} />
                                ))}
                            </div>
                            <div className="rooms-filters mb-3" role="tablist" aria-label="Filter by predicted level">
                                {['all', ...LEVELS.map(l => l.key)].map(key => (
                                    <button key={key} type="button" role="tab" aria-selected={levelFilter === key} className={levelFilter === key ? 'active' : ''} onClick={() => { setLevelFilter(key); setPage(0); }}>
                                        {key !== 'all' && <i style={{ background: LEVEL_COLOR[key] }} />}
                                        {key === 'all' ? 'All' : key}
                                        <span>{key === 'all' ? result.summary.total_records : result.summary[`${key.toLowerCase()}_count`] || 0}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="tt-grid-scroll">
                                <table className="pred-table" style={{ minWidth: 760 }}>
                                    <thead>
                                        <tr>
                                            <th>Day</th>
                                            <th className="num">Hour</th>
                                            <th>Type</th>
                                            <th className="num">Attendance</th>
                                            <th>Prediction</th>
                                            <th>Recommendation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageRows.map((p, i) => (
                                            <tr key={`${page}-${i}`}>
                                                <td className="pred-time">{p.day}</td>
                                                <td className="num">{String(p.hour).includes(':') ? p.hour : `${String(p.hour).padStart(2, '0')}:00`}</td>
                                                <td className="text-capitalize">{p.type || '—'}</td>
                                                <td className="num">{p.attendance ?? '—'}</td>
                                                <td>
                                                    <div className="pred-level" style={{ '--level': LEVEL_COLOR[p.predicted_occupancy] || '#94a3b8' }}>
                                                        <span className="pred-level-pill">{p.predicted_occupancy}</span>
                                                        <small className="text-muted">{Math.round(p.confidence || 0)}%</small>
                                                    </div>
                                                </td>
                                                <td className="ml-rec">{p.recommendation}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="ml-pager">
                                <span>{filtered.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}` : 'No rows'}</span>
                                <div>
                                    <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><FiChevronLeft /></button>
                                    <span>Page {page + 1} / {pages}</span>
                                    <button type="button" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page"><FiChevronRight /></button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="ml-card">
                                <div className="ml-card-head">
                                    <div>
                                        <h3>Current model</h3>
                                        <p>{latest?.timestamp ? `Last trained ${new Date(latest.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Random forest occupancy classifier'}</p>
                                    </div>
                                    {profile && <span className="dash-pill"><FiZap /> {profile.evolution_level}</span>}
                                </div>
                                {profile ? (
                                    <div className="ml-split">
                                        <div>
                                            <div className="ml-metrics compact">
                                                <MetricTile label="Accuracy" value={`${(profile.accuracy || 0).toFixed(1)}%`} tone="good" />
                                                <MetricTile label="Records" value={(profile.total_hours || 0).toLocaleString()} />
                                                <MetricTile label="Coverage" value={`${profile.coverage_pct || 0}%`} hint="of slots" />
                                            </div>
                                            <h4>Against simple baselines</h4>
                                            <BaselineBars accuracy={profile.accuracy} history={profile.baseline_history} majority={profile.baseline_majority} />
                                        </div>
                                        <div>
                                            <h4>Top drivers</h4>
                                            {latest?.feature_importance ? <FeatureBars importance={latest.feature_importance} limit={5} /> : <p className="ml-note">No training report yet.</p>}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="skeleton" style={{ height: 220 }} />
                                )}
                            </div>

                            <div className="ml-card ml-how">
                                <h4>{MODES[mode].howTitle}</h4>
                                <ol>
                                    {MODES[mode].steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
                                </ol>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

export default MLDataset;
