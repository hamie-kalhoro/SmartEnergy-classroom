import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';

const LandingPage = () => {
    const [activeFeature, setActiveFeature] = useState(0);

    const [popups, setPopups] = useState([
        { id: 1, text: "Wait! AC is running in empty room!", type: 'alert' },
        { id: 2, text: "System detected high energy usage.", type: 'warning' },
        { id: 3, text: "Optimizing airflow...", type: 'success' },
    ]);

    useEffect(() => {
        const featureInterval = setInterval(() => {
            setActiveFeature(prev => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(featureInterval);
    }, []);

    useEffect(() => {
        // Cycle popups to demonstrate "coming up and disappearing"
        const interval = setInterval(() => {
            setPopups(prev => {
                const first = prev[0];
                const rest = prev.slice(1);
                return [...rest, first];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const features = [
        {
            icon: <FiIcons.FiActivity size={40} />,
            title: "Real-time Monitoring",
            desc: "Track energy consumption pulse by pulse. Visualize data instantly."
        },
        {
            icon: <FiIcons.FiCpu size={40} />,
            title: "Smart Predictions",
            desc: "AI-driven forecasts to anticipate high load and optimize resources."
        },
        {
            icon: <FiIcons.FiShield size={40} />,
            title: "Automated Control",
            desc: "Stop energy wastage before it happens with intelligent shut-offs."
        }
    ];

    return (
        <div className="landing-page" style={{
            minHeight: '100vh',
            background: 'var(--bg-deep)',
            color: 'var(--text)',
            overflowX: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Navbar */}
            <nav style={{ padding: '2rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="logo"
                    style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <FiIcons.FiZap /> SmartClass
                </motion.div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <Link to="/login" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: '500' }}>Sign In</Link>
                    <Link to="/signup" style={{
                        textDecoration: 'none',
                        background: 'var(--primary)',
                        color: 'var(--bg-deep)',
                        padding: '0.5rem 1.5rem',
                        borderRadius: '50px',
                        fontWeight: '600'
                    }}>Sign Up</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header style={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 1rem',
                position: 'relative'
            }}>
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '800', maxWidth: '800px', lineHeight: '1.2' }}
                >
                    Stop Wasting Energy. <br />
                    <span className="text-gradient">Start Saving Future.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{ marginTop: '1.5rem', fontSize: '1.1rem', maxWidth: '600px', opacity: 0.8 }}
                >
                    Join the revolution of smart classrooms. Monitor, control, and optimize your energy footprint with our state-of-the-art dashboard.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}
                >
                    <Link to="/signup" className="btn btn-primary" style={{
                        borderRadius: '50px',
                        padding: '1rem 2.5rem',
                        fontSize: '1.1rem'
                    }}>
                        Get Started
                    </Link>
                    <Link to="/login" style={{
                        padding: '1rem 2.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text)',
                        borderRadius: '50px',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                    }}>
                        Live Demo
                    </Link>
                </motion.div>

                {/* Dashboard 3D Simulation Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 10 }}
                    transition={{ delay: 0.8, duration: 1, type: 'spring' }}
                    style={{
                        marginTop: '4rem',
                        width: '90%',
                        maxWidth: '1000px',
                        perspective: '1000px',
                        marginBottom: '2rem', // Fixed overlap
                        zIndex: 1
                    }}
                >
                    <div style={{
                        transform: 'rotateX(10deg)',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 50px 100px -20px rgba(0, 210, 106, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                        background: '#000'
                    }}>
                        <img
                            src="/assets/dashboard_preview.png"
                            alt="Smart Settings Dashboard"
                            style={{ width: '100%', display: 'block', opacity: 0.9 }}
                        />
                        {/* Live Badge */}
                        <div style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(0,0,0,0.7)',
                            border: '1px solid var(--primary)',
                            color: 'var(--primary)',
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <span style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary)' }}></span>
                            LIVE SIMULATION
                        </div>
                    </div>
                </motion.div>

                {/* Floating Popups Background */}
                <div style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
                    <AnimatePresence>
                        {popups.slice(0, 2).map((popup, i) => (
                            <motion.div
                                key={popup.id}
                                initial={{ opacity: 0.3, x: i % 2 === 0 ? -100 : 100, y: Math.random() * 200 }}
                                animate={{ opacity: 0.1, x: i % 2 === 0 ? 100 : -100, y: Math.random() * -200 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                                style={{
                                    position: 'absolute',
                                    top: `${30 + i * 20}%`,
                                    left: `${20 + i * 50}%`,
                                    background: 'var(--bg-card)',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: `1px solid ${popup.type === 'alert' ? '#ef4444' : '#22c55e'}`,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: popup.type === 'alert' ? '#ef4444' : '#22c55e'
                                }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{popup.text}</span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </header>

            {/* Features Playback Section */}
            <section style={{ padding: '5rem 5%', background: 'var(--bg-elevated)' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Engineered for Efficiency</h2>
                    <p style={{ opacity: 0.7 }}>Watch how our system transforms data into actionable savings.</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    {features.map((feature, idx) => {
                        const isActive = idx === activeFeature;
                        return (
                            <motion.div
                                key={idx}
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    opacity: isActive ? 1 : 0.7,
                                    y: isActive ? -15 : 0
                                }}
                                transition={{ duration: 0.5, ease: "backOut" }}
                                style={{
                                    background: isActive
                                        ? 'linear-gradient(145deg, rgba(20, 20, 20, 0.9) 0%, rgba(35, 35, 35, 0.9) 100%)'
                                        : 'rgba(255, 255, 255, 0.02)',
                                    padding: '2.5rem',
                                    borderRadius: '24px',
                                    border: isActive ? '1px solid rgba(0, 210, 106, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                    textAlign: 'left',
                                    boxShadow: isActive
                                        ? '0 20px 50px -10px rgba(0, 210, 106, 0.15), inset 0 0 20px rgba(0, 210, 106, 0.05)'
                                        : 'none',
                                    maxWidth: '350px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    backdropFilter: 'blur(10px)',
                                    overflow: 'hidden'
                                }}
                                onClick={() => setActiveFeature(idx)}
                            >
                                {/* Active Gradient Border Shine */}
                                {isActive && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                                        background: 'linear-gradient(90deg, transparent, rgba(0, 210, 106, 0.8), transparent)'
                                    }} />
                                )}

                                <div style={{
                                    width: '70px', height: '70px',
                                    background: isActive ? 'linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(0, 210, 106, 0.05))' : 'rgba(255,255,255,0.03)',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    borderRadius: '20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '1.5rem',
                                    transition: 'all 0.3s',
                                    boxShadow: isActive ? '0 10px 20px -5px rgba(0, 210, 106, 0.3)' : 'none',
                                    border: isActive ? '1px solid rgba(0, 210, 106, 0.2)' : 'none'
                                }}>
                                    {React.cloneElement(feature.icon, { size: 32 })}
                                </div>

                                <h3 style={{
                                    fontSize: '1.5rem',
                                    marginBottom: '0.75rem',
                                    color: isActive ? 'var(--text)' : 'var(--text-secondary)',
                                    fontWeight: '700',
                                    letterSpacing: '-0.02em'
                                }}>
                                    {feature.title}
                                </h3>

                                <p style={{
                                    lineHeight: '1.7',
                                    opacity: isActive ? 0.9 : 0.5,
                                    fontSize: '0.95rem',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {feature.desc}
                                </p>

                                {/* Premium Gradient Progress Bar */}
                                {isActive && (
                                    <div style={{
                                        marginTop: '2rem',
                                        height: '4px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <motion.div
                                            initial={{ width: '0%' }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 4, ease: "linear" }}
                                            style={{
                                                height: '100%',
                                                background: 'linear-gradient(90deg, var(--primary), #06b6d4)',
                                                borderRadius: '2px',
                                                boxShadow: '0 0 10px var(--primary)'
                                            }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* "Stop Wasting Energy" Pop-up Demo Section */}
            <section style={{
                padding: '5rem 5%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ maxWidth: '800px', textAlign: 'center', zIndex: 2 }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Experience Intelligent Alerts</h2>
                    <p style={{ marginBottom: '3rem', fontSize: '1.2rem', opacity: 0.8 }}>
                        Notifications appear only when you need them.
                        They guide you to shut down unused devices and vanish when the job is done.
                    </p>
                </div>

                {/* Live Demo of Popups */}
                <div style={{
                    width: '100%',
                    maxWidth: '800px',
                    height: '400px',
                    background: 'url(/assets/dashboard_preview.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    borderRadius: '24px',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
                }}>
                    {/* Dark Overlay for readability */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 5, 5, 0.75)', backdropFilter: 'blur(3px)' }}></div>

                    <p style={{ opacity: 0.6, fontWeight: 'bold', position: 'relative', zIndex: 1, letterSpacing: '0.1em' }}>INTERACTIVE SYSTEM RESPONSE</p>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={popups[0].id}
                            initial={{ y: 50, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -50, opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            style={{
                                position: 'absolute',
                                bottom: '40px',
                                right: '40px',
                                background: 'rgba(18, 18, 18, 0.95)',
                                padding: '1rem 1.5rem',
                                borderRadius: '12px',
                                borderLeft: `4px solid ${popups[0].type === 'alert' ? '#ef4444' : '#22c55e'}`,
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                borderRight: '1px solid rgba(255,255,255,0.1)',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                maxWidth: '380px',
                                zIndex: 10
                            }}
                        >
                            <div style={{
                                background: popups[0].type === 'alert' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                padding: '8px',
                                borderRadius: '50%',
                                color: popups[0].type === 'alert' ? '#ef4444' : '#22c55e'
                            }}>
                                {popups[0].type === 'alert' ? <FiIcons.FiAlertCircle /> : <FiIcons.FiCheckCircle />}
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                    {popups[0].type === 'alert' ? 'Energy Alert' : 'System Optimized'}
                                </h4>
                                <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                                    {popups[0].text}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '3rem 5%', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <p style={{ opacity: 0.5 }}>© {new Date().getFullYear()} SmartEnergy. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
