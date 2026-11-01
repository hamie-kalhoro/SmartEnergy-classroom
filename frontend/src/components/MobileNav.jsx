import React, { useEffect, useRef, useState } from 'react';
import { NavLink, matchPath, useLocation } from 'react-router-dom';
import { FiLogOut, FiMoreHorizontal, FiWifi, FiX } from 'react-icons/fi';
import BrandMark from './BrandMark';
import Portal from './Portal';

// The four pages used most on a phone. Everything else goes in the More sheet.
const TAB_ROUTES = ['/', '/map', '/classrooms', '/timetable'];

const isActive = (to, pathname) => Boolean(matchPath({ path: to, end: to === '/' }, pathname));

function MobileNav({ items, user, initial, sync, syncTitle, onSignOut }) {
    const { pathname } = useLocation();
    const [sheetOpen, setSheetOpen] = useState(false);
    const moreButtonRef = useRef(null);
    const sheetRef = useRef(null);

    const tabs = TAB_ROUTES.map(to => items.find(item => item.to === to)).filter(Boolean);
    const moreItems = items.filter(item => !TAB_ROUTES.includes(item.to));
    const currentPage = items.find(item => isActive(item.to, pathname));
    const moreActive = moreItems.some(item => isActive(item.to, pathname));

    const closeSheet = () => {
        setSheetOpen(false);
        moreButtonRef.current?.focus();
    };

    useEffect(() => {
        setSheetOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (sheetOpen) sheetRef.current?.focus();
    }, [sheetOpen]);

    const handleSheetKeys = (e) => {
        if (e.key === 'Escape') {
            closeSheet();
            return;
        }
        if (e.key !== 'Tab') return;
        // Keep keyboard focus inside the open sheet.
        const focusable = sheetRef.current.querySelectorAll('a, button');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return (
        <>
            <header className="m-topbar">
                <BrandMark size={32} />
                <span className="m-topbar-title">{currentPage?.label || 'SmartClass'}</span>
            </header>

            <nav className="m-tabbar" aria-label="Main navigation">
                {tabs.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} end={to === '/'} className="m-tab">
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                    </NavLink>
                ))}
                <button
                    ref={moreButtonRef}
                    type="button"
                    className={`m-tab ${moreActive ? 'active' : ''}`}
                    onClick={() => setSheetOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={sheetOpen}
                >
                    <FiMoreHorizontal aria-hidden="true" />
                    <span>More</span>
                </button>
            </nav>

            {sheetOpen && (
                <Portal>
                    <div className="m-sheet-backdrop" onClick={closeSheet} />
                    <div
                        ref={sheetRef}
                        className="m-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label="More pages and account"
                        tabIndex={-1}
                        onKeyDown={handleSheetKeys}
                    >
                        <div className="m-sheet-header">
                            <span>More</span>
                            <button type="button" className="m-sheet-close" onClick={closeSheet} aria-label="Close menu">
                                <FiX aria-hidden="true" />
                            </button>
                        </div>

                        <div className="m-sheet-links">
                            {moreItems.map(({ to, label, icon: Icon }) => (
                                <NavLink key={to} to={to} className="m-sheet-link" onClick={() => setSheetOpen(false)}>
                                    <Icon aria-hidden="true" />
                                    <span>{label}</span>
                                </NavLink>
                            ))}
                        </div>

                        <div className="m-sheet-account" style={{ '--sb-status': sync.color }}>
                            <span className="m-sheet-avatar">{initial}</span>
                            <div className="m-sheet-account-text">
                                <strong>{user?.username}</strong>
                                <span>{user?.role}</span>
                            </div>
                            <button type="button" className="m-sheet-signout" onClick={onSignOut}>
                                <FiLogOut aria-hidden="true" />
                                Sign out
                            </button>
                        </div>

                        <div className="m-sheet-sync" style={{ '--sb-status': sync.color }}>
                            <span className="m-sheet-sync-dot" />
                            {syncTitle}
                            <span className="m-sheet-sync-meta">
                                <FiWifi size={11} aria-hidden="true" />
                                {sync.online ? `${sync.status.latency_ms}ms ping` : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}

export default MobileNav;
