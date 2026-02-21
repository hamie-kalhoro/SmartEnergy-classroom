import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiBox, FiTrendingUp, FiCalendar, FiLogOut, FiZap, FiUsers, FiChevronDown, FiChevronUp, FiCpu, FiChevronLeft, FiMap, FiGlobe, FiDatabase, FiWifi } from 'react-icons/fi';
import api from '../api';
import ConfirmModal from './ConfirmModal';

const SyncStatus = ({ isCollapsed }) => {
    const [status, setStatus] = useState({ active_db: 'local_sqlite', is_cloud_available: false, latency_ms: 0 });
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        try {
            const res = await api.get('/api/system/db-status');
            setStatus(res.data);
        } catch (err) {
            setStatus({ active_db: 'local_sqlite', is_cloud_available: false, latency_ms: 0 });
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const getSignalColor = () => {
        if (!status.is_cloud_available) return '#f43f5e'; // Rose/Offline
        if (status.latency_ms > 500) return '#f59e0b';   // Amber/Lagging
        return '#10b981';                               // Emerald/Excellent
    };

    const getBars = () => {
        if (!status.is_cloud_available) return 1;
        if (status.latency_ms > 500) return 2;
        if (status.latency_ms > 200) return 3;
        return 4;
    };

    if (isCollapsed) return (
        <div className="d-flex flex-column align-items-center gap-3 py-3" style={{ opacity: 0.9 }} title={status.is_cloud_available ? 'Supabase Cloud Synced' : 'Local Mode'}>
            <div className={`rounded-circle ${status.is_cloud_available ? 'pulse-green' : 'pulse-red'}`} style={{ width: '8px', height: '8px', background: getSignalColor() }} />
            <FiWifi size={16} style={{ color: getSignalColor() }} />
        </div>
    );

    return (
        <div style={{ marginTop: '0.4rem' }}>
            <div className="p-2 rounded-3" style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                backdropFilter: 'blur(10px)'
            }}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                    <div className="d-flex align-items-center gap-2">
                        <FiGlobe className={status.is_cloud_available ? 'text-success' : 'text-muted'} size={12} />
                        <span className="fw-bold" style={{ fontSize: '0.6rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                            {status.active_db === 'supabase_cloud' ? 'SUPABASE CLOUD' : 'LOCAL CACHE'}
                        </span>
                    </div>
                    <div className="d-flex align-items-end gap-1" style={{ height: '12px' }}>
                        {[1, 2, 3, 4].map(b => (
                            <div key={b} style={{
                                width: '3px',
                                height: `${b * 25}%`,
                                background: b <= getBars() ? getSignalColor() : 'rgba(255,255,255,0.1)',
                                borderRadius: '1px',
                                transition: 'all 0.3s ease'
                            }} />
                        ))}
                    </div>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                    <div className="small text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.6rem' }}>
                        <FiWifi size={10} /> {status.is_cloud_available ? `${status.latency_ms}ms ping` : 'Disconnected'}
                    </div>
                    <div className="d-flex align-items-center gap-1">
                        <div className={`rounded-circle ${status.is_cloud_available ? 'pulse-green' : 'pulse-red'}`}
                            style={{ width: '5px', height: '5px', background: getSignalColor() }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: getSignalColor(), textTransform: 'uppercase' }}>
                            {status.is_cloud_available ? 'Synced' : 'Local'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

function Sidebar({ user, theme, toggleTheme, logout, isCollapsed, onToggle }) {
    const [showMainMenu, setShowMainMenu] = useState(true);
    const [showIntelligence, setShowIntelligence] = useState(false);
    const [showManagement, setShowManagement] = useState(false);
    const [showLogout, setShowLogout] = useState(false);

    const sectionVariants = {
        open: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
        closed: { height: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Collapse Toggle Button */}
            <button
                className="sidebar-toggle-btn"
                onClick={onToggle}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <FiChevronLeft />
            </button>
            {/* Logo Section - Fixed at top */}
            <div className={isCollapsed ? "mb-4" : "mb-3"}>
                <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center' : 'gap-3'}`}>
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                        borderRadius: '8px',
                        padding: '8px',
                        boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)'
                    }}>
                        <FiZap className="text-white" style={{ fontSize: '1rem' }} />
                    </div>
                    <div>
                        <h6 className="fw-bold m-0" style={{ letterSpacing: '-0.02em', fontSize: '0.95rem' }}>SmartEnergy</h6>
                        <small className="text-muted" style={{ fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7 }}>AI Control Hub</small>
                    </div>
                </div>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="sidebar-nav-container">
                <nav className="sidebar-nav-inner">
                    {/* Main Menu Section */}
                    <div>
                        {!isCollapsed && (
                            <div
                                className="d-flex align-items-center justify-content-between px-1 mb-1"
                                onClick={() => setShowMainMenu(!showMainMenu)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <small className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', opacity: 0.6 }}>Main Menu</small>
                                {showMainMenu ? <FiChevronUp className="text-muted" size={10} /> : <FiChevronDown className="text-muted" size={10} />}
                            </div>
                        )}

                        <AnimatePresence>
                            {(showMainMenu || isCollapsed) && (
                                <motion.div
                                    initial={isCollapsed ? "open" : "closed"}
                                    animate="open"
                                    exit="closed"
                                    variants={sectionVariants}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <NavLink to="/" className="nav-link">
                                            <FiGrid /> <span>Dashboard</span>
                                        </NavLink>
                                        <NavLink to="/map" className="nav-link">
                                            <FiMap /> <span>Map</span>
                                        </NavLink>
                                        <NavLink to="/classrooms" className="nav-link">
                                            <FiBox /> <span>Classrooms</span>
                                        </NavLink>
                                        <NavLink to="/predictions" className="nav-link">
                                            <FiTrendingUp /> <span>Predictions</span>
                                        </NavLink>
                                        <NavLink to="/timetable" className="nav-link">
                                            <FiCalendar /> <span>Timetable</span>
                                        </NavLink>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Intelligence Section */}
                    <div style={{ marginTop: isCollapsed ? '0.25rem' : '0.5rem' }}>
                        {!isCollapsed && (
                            <div
                                className="d-flex align-items-center justify-content-between px-1 mb-1"
                                onClick={() => setShowIntelligence(!showIntelligence)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <small className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', opacity: 0.6 }}>Intelligence</small>
                                {showIntelligence ? <FiChevronUp className="text-muted" size={10} /> : <FiChevronDown className="text-muted" size={10} />}
                            </div>
                        )}

                        <AnimatePresence>
                            {(showIntelligence || isCollapsed) && (
                                <motion.div
                                    initial={isCollapsed ? "open" : "closed"}
                                    animate="open"
                                    exit="closed"
                                    variants={sectionVariants}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <NavLink to="/ml-lab" className="nav-link">
                                            <FiCpu /> <span>ML Laboratory</span>
                                        </NavLink>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Management Section (Admin Only) */}
                    {user.role === 'admin' && (
                        <div style={{ marginTop: isCollapsed ? '0.25rem' : '0.5rem' }}>
                            {!isCollapsed && (
                                <div
                                    className="d-flex align-items-center justify-content-between px-1 mb-1"
                                    onClick={() => setShowManagement(!showManagement)}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <small className="text-muted" style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', opacity: 0.6 }}>Management</small>
                                    {showManagement ? <FiChevronUp className="text-muted" size={10} /> : <FiChevronDown className="text-muted" size={10} />}
                                </div>
                            )}

                            <AnimatePresence>
                                {(showManagement || isCollapsed) && (
                                    <motion.div
                                        initial={isCollapsed ? "open" : "closed"}
                                        animate="open"
                                        exit="closed"
                                        variants={sectionVariants}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <NavLink to="/users" className="nav-link">
                                                <FiUsers /> <span>Faculty Users</span>
                                            </NavLink>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </nav>
            </div>

            {/* User Section - Docked at bottom */}
            <div className="sidebar-user-section">
                <div
                    className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center cursor-pointer' : 'gap-2'} p-2 rounded-3 user-card-hover`}
                    style={{ background: 'rgba(255,255,255,0.02)', cursor: isCollapsed ? 'pointer' : 'default' }}
                    onClick={isCollapsed ? () => setShowLogout(true) : undefined}
                >
                    {/* Avatar */}
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        boxShadow: isCollapsed ? '0 0 10px rgba(124, 58, 237, 0.3)' : 'none'
                    }}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="overflow-hidden flex-grow-1" style={{ lineHeight: 1 }}>
                        <p className="small fw-bold mb-0 text-truncate" style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{user.username}</p>
                        <span className="text-muted fw-bold" style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.6 }}>{user.role}</span>
                    </div>

                    {/* Logout Action */}
                    <button
                        className="btn btn-icon btn-sm text-danger hover-danger p-1"
                        onClick={() => setShowLogout(true)}
                        title="Sign Out"
                        style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}
                    >
                        <FiLogOut size={16} />
                    </button>
                </div>

                {/* ─── Premium Database & Sync Status ─── */}
                <SyncStatus isCollapsed={isCollapsed} />
            </div>

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                show={showLogout}
                type="warning"
                title="Exit Portal?"
                message="You will be signed out of your SmartEnergy session."
                confirmText="Sign Out"
                onConfirm={() => { setShowLogout(false); logout(); }}
                onCancel={() => setShowLogout(false)}
            />
        </aside>
    );
}

export default Sidebar;
