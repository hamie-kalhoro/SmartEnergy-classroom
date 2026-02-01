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
import Users from './pages/Users';
import LandingPage from './pages/LandingPage';

import * as FiIcons from 'react-icons/fi';

function App() {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

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
                {/* Ceiling Attached Theme Toggle */}
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

                {user && <Sidebar user={user} theme={theme} toggleTheme={toggleTheme} logout={handleLogout} />}
                <main className="main-content" style={!user ? { padding: 0 } : {}}>
                    <Routes>
                        <Route path="/login" element={!user ? <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/" />} />
                        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
                        <Route path="/" element={user ? <Dashboard /> : <LandingPage />} />
                        <Route path="/classrooms" element={user ? <Classrooms user={user} /> : <Navigate to="/login" />} />
                        <Route path="/predictions" element={user ? <Predictions /> : <Navigate to="/login" />} />
                        <Route path="/timetable" element={user ? <Timetable user={user} /> : <Navigate to="/login" />} />
                        <Route path="/ml-lab" element={user ? <MLDataset /> : <Navigate to="/login" />} />
                        <Route path="/users" element={user ? <Users user={user} /> : <Navigate to="/login" />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
