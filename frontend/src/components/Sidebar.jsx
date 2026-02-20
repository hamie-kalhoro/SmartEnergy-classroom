import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiGrid, FiBox, FiTrendingUp, FiCalendar, FiLogOut, FiZap, FiUsers, FiChevronDown, FiChevronUp, FiCpu, FiChevronLeft, FiMap } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';

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
            <div className="sidebar-nav-container">
                <nav className="sidebar-nav-inner">
                    {/* Main Menu Section */}
                    <div>
                        {!isCollapsed && (
                            <div
                                className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                                onClick={() => setShowMainMenu(!showMainMenu)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Main Menu</small>
                                {showMainMenu ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
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
                    <div style={{ marginTop: isCollapsed ? '0.5rem' : '1rem' }}>
                        {!isCollapsed && (
                            <div
                                className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                                onClick={() => setShowIntelligence(!showIntelligence)}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Intelligence</small>
                                {showIntelligence ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
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
                        <div style={{ marginTop: isCollapsed ? '0.5rem' : '1rem' }}>
                            {!isCollapsed && (
                                <div
                                    className="d-flex align-items-center justify-content-between px-3 mb-2 cursor-pointer"
                                    onClick={() => setShowManagement(!showManagement)}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    <small className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>Management</small>
                                    {showManagement ? <FiChevronUp className="text-muted" size={12} /> : <FiChevronDown className="text-muted" size={12} />}
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
                <div className="d-flex align-items-center gap-3 p-2 rounded-3 user-card-hover">
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
                        onClick={() => setShowLogout(true)}
                        title="Sign Out"
                        style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <FiLogOut size={18} />
                    </button>
                </div>
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
