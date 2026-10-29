import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiBox, FiTrendingUp, FiCalendar, FiLogOut, FiUsers, FiChevronDown, FiCpu, FiChevronLeft, FiMap, FiActivity, FiCloud, FiHardDrive, FiWifi } from 'react-icons/fi';
import api from '../api';
import ConfirmModal from './ConfirmModal';
import BrandMark from './BrandMark';

const NAV_GROUPS = [
    {
        id: 'main',
        label: 'Main Menu',
        items: [
            { to: '/', label: 'Dashboard', icon: FiGrid },
            { to: '/map', label: 'Map', icon: FiMap },
            { to: '/classrooms', label: 'Classrooms', icon: FiBox },
            { to: '/predictions', label: 'Predictions', icon: FiTrendingUp },
            { to: '/timetable', label: 'Timetable', icon: FiCalendar },
        ]
    },
    {
        id: 'intelligence',
        label: 'Intelligence',
        items: [
            { to: '/ml-lab', label: 'ML Laboratory', icon: FiCpu },
            { to: '/model-status', label: 'Intelligence Profile', icon: FiActivity },
        ]
    },
    {
        id: 'management',
        label: 'Management',
        adminOnly: true,
        items: [
            { to: '/users', label: 'Faculty Users', icon: FiUsers },
        ]
    }
];

const GROUPS_STORAGE_KEY = 'sidebarGroups';

const readOpenGroups = () => {
    try {
        return JSON.parse(localStorage.getItem(GROUPS_STORAGE_KEY)) || {};
    } catch {
        return {};
    }
};

const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (e) => setMatches(e.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};

const useSyncStatus = () => {
    const [status, setStatus] = useState({ active_db: 'local_sqlite', is_cloud_available: false, latency_ms: 0 });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/api/system/db-status');
                setStatus(res.data);
            } catch (err) {
                setStatus({ active_db: 'local_sqlite', is_cloud_available: false, latency_ms: 0 });
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    const online = status.is_cloud_available;
    const color = !online ? '#f43f5e' : status.latency_ms > 500 ? '#f59e0b' : '#10b981';
    const bars = !online ? 1 : status.latency_ms > 500 ? 2 : status.latency_ms > 200 ? 3 : 4;
    return { status, online, color, bars };
};

function Sidebar({ user, logout, isCollapsed, onToggle }) {
    const [openGroups, setOpenGroups] = useState(readOpenGroups);
    const [showLogout, setShowLogout] = useState(false);
    const isNarrow = useMediaQuery('(max-width: 991px)');
    const collapsed = isCollapsed || isNarrow;
    const sync = useSyncStatus();

    const isOpen = (id) => openGroups[id] !== false;
    const toggleGroup = (id) => {
        const next = { ...openGroups, [id]: !isOpen(id) };
        setOpenGroups(next);
        try { localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    };

    const initial = (user?.username || 'U').charAt(0).toUpperCase();
    const syncTitle = sync.status.active_db === 'supabase_cloud' ? 'Supabase Cloud' : 'Local Cache';
    const syncTooltip = `${syncTitle} · ${sync.online ? `Synced (${sync.status.latency_ms}ms)` : 'Offline'}`;

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {!isNarrow && (
                <button
                    className="sidebar-toggle-btn"
                    onClick={onToggle}
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <FiChevronLeft size={14} />
                </button>
            )}

            {/* Every element keeps the same position in both states; collapsing only
                narrows the clipping box and fades the text, so nothing jumps or re-wraps. */}
            <div className="sb-inner">
                {/* Brand */}
                <div className="sb-brand">
                    <BrandMark size={36} />
                    <div className="sb-brand-text sb-fade">
                        <span className="sb-brand-name">Smart<em>Energy</em></span>
                        <span className="sb-brand-sub">Energy Management</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sb-nav" aria-label="Main navigation">
                    {NAV_GROUPS.filter(g => !g.adminOnly || user?.role === 'admin').map(group => {
                        const open = collapsed || isOpen(group.id);
                        return (
                            <div className="sb-group" key={group.id}>
                                <button
                                    type="button"
                                    className="sb-group-header"
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={open}
                                    disabled={collapsed}
                                >
                                    <span className="sb-fade">{group.label}</span>
                                    <FiChevronDown className="sb-group-chevron sb-fade" size={14} />
                                </button>

                                <div className={`sb-group-body ${open ? '' : 'closed'}`}>
                                    <div className="sb-links">
                                        {group.items.map(({ to, label, icon: Icon }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                end={to === '/'}
                                                className="sb-link"
                                                title={collapsed ? label : undefined}
                                            >
                                                <span className="sb-link-icon"><Icon /></span>
                                                <span className="sb-link-label sb-fade">{label}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Account + Database status card */}
                <div className="sb-footer">
                    <div className="sb-account" style={{ '--sb-status': sync.color }}>
                        <div className="sb-account-user">
                            <button
                                type="button"
                                className="sb-avatar"
                                onClick={collapsed ? () => setShowLogout(true) : undefined}
                                tabIndex={collapsed ? 0 : -1}
                                title={collapsed ? `${user?.username} · Sign out
${syncTooltip}` : undefined}
                                aria-label={collapsed ? 'Sign out' : undefined}
                            >
                                {initial}
                                <span className="sb-avatar-status" />
                            </button>
                            <div className="sb-account-details sb-fade">
                                <div className="sb-account-name">{user?.username}</div>
                                <div className="sb-account-role">{user?.role}</div>
                            </div>
                            <button
                                type="button"
                                className="sb-icon-btn sb-fade"
                                onClick={() => setShowLogout(true)}
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <FiLogOut size={16} />
                            </button>
                        </div>

                        <div className="sb-sync-wrap">
                            <div className="sb-sync sb-fade" title={syncTooltip}>
                                <span className="sb-sync-icon">
                                    {sync.status.active_db === 'supabase_cloud' ? <FiCloud /> : <FiHardDrive />}
                                </span>
                                <div className="sb-sync-text">
                                    <div className="sb-sync-title">{syncTitle}</div>
                                    <div className="sb-sync-meta">
                                        <FiWifi size={11} /> {sync.online ? `${sync.status.latency_ms}ms ping` : 'Disconnected'}
                                    </div>
                                </div>
                                <div className="sb-sync-status">
                                    <div className="sb-bars" aria-hidden="true">
                                        {[1, 2, 3, 4].map(b => (
                                            <span key={b} className={b <= sync.bars ? 'on' : ''} style={{ height: `${b * 25}%` }} />
                                        ))}
                                    </div>
                                    <span className="sb-status-label">
                                        <span className="sb-dot" />
                                        {sync.online ? 'Synced' : 'Local'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                show={showLogout}
                type="confirm"
                icon={<FiLogOut />}
                title="Sign out of SmartEnergy?"
                message="You'll need to sign in again to access the dashboard."
                confirmText="Sign out"
                tone="danger"
                onConfirm={() => { setShowLogout(false); logout(); }}
                onCancel={() => setShowLogout(false)}
            >
                <div className="cmodal-account" style={{ '--sb-status': sync.color }}>
                    <span className="cmodal-account-avatar">{initial}</span>
                    <div className="cmodal-account-text">
                        <strong>{user?.username}</strong>
                        <span>{user?.email || user?.role}</span>
                    </div>
                    <span className="cmodal-account-role">{user?.role}</span>
                </div>
                <div className="cmodal-session">
                    <span className="cmodal-session-dot" />
                    {syncTitle} · {sync.online ? 'Synced' : 'Offline'}
                </div>
            </ConfirmModal>
        </aside>
    );
}

export default Sidebar;
