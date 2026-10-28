import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classrooms from './pages/Classrooms';
import Predictions from './pages/Predictions';
import Sidebar from './components/Sidebar';
import Signup from './pages/Signup';
import Timetable from './pages/Timetable';
import MLDataset from './pages/MLDataset';
import ModelStatus from './pages/ModelStatus';
import Users from './pages/Users';
import LandingPage from './pages/LandingPage';
import NotificationPanel from './components/NotificationPanel';
import CampusMap from './pages/CampusMap';
import LuminousBackground from './components/LuminousBackground';

import * as FiIcons from 'react-icons/fi';

// Global Error Boundary to catch render-time issues
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("Global Error Caught:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: 'white', flexDirection: 'column', textAlign: 'center', padding: '2rem' }}>
                    <FiIcons.FiAlertCircle size={48} color="#ef4444" className="mb-4" />
                    <h1>System Halt Detected</h1>
                    <p className="text-muted">An critical error occurred in the Dashboard engine.</p>
                    <button className="btn btn-primary mt-4" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Reset & Reload Hub</button>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("Failed to parse user from localStorage", e);
            return null;
        }
    });
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <Router>
            <div className="app-container">
                {/* Ceiling Attached Controls */}
                {user && (user.role === 'admin' || user.role === 'faculty') && (
                    <NotificationPanel user={user} />
                )}
                {user && (
                    <button
                        onClick={toggleTheme}
                        title="Switch Theme"
                        className="theme-toggle-ceiling"
                        style={{
                            position: 'fixed',
                            top: '0',
                            right: '3rem',
                            zIndex: 1000,
                            padding: '0.6rem 1.2rem',
                            borderRadius: '0 0 16px 16px',
                            border: '1px solid var(--border)',
                            borderTop: 'none',
                            background: 'var(--bg-card)',
                            color: 'var(--text)',
                            boxShadow: '0 4px 25px rgba(0,0,0,0.15)',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            letterSpacing: '0.05em'
                        }}
                    >
                        <span className="opacity-75">{theme === 'dark' ? 'Lights ON' : 'Lights OFF'}</span>
                        {theme === 'dark' ? (
                            <div style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}>
                                <FiIcons.FiSun size={18} className="text-warning spin-slow" />
                            </div>
                        ) : (
                            <div style={{ filter: 'drop-shadow(0 0 8px #3b82f6)' }}>
                                <FiIcons.FiMoon size={18} className="text-info pulse-slow" />
                            </div>
                        )}
                    </button>
                )}

                {user && <Sidebar
                    user={user}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    logout={handleLogout}
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />}
                <main className="main-content" style={!user ? { padding: 0 } : {}}>
                    {user && <LuminousBackground isCollapsed={isSidebarCollapsed} />}
                    <div className="main-content-inner" style={{ position: 'relative', zIndex: 1, minHeight: '100%' }}>
                        <Routes>
                            <Route path="/login" element={!user ? <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/" />} />
                            <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
                            <Route path="/" element={
                                user ? (
                                    <ErrorBoundary fallback={<div className="p-5 text-center"><h3>Something went wrong in Dashboard.</h3><button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>Reload Hub</button></div>}>
                                        <Dashboard />
                                    </ErrorBoundary>
                                ) : <LandingPage />
                            } />
                            <Route path="/classrooms" element={user ? <Classrooms user={user} /> : <Navigate to="/login" />} />
                            <Route path="/predictions" element={user ? <Predictions /> : <Navigate to="/login" />} />
                            <Route path="/model-status" element={user ? <ModelStatus /> : <Navigate to="/login" />} />
                            <Route path="/map" element={user ? <CampusMap user={user} /> : <Navigate to="/login" />} />
                            <Route path="/timetable" element={user ? <Timetable user={user} /> : <Navigate to="/login" />} />
                            <Route path="/ml-lab" element={user ? <MLDataset /> : <Navigate to="/login" />} />
                            <Route path="/users" element={user ? <Users user={user} /> : <Navigate to="/login" />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </Router>
    );
}

export default App;
