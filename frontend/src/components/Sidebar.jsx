import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiBox, FiTrendingUp, FiCalendar, FiLogOut, FiZap, FiUsers, FiChevronDown, FiChevronUp, FiCpu } from 'react-icons/fi';

function Sidebar({ user, theme, toggleTheme, logout }) {
    const [showMainMenu, setShowMainMenu] = useState(true);
    const [showIntelligence, setShowIntelligence] = useState(false);
    const [showManagement, setShowManagement] = useState(false);

    const sectionVariants = {
        open: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
        closed: { height: 0, opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
    };

    return (
        <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Logo Section - Fixed at top */}
            <div className="mb-4">
                <div className="d-flex align-items-center gap-3">
                    <div style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                        borderRadius: '14px',
                        padding: '12px',
                        boxShadow: '0 0 25px rgba(124, 58, 237, 0.4)'
                    }}>
                        <FiZap className="text-white" style={{ fontSize: '1.4rem' }} />
                    </div>
                    <div>
                        <h5 className="fw-bold m-0" style={{ letterSpacing: '-0.03em' }}>SmartEnergy</h5>
                        <small className="text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Control Hub</small>
                    </div>
                </div>
            </div>

            {/* Scrollable Navigation Area */}
            <div className="sidebar-nav-container" style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                margin: '0 -1.5rem', // Offset the sidebar padding
                padding: '0 1.5rem'
            }}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Main Menu Section */}
                    <div>
                        <div
                            className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                            onClick={() => setShowMainMenu(!showMainMenu)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Main Menu</small>
                            {showMainMenu ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
                        </div>

                        <AnimatePresence>
                            {showMainMenu && (
                                <motion.div
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                    variants={sectionVariants}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <NavLink to="/" className="nav-link">
                                            <FiGrid /> <span>Dashboard</span>
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
                    <div style={{ marginTop: '1rem' }}>
                        <div
                            className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                            onClick={() => setShowIntelligence(!showIntelligence)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Intelligence</small>
                            {showIntelligence ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
                        </div>

                        <AnimatePresence>
                            {showIntelligence && (
                                <motion.div
                                    initial="closed"
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
                        <div style={{ marginTop: '1rem' }}>
                            <div
                                className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                                onClick={() => setShowManagement(!showManagement)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Management</small>
                                {showManagement ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
                            </div>

                            <AnimatePresence>
                                {showManagement && (
                                    <motion.div
                                        initial="closed"
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
            <div className="mt-auto px-1 pb-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div
                    className="d-flex align-items-center gap-3 p-2 rounded-3 user-card-hover"
                    style={{
                        background: 'var(--bg-elevated)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Avatar */}
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        flexShrink: 0
                    }}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="overflow-hidden flex-grow-1" style={{ lineHeight: 1.2 }}>
                        <p className="small fw-bold mb-0 text-truncate" style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{user.username}</p>
                        <span className="text-muted fw-bold" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>{user.role}</span>
                    </div>

                    {/* Logout Action */}
                    <button
                        className="btn btn-icon btn-sm text-danger hover-danger p-2"
                        onClick={() => window.confirm('Exit portal?') && logout()}
                        title="Sign Out"
                        style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <FiLogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
