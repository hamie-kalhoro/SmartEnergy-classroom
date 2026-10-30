import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import {
    FiUpload, FiDownload, FiPlus, FiTrash2, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiMapPin,
    FiSearch, FiCalendar, FiLayers, FiClock, FiBookOpen, FiUsers, FiCoffee
} from 'react-icons/fi';
import DynamicLoader from '../components/DynamicLoader';
import ConfirmModal from '../components/ConfirmModal';
import Portal from '../components/Portal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
const BREAKS = { 'Friday|13:00': 'Jummah break' };
const BATCHES = [1, 2, 3, 4];
const SECTIONS = ['I', 'II'];
const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: 'Final Year' };
const CLASS_TYPES = {
    theory: { label: 'Theory', color: '#34d399' },
    lab: { label: 'Lab', color: '#38bdf8' },
    seminar: { label: 'Seminar', color: '#fbbf24' }
};
const UNASSIGNED = 'unassigned';

/** "Operating Systems (Batch 3 - Section I)" -> { course, batch: 3, section: 'I' } */
function parseSubject(subject = '') {
    const batch = subject.match(/Batch\s*(\d+)/i);
    const section = subject.match(/Section\s*(II|I)\b/i);
    return {
        course: subject.replace(/\s*\((?:[^()]*Batch[^()]*)\)\s*$/i, '').trim() || subject,
        batch: batch ? Number(batch[1]) : null,
        section: section ? section[1].toUpperCase() : null
    };
}

const sectionKey = (batch, section) => (batch && section ? `${batch}-${section}` : UNASSIGNED);
const sectionName = (key) => {
    if (key === UNASSIGNED) return 'Unassigned';
    const [batch, section] = key.split('-');
    return `Batch ${batch} · Section ${section}`;
};
const toMinutes = (time) => {
    const [h, m] = String(time).split(':').map(Number);
    return h * 60 + (m || 0);
};
const fromMinutes = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const typeOf = (type) => (CLASS_TYPES[type] ? type : 'theory');
const attendanceTone = (pct) => (pct >= 75 ? 'good' : pct >= 60 ? 'fair' : 'low');

/**
 * Group the entries of one column (a section's day, or a day's section) into blocks,
 * merging consecutive hours of the same class (3-hour labs) into one block.
 */
function buildColumn(entries, slots) {
    const bySlot = {};
    entries.forEach(e => { (bySlot[e.time] = bySlot[e.time] || []).push(e); });
    const cells = {};
    let open = null;
    slots.forEach((slot, i) => {
        const here = bySlot[slot] || [];
        const prevSlot = slots[i - 1];
        const continues = open && here.length === 1 && cells[open.slot].blocks.length === 1
            && prevSlot && toMinutes(slot) - toMinutes(prevSlot) === 60
            && open.last === prevSlot
            && here[0].subject === open.block.subject && here[0].classroom_id === open.block.classroom_id;
        if (continues) {
            open.block.entries.push(here[0]);
            open.block.end = toMinutes(slot) + 60;
            open.last = slot;
            cells[open.slot].span += 1;
            cells[slot] = { covered: true };
            return;
        }
        const blocks = here.map(e => ({
            ...e, ...parseSubject(e.subject), entries: [e], start: toMinutes(slot), end: toMinutes(slot) + 60
        }));
        cells[slot] = { blocks, span: 1 };
        open = blocks.length === 1 ? { slot, block: blocks[0], last: slot } : null;
    });
    return cells;
}

const AVATAR_HUES = [158, 199, 262, 32, 340, 188, 222, 12];

function initials(name = '') {
    const words = name.replace(/^(Dr|Prof|Engr|Mr|Ms|Mrs|Madam|Sir)\.?\s+/i, '').split(/\s+/).filter(Boolean);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
}

function avatarHue(name = '') {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_HUES[hash % AVATAR_HUES.length];
}

function AttendanceRing({ pct }) {
    const r = 11;
    const circumference = 2 * Math.PI * r;
    return (
        <span className={`tt-ring tone-${attendanceTone(pct)}`} title={`Expected attendance ${pct.toFixed(0)}%`}>
            <svg viewBox="0 0 28 28" aria-hidden="true">
                <circle cx="14" cy="14" r={r} className="tt-ring-track" />
                <circle cx="14" cy="14" r={r} className="tt-ring-value" strokeDasharray={`${(Math.min(100, pct) / 100) * circumference} ${circumference}`} />
            </svg>
            <span>{pct.toFixed(0)}</span>
        </span>
    );
}

function ClassBlock({ block, compact, showSection, dimmed, onDelete }) {
    const type = typeOf(block.type);
    const hours = block.entries.length;
    const attendance = block.entries.reduce((sum, e) => sum + (Number(e.attendance) || 0), 0) / hours;
    return (
        <div
            className={`tt-block type-${type} ${compact ? 'compact' : ''} ${dimmed ? 'dimmed' : ''} ${hours > 1 ? 'multi' : ''}`}
            style={{ '--class-color': CLASS_TYPES[type].color }}
            title={`${block.course} · ${CLASS_TYPES[type].label}\n${block.classroom} · ${block.teacher}\n${fromMinutes(block.start)}–${fromMinutes(block.end)} · expected attendance ${attendance.toFixed(0)}%`}
        >
            <div className="tt-block-top">
                <span className="tt-time-range">
                    <i className="tt-dot" />
                    {fromMinutes(block.start)}<span className="tt-dash">–</span><span className="tt-end">{fromMinutes(block.end)}</span>
                </span>
                {hours > 1 && <span className="tt-chip">{hours}h {CLASS_TYPES[type].label.toLowerCase()}</span>}
                <AttendanceRing pct={attendance} />
                {onDelete && (
                    <button type="button" className="tt-block-delete" onClick={() => onDelete(block)} aria-label={`Remove ${block.course}`} title="Remove class">
                        <FiTrash2 />
                    </button>
                )}
            </div>

            <strong className="tt-course">{block.course}</strong>
            {showSection && block.batch && <span className="tt-section-tag">Batch {block.batch} · Sec {block.section}</span>}
            <span className="tt-room"><FiMapPin /><span>{block.classroom}</span></span>

            {hours > 1 && !compact && (
                <div className="tt-hourly" aria-label="Expected attendance per hour">
                    {block.entries.map(e => (
                        <div key={e.id} className="tt-hourly-row">
                            <span>{e.time}</span>
                            <div className="tt-hourly-bar"><i className={`tone-${attendanceTone(Number(e.attendance) || 0)}`} style={{ width: `${Math.min(100, Number(e.attendance) || 0)}%` }} /></div>
                            <span>{Number(e.attendance || 0).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="tt-block-foot">
                <span className="tt-teacher">
                    <span className="tt-avatar" style={{ '--hue': avatarHue(block.teacher) }}>{initials(block.teacher)}</span>
                    <span className="tt-teacher-name">{block.teacher}</span>
                </span>
            </div>
        </div>
    );
}

function ScheduleGrid({ columns, slots, cellsByColumn, breakFor, compact, showSection, matches, onDelete, firstColLabel = 'Time' }) {
    return (
        <div className="tt-grid-scroll">
            <table className={`tt-grid ${compact ? 'compact' : ''}`} style={{ minWidth: `${compact ? 72 + columns.length * 122 : 92 + columns.length * 170}px` }}>
                <thead>
                    <tr>
                        <th className="tt-time-head">{firstColLabel}</th>
                        {columns.map(col => (
                            <th key={col.key}>
                                <span>{col.label}</span>
                                {col.sub && <small>{col.sub}</small>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {slots.map(slot => (
                        <tr key={slot}>
                            <th className="tt-time" scope="row">
                                <span>{slot}</span>
                                <small>{fromMinutes(toMinutes(slot) + 60)}</small>
                            </th>
                            {columns.map(col => {
                                const cell = cellsByColumn[col.key][slot];
                                if (cell?.covered) return null;
                                const blocks = cell?.blocks || [];
                                const breakLabel = !blocks.length && breakFor(col.key, slot);
                                return (
                                    <td key={col.key} rowSpan={cell?.span || 1} className={breakLabel ? 'tt-break' : blocks.length === 1 ? 'tt-single' : blocks.length ? '' : 'tt-free'}>
                                        {breakLabel ? (
                                            <span className="tt-break-label"><FiCoffee /> {breakLabel}</span>
                                        ) : (
                                            blocks.map(block => (
                                                <ClassBlock
                                                    key={block.id}
                                                    block={block}
                                                    compact={compact}
                                                    showSection={showSection}
                                                    dimmed={matches && !matches(block)}
                                                    onDelete={onDelete}
                                                />
                                            ))
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const emptyEntry = (batch = 1, section = 'I') => ({
    batch, section, course: '', type: 'theory', classroom_id: '', day: 'Monday', time: '08:00', hours: 1,
    teacher: '', email: '', attendance: 75
});

function Timetable({ user }) {
    const [schedules, setSchedules] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('section');
    const [activeSection, setActiveSection] = useState('1-I');
    const [activeDay, setActiveDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return DAYS.includes(today) ? today : 'Monday';
    });
    const [query, setQuery] = useState('');
    const [newEntry, setNewEntry] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        Promise.all([fetchSchedules(), fetchClassrooms()]).finally(() => setLoading(false));
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await api.get('/api/timetable');
            setSchedules(res.data);
        } catch (err) {
            console.error('Failed to fetch schedules:', err);
        }
    };

    const fetchClassrooms = async () => {
        try {
            const res = await api.get('/api/classrooms');
            setClassrooms(res.data);
        } catch (err) {
            console.error('Failed to fetch classrooms:', err);
        }
    };

    const teachingRooms = useMemo(() => classrooms.filter(c => ['lab', 'classroom', 'hall'].includes(c.type)), [classrooms]);

    const entries = useMemo(() => schedules.map(s => {
        const parsed = parseSubject(s.subject);
        return { ...s, ...parsed, sectionKey: sectionKey(parsed.batch, parsed.section) };
    }), [schedules]);

    const slots = useMemo(() => (
        [...new Set([...DEFAULT_SLOTS, ...entries.map(e => e.time)])].sort((a, b) => toMinutes(a) - toMinutes(b))
    ), [entries]);

    const sectionKeys = useMemo(() => {
        const keys = BATCHES.flatMap(b => SECTIONS.map(s => sectionKey(b, s)));
        const extra = [...new Set(entries.map(e => e.sectionKey))].filter(k => !keys.includes(k)).sort();
        return [...keys, ...extra];
    }, [entries]);

    const sectionStats = useMemo(() => Object.fromEntries(sectionKeys.map(key => {
        const list = entries.filter(e => e.sectionKey === key);
        return [key, { hours: list.length, courses: new Set(list.map(e => e.course)).size }];
    })), [sectionKeys, entries]);

    const q = query.trim().toLowerCase();
    const matches = q ? (block) => `${block.course} ${block.teacher} ${block.classroom}`.toLowerCase().includes(q) : null;

    // Section view: one section, columns = days
    const sectionEntries = useMemo(() => entries.filter(e => e.sectionKey === activeSection), [entries, activeSection]);
    const sectionCells = useMemo(() => Object.fromEntries(DAYS.map(day => (
        [day, buildColumn(sectionEntries.filter(e => e.day === day), slots)]
    ))), [sectionEntries, slots]);

    const courseSummary = useMemo(() => {
        const courses = {};
        sectionEntries.forEach(e => {
            const c = courses[e.course] || (courses[e.course] = { course: e.course, type: typeOf(e.type), teachers: new Set(), rooms: new Set(), hours: 0, att: 0 });
            c.teachers.add(e.teacher);
            c.rooms.add(e.classroom);
            c.hours += 1;
            c.att += Number(e.attendance) || 0;
        });
        return Object.values(courses).sort((a, b) => a.type.localeCompare(b.type) || a.course.localeCompare(b.course));
    }, [sectionEntries]);

    // Master view: one day, columns = sections
    const masterColumns = sectionKeys.filter(k => k !== UNASSIGNED || entries.some(e => e.sectionKey === UNASSIGNED));
    const masterCells = useMemo(() => Object.fromEntries(masterColumns.map(key => (
        [key, buildColumn(entries.filter(e => e.sectionKey === key && e.day === activeDay), slots)]
    ))), [masterColumns.join(), entries, activeDay, slots]);

    const totals = useMemo(() => {
        const att = entries.length ? entries.reduce((s, e) => s + (Number(e.attendance) || 0), 0) / entries.length : 0;
        return {
            sections: new Set(entries.map(e => e.sectionKey).filter(k => k !== UNASSIGNED)).size,
            hours: entries.length,
            labHours: entries.filter(e => e.type === 'lab').length,
            courses: new Set(entries.map(e => `${e.sectionKey}|${e.course}`)).size,
            att
        };
    }, [entries]);

    const sectionAtt = sectionEntries.length
        ? sectionEntries.reduce((s, e) => s + (Number(e.attendance) || 0), 0) / sectionEntries.length : 0;

    // ------------------------------------------------------------------ add / delete
    const plannedSlots = (entry) => Array.from({ length: Number(entry.hours) }, (_, i) => fromMinutes(toMinutes(entry.time) + i * 60));

    const conflicts = useMemo(() => {
        if (!newEntry) return [];
        const key = sectionKey(newEntry.batch, newEntry.section);
        const found = [];
        plannedSlots(newEntry).forEach(time => {
            entries.filter(e => e.day === newEntry.day && e.time === time).forEach(e => {
                if (e.sectionKey === key) found.push(`${sectionName(key)} already has ${e.course} at ${time}`);
                else if (String(e.classroom_id) === String(newEntry.classroom_id)) found.push(`${e.classroom} is booked for ${e.course} (${sectionName(e.sectionKey)}) at ${time}`);
            });
            if (BREAKS[`${newEntry.day}|${time}`]) found.push(`${time} on ${newEntry.day} is the ${BREAKS[`${newEntry.day}|${time}`]}`);
        });
        return found;
    }, [newEntry, entries]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const subject = `${newEntry.course.trim()} (Batch ${newEntry.batch} - Section ${newEntry.section})`;
            for (const time of plannedSlots(newEntry)) {
                await api.post('/api/timetable', {
                    classroom_id: Number(newEntry.classroom_id), day: newEntry.day, time, subject, type: newEntry.type,
                    teacher: newEntry.teacher, email: newEntry.email, attendance: Number(newEntry.attendance)
                });
            }
            await fetchSchedules();
            setActiveSection(sectionKey(newEntry.batch, newEntry.section));
            setNewEntry(null);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Could not save the class. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            await Promise.all(deleteTarget.entries.map(e => api.delete(`/api/timetable/${e.id}`)));
            fetchSchedules();
        }
        setDeleteTarget(null);
    };

    const handleBulkImport = async (e) => {
        e.preventDefault();
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', importFile);
        try {
            const res = await api.post('/api/timetable/bulk-import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportResult(res.data);
            if (res.data.success) fetchSchedules();
        } catch (err) {
            setImportResult({ success: false, message: err.response?.data?.message || 'Import failed' });
        } finally {
            setImporting(false);
        }
    };

    const closeImport = () => {
        setShowImportModal(false);
        setImportResult(null);
        setImportFile(null);
    };

    const downloadTemplate = () => {
        const template = 'classroom_id,day,time,subject,type,teacher,email,attendance\n'
            + '1,Monday,08:00,Database Systems (Batch 3 - Section I),theory,Dr. Smith,smith@uni.edu,85\n'
            + '2,Tuesday,10:00,Artificial Intelligence Lab (Batch 4 - Section II),lab,Prof. Khan,khan@uni.edu,65';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const setField = (field) => (e) => setNewEntry({ ...newEntry, [field]: e.target.value });

    const stats = [
        { label: 'Sections', val: totals.sections, icon: <FiLayers />, color: '#00f59b' },
        { label: 'Courses offered', val: totals.courses, icon: <FiBookOpen />, color: '#06b6d4' },
        { label: 'Contact hours / week', val: totals.hours, icon: <FiClock />, color: '#a78bfa' },
        { label: 'Lab hours / week', val: totals.labHours, icon: <FiCalendar />, color: '#38bdf8' },
        { label: 'Avg attendance', val: `${totals.att.toFixed(0)}%`, icon: <FiUsers />, color: '#f59e0b' }
    ];

    return (
        <div className="fade-in tt-page">
            <div className="tt-header">
                <div>
                    <span className="rooms-eyebrow">Morning shift · Monday–Friday · 08:00–15:00</span>
                    <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.03em' }}>
                        Academic <span className="text-gradient">Timetable</span>
                    </h2>
                    <p className="text-muted small m-0">Weekly class schedule by batch and section. Room energy plans follow these slots.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary-dim" onClick={() => setShowImportModal(true)}>
                        <FiUpload className="me-2" /> Bulk Import
                    </button>
                    <button className="btn btn-gradient" onClick={() => {
                        const [b, s] = activeSection === UNASSIGNED ? [1, 'I'] : activeSection.split('-');
                        setFormError('');
                        setNewEntry(emptyEntry(Number(b), s));
                    }}>
                        <FiPlus className="me-2" /> Add Class
                    </button>
                </div>
            </div>

            <div className="rooms-stats">
                {stats.map(s => (
                    <div className={`rooms-stat ${loading ? 'skeleton' : ''}`} key={s.label}>
                        {!loading && (
                            <>
                                <span className="rooms-stat-icon" style={{ color: s.color, background: `${s.color}1a` }}>{s.icon}</span>
                                <div>
                                    <strong>{s.val}</strong>
                                    <small>{s.label}</small>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <div className="tt-toolbar">
                <div className="tt-segmented" role="tablist" aria-label="Timetable view">
                    <button type="button" role="tab" aria-selected={view === 'section'} className={view === 'section' ? 'active' : ''} onClick={() => setView('section')}>
                        <FiCalendar /> Section timetable
                    </button>
                    <button type="button" role="tab" aria-selected={view === 'master'} className={view === 'master' ? 'active' : ''} onClick={() => setView('master')}>
                        <FiLayers /> Master view
                    </button>
                </div>
                <div className="tt-toolbar-right">
                    <div className="tt-legend">
                        {Object.entries(CLASS_TYPES).map(([key, t]) => (
                            <span key={key}><i style={{ background: t.color }} />{t.label}</span>
                        ))}
                    </div>
                    <label className="rooms-search">
                        <FiSearch />
                        <input type="search" placeholder="Highlight course, teacher or room" value={query} onChange={e => setQuery(e.target.value)} aria-label="Highlight classes" />
                    </label>
                </div>
            </div>

            {view === 'section' ? (
                <>
                    <div className="tt-section-picker" role="tablist" aria-label="Batch and section">
                        {BATCHES.map(batch => (
                            <div className="tt-batch" key={batch}>
                                <div className="tt-batch-label">
                                    <strong>Batch {batch}</strong>
                                    <small>{YEAR_LABELS[batch]}</small>
                                </div>
                                <div className="tt-batch-sections">
                                    {SECTIONS.map(section => {
                                        const key = sectionKey(batch, section);
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                role="tab"
                                                aria-selected={activeSection === key}
                                                className={activeSection === key ? 'active' : ''}
                                                onClick={() => setActiveSection(key)}
                                            >
                                                <span>Section {section}</span>
                                                <small>{sectionStats[key]?.hours || 0} h / week</small>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {sectionKeys.includes(UNASSIGNED) && (
                            <div className="tt-batch">
                                <div className="tt-batch-label">
                                    <strong>Other</strong>
                                    <small>No batch in subject</small>
                                </div>
                                <div className="tt-batch-sections">
                                    <button type="button" role="tab" aria-selected={activeSection === UNASSIGNED} className={activeSection === UNASSIGNED ? 'active' : ''} onClick={() => setActiveSection(UNASSIGNED)}>
                                        <span>Unassigned</span>
                                        <small>{sectionStats[UNASSIGNED]?.hours || 0} h / week</small>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <section className="tt-card">
                        <div className="tt-card-head">
                            <div>
                                <h3>{sectionName(activeSection)}</h3>
                                <p>
                                    {activeSection !== UNASSIGNED && `${YEAR_LABELS[activeSection.split('-')[0]]} · `}
                                    {sectionStats[activeSection]?.courses || 0} courses · {sectionEntries.length} contact hours per week
                                    {sectionEntries.length > 0 && ` · ${sectionAtt.toFixed(0)}% expected attendance`}
                                </p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="skeleton" style={{ height: 520 }} />
                        ) : (
                            <ScheduleGrid
                                columns={DAYS.map(day => ({ key: day, label: day }))}
                                slots={slots}
                                cellsByColumn={sectionCells}
                                breakFor={(day, slot) => BREAKS[`${day}|${slot}`]}
                                matches={matches}
                                onDelete={setDeleteTarget}
                            />
                        )}
                    </section>

                    {courseSummary.length > 0 && (
                        <section className="tt-card">
                            <div className="tt-card-head">
                                <div>
                                    <h3>Course load</h3>
                                    <p>Courses, instructors and rooms for {sectionName(activeSection)}</p>
                                </div>
                            </div>
                            <div className="tt-grid-scroll">
                                <table className="tt-summary">
                                    <thead>
                                        <tr>
                                            <th>Course</th>
                                            <th>Type</th>
                                            <th>Instructor</th>
                                            <th>Room</th>
                                            <th className="num">Hours / week</th>
                                            <th className="num">Expected attendance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courseSummary.map(c => {
                                            const att = c.att / c.hours;
                                            return (
                                                <tr key={c.course}>
                                                    <td className="tt-summary-course">{c.course}</td>
                                                    <td><span className="tt-type-pill" style={{ '--class-color': CLASS_TYPES[c.type].color }}>{CLASS_TYPES[c.type].label}</span></td>
                                                    <td>{[...c.teachers].join(', ')}</td>
                                                    <td>{[...c.rooms].join(', ')}</td>
                                                    <td className="num">{c.hours}</td>
                                                    <td className="num">
                                                        <div className="tt-att-bar">
                                                            <span className={`tone-${attendanceTone(att)}`} style={{ width: `${Math.min(100, att)}%` }} />
                                                        </div>
                                                        <span className={`tt-att tone-${attendanceTone(att)}`}>{att.toFixed(0)}%</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            ) : (
                <section className="tt-card">
                    <div className="tt-card-head">
                        <div>
                            <h3>{activeDay}</h3>
                            <p>All sections side by side · {entries.filter(e => e.day === activeDay).length} contact hours</p>
                        </div>
                        <div className="tt-day-tabs" role="tablist" aria-label="Day">
                            {DAYS.map(day => (
                                <button key={day} type="button" role="tab" aria-selected={activeDay === day} className={activeDay === day ? 'active' : ''} onClick={() => setActiveDay(day)}>
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                    {loading ? (
                        <div className="skeleton" style={{ height: 520 }} />
                    ) : (
                        <ScheduleGrid
                            columns={masterColumns.map(key => (key === UNASSIGNED
                                ? { key, label: 'Unassigned' }
                                : { key, label: `Batch ${key.split('-')[0]} · ${key.split('-')[1]}`, sub: YEAR_LABELS[key.split('-')[0]] }))}
                            slots={slots}
                            cellsByColumn={masterCells}
                            breakFor={(_, slot) => BREAKS[`${activeDay}|${slot}`]}
                            compact
                            matches={matches}
                            onDelete={setDeleteTarget}
                        />
                    )}
                </section>
            )}

            {/* Add class */}
            {newEntry && (
                <Portal>
                    <div className="modal show">
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="fw-bold mb-0">Add Class</h5>
                                    <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={() => setNewEntry(null)}></button>
                                </div>
                                <form onSubmit={handleAdd}>
                                    <div className="modal-body text-start">
                                        <div className="row g-3">
                                            <div className="col-md-3 col-6">
                                                <label className="form-label">Batch</label>
                                                <select className="form-select" value={newEntry.batch} onChange={e => setNewEntry({ ...newEntry, batch: Number(e.target.value) })}>
                                                    {BATCHES.map(b => <option key={b} value={b}>Batch {b} · {YEAR_LABELS[b]}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <label className="form-label">Section</label>
                                                <select className="form-select" value={newEntry.section} onChange={setField('section')}>
                                                    {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label">Course</label>
                                                <input type="text" className="form-control" placeholder="e.g. Database Systems" value={newEntry.course} required onChange={setField('course')} />
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <label className="form-label">Type</label>
                                                <select className="form-select" value={newEntry.type} onChange={e => setNewEntry({ ...newEntry, type: e.target.value, hours: e.target.value === 'lab' ? 3 : 1 })}>
                                                    {Object.entries(CLASS_TYPES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-3 col-6">
                                                <label className="form-label">Room</label>
                                                <select className="form-select" value={newEntry.classroom_id} required onChange={setField('classroom_id')}>
                                                    <option value="">Select…</option>
                                                    {teachingRooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-2 col-4">
                                                <label className="form-label">Day</label>
                                                <select className="form-select" value={newEntry.day} onChange={setField('day')}>
                                                    {DAYS.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-2 col-4">
                                                <label className="form-label">Starts</label>
                                                <select className="form-select" value={newEntry.time} onChange={setField('time')}>
                                                    {DEFAULT_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-2 col-4">
                                                <label className="form-label">Duration</label>
                                                <select className="form-select" value={newEntry.hours} onChange={setField('hours')}>
                                                    {[1, 2, 3].map(h => <option key={h} value={h}>{h} h</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-5">
                                                <label className="form-label">Instructor</label>
                                                <input type="text" className="form-control" placeholder="Dr. Jane Doe" value={newEntry.teacher} required onChange={setField('teacher')} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label">Instructor email</label>
                                                <input type="email" className="form-control" placeholder="jane@university.edu" value={newEntry.email} required onChange={setField('email')} />
                                            </div>
                                            <div className="col-md-3">
                                                <label className="form-label">Expected attendance %</label>
                                                <input type="number" className="form-control" min="0" max="100" value={newEntry.attendance} onChange={setField('attendance')} />
                                            </div>
                                        </div>
                                        {toMinutes(newEntry.time) + newEntry.hours * 60 > toMinutes('15:00') && (
                                            <div className="tt-form-note warn"><FiAlertTriangle /> This class runs past the 15:00 end of the morning shift.</div>
                                        )}
                                        {conflicts.length > 0 && (
                                            <div className="tt-form-note warn">
                                                <FiAlertTriangle />
                                                <div>
                                                    <strong>Scheduling conflicts</strong>
                                                    <ul>{conflicts.map(c => <li key={c}>{c}</li>)}</ul>
                                                </div>
                                            </div>
                                        )}
                                        {formError && <div className="tt-form-note error"><FiAlertCircle /> {formError}</div>}
                                    </div>
                                    <div className="modal-footer">
                                        <button type="submit" className="btn btn-lg btn-gradient w-100" disabled={saving}>
                                            {saving ? <DynamicLoader size={24} color="var(--loader-on-button, var(--bg-deep))" /> : conflicts.length ? 'Add Anyway' : 'Add to Timetable'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Bulk import */}
            {showImportModal && (
                <Portal>
                    <div className="modal show">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="fw-bold mb-0">Bulk Import Timetable</h5>
                                    <button className="btn-close" style={{ filter: 'var(--close-filter)' }} onClick={closeImport}></button>
                                </div>
                                <div className="modal-body">
                                    {importResult ? (
                                        <div className={`alert ${importResult.success ? 'bg-success' : 'bg-danger'} bg-opacity-10 border-0`}>
                                            <div className="d-flex align-items-center gap-3">
                                                {importResult.success ? <FiCheckCircle className="text-success h4 mb-0" /> : <FiAlertCircle className="text-danger h4 mb-0" />}
                                                <div>
                                                    <div className={`fw-bold ${importResult.success ? 'text-success' : 'text-danger'}`}>
                                                        {importResult.success ? 'Import Successful!' : 'Import Failed'}
                                                    </div>
                                                    <div className="small">{importResult.message}</div>
                                                </div>
                                            </div>
                                            {importResult.errors?.length > 0 && (
                                                <div className="mt-3 small text-muted">
                                                    <strong>Errors:</strong>
                                                    <ul className="mb-0 ps-3">
                                                        {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <form onSubmit={handleBulkImport}>
                                            <p className="text-muted small mb-4">
                                                Upload a CSV with columns <code>classroom_id, day, time, subject, type, teacher, email, attendance</code>.
                                                End each subject with <code>(Batch 3 - Section I)</code> so it appears under the right section.
                                            </p>
                                            <input type="file" className="form-control mb-3" accept=".csv" onChange={e => setImportFile(e.target.files[0])} />
                                            <button type="button" className="btn btn-primary-dim w-100 mb-3" onClick={downloadTemplate}>
                                                <FiDownload className="me-2" /> Download Template
                                            </button>
                                            <button type="submit" className="btn btn-lg btn-gradient w-100" disabled={!importFile || importing}>
                                                {importing ? <DynamicLoader size={20} color="var(--loader-on-button, var(--bg-deep))" /> : 'Upload & Import'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            <ConfirmModal
                show={!!deleteTarget}
                type="confirm"
                title="Remove class?"
                message={deleteTarget
                    ? `${deleteTarget.course} on ${deleteTarget.day}, ${fromMinutes(deleteTarget.start)}–${fromMinutes(deleteTarget.end)}${deleteTarget.entries.length > 1 ? ` (${deleteTarget.entries.length} hourly slots)` : ''} will be removed from the timetable.`
                    : ''}
                confirmText="Remove"
                tone="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Timetable;
