import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    FiActivity, 
    FiCpu, 
    FiShield, 
    FiPlayCircle, 
    FiUser, 
    FiMapPin, 
    FiAlertCircle, 
    FiCheckCircle,
    FiZap,
    FiSliders,
    FiTrendingUp,
    FiServer,
    FiWifi,
    FiChevronRight,
    FiArrowRight
} from 'react-icons/fi';
import SmartLogo from '../components/SmartLogo';
import EnergyBackground from '../components/EnergyBackground';
import HeroVideoSection from '../components/HeroVideoSection';

const LandingPage = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const [teamIndex, setTeamIndex] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const [activeScenario, setActiveScenario] = useState(0);

    // Interactive Demo Simulation States (No heavy 160MB video streaming!)
    const [simulatedRooms, setSimulatedRooms] = useState({
        'Lab CS-06': { active: true, load: '2.4 kW', temp: '22°C', occupancy: 'Empty (Auto-Off in 2m)' },
        'Seminar Hall': { active: false, load: '0.0 kW', temp: '25°C', occupancy: 'Vacant' },
        'AI Lab': { active: true, load: '3.1 kW', temp: '21°C', occupancy: '32 Systems Active' },
        'Library': { active: true, load: '1.8 kW', temp: '23°C', occupancy: 'Optimal' }
    });

    const teamMembers = [
        { 
            name: "Karan Kumar", 
            roll: "22CS008", 
            role: "ML Modeling & Prediction",
            desc: "Developed LSTM neural models for peak load prediction and historical trend forecasting."
        },
        { 
            name: "Hamid Ali (GL)", 
            roll: "22CS002", 
            role: "Lead Architecture & IoT Systems",
            desc: "Designed edge controller network, telemetry ingestion pipeline, and database optimization.",
            isLeader: true
        },
        { 
            name: "Mir Liaquat", 
            roll: "22CS018", 
            role: "Frontend Systems & UI/UX",
            desc: "Crafted interactive spatial digital twin campus map, analytics dashboards, and reactive states."
        }
    ];

    const alertScenarios = [
        {
            id: 0,
            title: "Empty Classroom AC Active",
            type: "alert",
            icon: <FiAlertCircle />,
            room: "Lab CS-04",
            metric: "2.8 kW wasted",
            action: "AI Auto-Off Initiated: Relays decoupled, power saved immediately.",
            status: "Resolved in 1.2s"
        },
        {
            id: 1,
            title: "Peak Grid Demand Surge",
            type: "warning",
            icon: <FiZap />,
            room: "Main Academic Block",
            metric: "14.2 kW Threshold",
            action: "Dynamic Load Shedding: Secondary HVAC compressors throttled.",
            status: "Grid Stabilized"
        },
        {
            id: 2,
            title: "Microgrid Solar Yield Rebalance",
            type: "success",
            icon: <FiCheckCircle />,
            room: "Campus Substation",
            metric: "+32% Green Yield",
            action: "Renewable Routing: Library & Admin blocks switched to clean solar bank.",
            status: "Zero Grid Draw"
        }
    ];

    // Keeps the enterprise light theme (theme-light.css) off this page.
    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-page', 'landing');
        return () => document.documentElement.removeAttribute('data-page');
    }, []);

    useEffect(() => {
        const teamTimer = setInterval(() => {
            setTeamIndex(prev => (prev + 1) % teamMembers.length);
        }, 4500);

        const featureTimer = setInterval(() => {
            setActiveFeature(prev => (prev + 1) % 3);
        }, 5000);

        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const isPassed = window.scrollY > 40;
                    setScrolled(prev => (prev !== isPassed ? isPassed : prev));
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            clearInterval(teamTimer);
            clearInterval(featureTimer);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const toggleSimRoom = (roomName) => {
        setSimulatedRooms(prev => ({
            ...prev,
            [roomName]: {
                ...prev[roomName],
                active: !prev[roomName].active,
                load: !prev[roomName].active ? '2.1 kW' : '0.0 kW'
            }
        }));
    };

    const features = [
        {
            icon: <FiActivity size={32} />,
            title: "Real-time Edge Monitoring",
            desc: "Sub-second IoT telemetry streaming with instant kilowatt pulse visualizers.",
            tag: "Edge Ingestion",
            metric: "< 20ms Latency"
        },
        {
            icon: <FiCpu size={32} />,
            title: "Smart Predictive AI",
            desc: "Deep learning models predict campus demand curves 24h ahead to stop tariff spikes.",
            tag: "LSTM Neural Net",
            metric: "94.8% Accuracy"
        },
        {
            icon: <FiShield size={32} />,
            title: "Automated Circuit Relays",
            desc: "Zero-touch safety control cuts power to vacant lecture halls and rogue electronics.",
            tag: "Microcontroller Grid",
            metric: "100% Autonomous"
        }
    ];

    return (
        <div className="landing-page" style={{
            minHeight: '100vh',
            background: '#02090c',
            color: 'var(--text)',
            overflowX: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Global Ambient Energy Particle Background */}
            <EnergyBackground />

            {/* Navbar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: scrolled ? '0.75rem 6%' : '1.25rem 6%',
                zIndex: 1000,
                background: scrolled ? 'rgba(2, 6, 23, 0.85)' : 'rgba(2, 6, 23, 0.4)',
                backdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: scrolled ? '1px solid rgba(0, 245, 155, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: scrolled ? '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 245, 155, 0.05)' : 'none',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', transform: scrolled ? 'scale(0.92)' : 'scale(1)', transition: 'transform 0.4s ease' }}>
                    <SmartLogo size={28} />
                </div>
                
                <div className="landing-nav-links d-flex gap-4 align-items-center">
                    <Link to="/map" className="landing-nav-link" style={{
                        color: scrolled ? '#ffffff' : 'rgba(255,255,255,0.8)',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.88rem',
                        transition: 'all 0.3s ease'
                    }}>
                        Campus Map
                    </Link>
                    <Link to="/login" style={{
                        color: scrolled ? '#ffffff' : 'rgba(255,255,255,0.8)', 
                        textDecoration: 'none', 
                        fontWeight: '600', 
                        fontSize: '0.88rem',
                        transition: 'all 0.3s ease'
                    }}>
                        Sign In
                    </Link>
                    <Link to="/signup" className="btn btn-primary" style={{ 
                        padding: '0.55rem 1.4rem', 
                        borderRadius: '50px', 
                        fontWeight: '700', 
                        fontSize: '0.88rem',
                        background: 'linear-gradient(135deg, #00f59b 0%, #059669 100%)',
                        color: '#02090c',
                        border: 'none',
                        boxShadow: '0 0 20px rgba(0, 245, 155, 0.4)',
                        textDecoration: 'none',
                        transition: 'all 0.3s ease'
                    }}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Floating Vertical Navigation on Scroll */}
            <AnimatePresence>
                {scrolled && (
                    <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        style={{
                            position: 'fixed',
                            right: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            background: 'rgba(2, 9, 12, 0.8)',
                            backdropFilter: 'blur(20px)',
                            padding: '1.5rem 0.75rem',
                            borderRadius: '100px',
                            border: '1px solid rgba(0, 245, 155, 0.25)',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 245, 155, 0.1)'
                        }}
                    >
                        {[
                            { to: '/signup', icon: <FiPlayCircle />, label: 'Get Started', active: true },
                            { to: '/login', icon: <FiUser />, label: 'Sign In' },
                            { to: '/map', icon: <FiMapPin />, label: 'Campus Map' }
                        ].map(item => (
                            <Link key={item.to} to={item.to} className={`nav-side-btn ${item.active ? 'active' : ''}`} title={item.label}>
                                {item.icon}
                                <span className="nav-side-label">{item.label}</span>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Part 1: Hero Section (Matches heroVideo.mp4 with Cyber Grid & Lightning) */}
            <HeroVideoSection />

            {/* Part 2: Smarter Control Hub — Interactive Simulation (No 160MB video streaming lag!) */}
            <section id="live-simulation" style={{
                position: 'relative',
                padding: '3.75rem 6%',
                background: 'radial-gradient(ellipse at 50% 20%, rgba(0, 245, 155, 0.06) 0%, rgba(2, 9, 12, 0.98) 70%)',
                borderTop: '1px solid rgba(0, 245, 155, 0.15)',
                borderBottom: '1px solid rgba(0, 245, 155, 0.15)',
                overflow: 'hidden'
            }}>
                <div style={{
                    maxWidth: '1360px',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '3rem',
                    alignItems: 'center'
                }}>
                    {/* Left text column */}
                    <div style={{ textAlign: 'left' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.35rem 0.9rem',
                            background: 'rgba(0, 245, 155, 0.08)',
                            border: '1px solid rgba(0, 245, 155, 0.25)',
                            borderRadius: '50px',
                            marginBottom: '1rem'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: '#00f59b',
                                boxShadow: '0 0 10px #00f59b'
                            }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.1em', color: '#34d399', textTransform: 'uppercase' }}>
                                AUTONOMOUS CONTROL HUB
                            </span>
                        </div>

                        <h2 style={{
                            fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)',
                            fontWeight: '900',
                            letterSpacing: '-0.04em',
                            lineHeight: 1.12,
                            color: '#ffffff',
                            marginBottom: '1rem'
                        }}>
                            Smarter Telemetry. <br />
                            <span style={{
                                background: 'linear-gradient(135deg, #00f59b 0%, #22e6b6 50%, #06b6d4 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>Instant Optimization.</span>
                        </h2>

                        <p style={{
                            color: 'rgba(226, 232, 240, 0.8)',
                            fontSize: '1.05rem',
                            lineHeight: 1.6,
                            marginBottom: '1.75rem',
                            maxWidth: '500px'
                        }}>
                            Watch the intelligent AI orchestrator balance campus transformers, divert solar kilowatts, and eliminate phantom loads in real time.
                        </p>

                        {/* Interactive Metric Strip */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.75rem',
                            marginBottom: '1.75rem'
                        }}>
                            {[
                                { val: '28.4%', label: 'Weekly Energy Saved' },
                                { val: '< 20ms', label: 'IoT Relay Latency' },
                                { val: '99.9%', label: 'Grid Uptime' }
                            ].map((m, i) => (
                                <div key={i} style={{
                                    background: 'rgba(5, 12, 30, 0.6)',
                                    border: '1px solid rgba(0, 245, 155, 0.15)',
                                    borderRadius: '14px',
                                    padding: '0.75rem 0.5rem',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#00f59b', marginBottom: '0.15rem' }}>
                                        {m.val}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '500' }}>
                                        {m.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link to="/map" className="btn btn-primary" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.8rem 1.85rem',
                            borderRadius: '50px',
                            background: 'linear-gradient(135deg, #00f59b 0%, #059669 100%)',
                            color: '#02090c',
                            fontWeight: '700',
                            textDecoration: 'none',
                            boxShadow: '0 0 20px rgba(0, 245, 155, 0.3)'
                        }}>
                            <span>Open Spatial Campus Map</span>
                            <FiArrowRight size={18} />
                        </Link>
                    </div>

                    {/* Right interactive dashboard preview (Lightweight, zero lag) */}
                    <div style={{
                        position: 'relative',
                        borderRadius: '20px',
                        background: 'rgba(5, 12, 30, 0.75)',
                        border: '1px solid rgba(0, 245, 155, 0.25)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 245, 155, 0.12)',
                        padding: '1.25rem',
                        backdropFilter: 'blur(16px)'
                    }}>
                        {/* Simulation Bar Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.85rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            paddingBottom: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f59b', boxShadow: '0 0 8px #00f59b' }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', letterSpacing: '0.06em' }}>
                                    CAMPUS DIGITAL TWIN — ACTIVE NODES
                                </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#00f59b', background: 'rgba(0, 245, 155, 0.12)', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                                Interactive Relays
                            </span>
                        </div>

                        {/* Interactive Room Relays Grid (Compact & Sleek) */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.65rem',
                            marginBottom: '0.9rem'
                        }}>
                            {Object.entries(simulatedRooms).map(([name, data]) => (
                                <div
                                    key={name}
                                    onClick={() => toggleSimRoom(name)}
                                    style={{
                                        background: data.active ? 'rgba(0, 245, 155, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                        border: data.active ? '1px solid rgba(0, 245, 155, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px',
                                        padding: '0.6rem 0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: data.active ? '#ffffff' : '#94a3b8' }}>
                                            {name}
                                        </span>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '700',
                                            padding: '0.1rem 0.45rem',
                                            borderRadius: '8px',
                                            background: data.active ? '#00f59b' : 'rgba(255,255,255,0.1)',
                                            color: data.active ? '#020617' : '#94a3b8'
                                        }}>
                                            {data.active ? 'ONLINE' : 'SHUT OFF'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)' }}>
                                        <span>Load: <strong style={{ color: '#00f59b' }}>{data.load}</strong></span>
                                        <span>Temp: {data.temp}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Visual Preview Snapshot Card (Properly Sized & Constrained) */}
                        <div style={{
                            position: 'relative',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            border: '1px solid rgba(0, 245, 155, 0.25)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                            maxHeight: '280px',
                            background: '#02090c'
                        }}>
                            <img 
                                src="/assets/dashboard_preview.png" 
                                alt="Dashboard Preview" 
                                style={{ 
                                    width: '100%', 
                                    height: '280px',
                                    objectFit: 'cover',
                                    objectPosition: 'center 20%',
                                    display: 'block', 
                                    opacity: 0.9 
                                }} 
                            />
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(2, 9, 12, 0.96) 0%, rgba(2, 6, 23, 0.2) 40%, transparent 70%)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                padding: '0.75rem 1rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '600' }}>
                                        ⚡ Campus Power Graph: 11.6 kW Nominal
                                    </span>
                                    <Link to="/map" style={{
                                        fontSize: '0.75rem',
                                        color: '#00f59b',
                                        textDecoration: 'none',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem'
                                    }}>
                                        Inspect Map <FiChevronRight />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Part 3: Engineered for Autonomous Efficiency (High-Tech 3-Column Glass Grid) */}
            <section style={{
                padding: '7rem 6%',
                position: 'relative',
                background: 'rgba(2, 9, 12, 0.96)',
                borderBottom: '1px solid rgba(0, 245, 155, 0.15)'
            }}>
                <div style={{ maxWidth: '1360px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 1rem',
                        background: 'rgba(0, 245, 155, 0.08)',
                        border: '1px solid rgba(0, 245, 155, 0.25)',
                        borderRadius: '50px',
                        marginBottom: '1.25rem'
                    }}>
                        <FiCpu color="#00f59b" size={14} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.1em', color: '#34d399', textTransform: 'uppercase' }}>
                            NEXT-GEN CAPABILITIES
                        </span>
                    </div>

                    <h2 style={{
                        fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
                        fontWeight: '900',
                        marginBottom: '1.2rem',
                        letterSpacing: '-0.03em',
                        color: '#ffffff'
                    }}>
                        Engineered for Autonomous Efficiency
                    </h2>
                    <p style={{
                        color: 'rgba(226, 232, 240, 0.75)',
                        fontSize: '1.15rem',
                        maxWidth: '650px',
                        margin: '0 auto 4rem auto',
                        lineHeight: 1.6
                    }}>
                        Transform raw classroom electrical signals into automated energy savings without relying on manual audits.
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '2rem',
                        textAlign: 'left'
                    }}>
                        {features.map((feature, idx) => {
                            const isActive = idx === activeFeature;
                            return (
                                <motion.div
                                    key={idx}
                                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                                    onClick={() => setActiveFeature(idx)}
                                    style={{
                                        background: isActive ? 'rgba(5, 15, 35, 0.85)' : 'rgba(5, 12, 30, 0.5)',
                                        padding: '2.5rem',
                                        borderRadius: '24px',
                                        border: isActive ? '1px solid rgba(0, 245, 155, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        boxShadow: isActive ? '0 25px 50px -10px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 245, 155, 0.15)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        backdropFilter: 'blur(16px)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '16px',
                                            background: isActive ? 'linear-gradient(135deg, #00f59b 0%, #059669 100%)' : 'rgba(0, 245, 155, 0.1)',
                                            color: isActive ? '#020617' : '#00f59b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: isActive ? '0 0 20px rgba(0, 245, 155, 0.5)' : 'none',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {feature.icon}
                                        </div>

                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            color: '#00f59b',
                                            background: 'rgba(0, 245, 155, 0.1)',
                                            padding: '0.3rem 0.75rem',
                                            borderRadius: '20px',
                                            border: '1px solid rgba(0, 245, 155, 0.2)'
                                        }}>
                                            {feature.metric}
                                        </span>
                                    </div>

                                    <div style={{
                                        fontSize: '0.78rem',
                                        fontWeight: '700',
                                        color: 'rgba(148, 163, 184, 0.8)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        marginBottom: '0.5rem'
                                    }}>
                                        {feature.tag}
                                    </div>

                                    <h3 style={{
                                        fontSize: '1.45rem',
                                        fontWeight: '800',
                                        color: '#ffffff',
                                        marginBottom: '0.85rem',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {feature.title}
                                    </h3>

                                    <p style={{
                                        fontSize: '0.98rem',
                                        color: 'rgba(226, 232, 240, 0.75)',
                                        lineHeight: 1.6,
                                        margin: 0
                                    }}>
                                        {feature.desc}
                                    </p>

                                    {isActive && (
                                        <motion.div
                                            initial={{ width: '0%' }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 5, ease: "linear" }}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                height: '3px',
                                                background: 'linear-gradient(90deg, #00f59b, #22e6b6)',
                                                boxShadow: '0 0 10px #00f59b'
                                            }}
                                        />
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Part 4: Experience Intelligent Anomaly Detection & Alerts */}
            <section style={{
                padding: '7rem 6%',
                position: 'relative',
                background: 'radial-gradient(circle at 80% 50%, rgba(0, 245, 155, 0.05) 0%, rgba(2, 9, 12, 0.98) 70%)',
                borderBottom: '1px solid rgba(0, 245, 155, 0.15)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 1rem',
                        background: 'rgba(0, 245, 155, 0.08)',
                        border: '1px solid rgba(0, 245, 155, 0.25)',
                        borderRadius: '50px',
                        marginBottom: '1.25rem'
                    }}>
                        <FiAlertCircle color="#00f59b" size={14} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.1em', color: '#34d399', textTransform: 'uppercase' }}>
                            EVENT DRIVEN INCIDENT RESPONSE
                        </span>
                    </div>

                    <h2 style={{
                        fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
                        fontWeight: '900',
                        letterSpacing: '-0.03em',
                        color: '#ffffff',
                        marginBottom: '1.2rem'
                    }}>
                        Experience Intelligent Alerts
                    </h2>
                    <p style={{
                        fontSize: '1.15rem',
                        color: 'rgba(226, 232, 240, 0.75)',
                        maxWidth: '640px',
                        margin: '0 auto 3.5rem auto',
                        lineHeight: 1.6
                    }}>
                        Click any simulated anomaly scenario below to experience how SmartClass intercepts waste automatically.
                    </p>

                    {/* Scenario Selector Chips */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginBottom: '3rem'
                    }}>
                        {alertScenarios.map((sc, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveScenario(i)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.75rem 1.4rem',
                                    borderRadius: '50px',
                                    fontSize: '0.92rem',
                                    fontWeight: '700',
                                    background: activeScenario === i ? 'rgba(0, 245, 155, 0.15)' : 'rgba(5, 12, 30, 0.6)',
                                    color: activeScenario === i ? '#00f59b' : '#94a3b8',
                                    border: activeScenario === i ? '1px solid #00f59b' : '1px solid rgba(255, 255, 255, 0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: activeScenario === i ? '0 0 15px rgba(0, 245, 155, 0.2)' : 'none'
                                }}
                            >
                                {sc.icon}
                                <span>{sc.title}</span>
                            </button>
                        ))}
                    </div>

                    {/* Alert Interactive Simulator Display */}
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        borderRadius: '24px',
                        background: 'rgba(5, 12, 30, 0.8)',
                        border: '1px solid rgba(0, 245, 155, 0.3)',
                        boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 30px rgba(0, 245, 155, 0.1)',
                        padding: '2.5rem',
                        backdropFilter: 'blur(20px)',
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem', marginBottom: '1.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f59b', boxShadow: '0 0 8px #00f59b' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#e2e8f0' }}>
                                    REAL-TIME EVENT ORCHESTRATOR
                                </span>
                            </div>
                            <span style={{ fontSize: '0.82rem', color: '#00f59b', fontWeight: '700' }}>
                                {alertScenarios[activeScenario].status}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '2rem',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                    Detected Target
                                </div>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.4rem' }}>
                                    {alertScenarios[activeScenario].room}
                                </h3>
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#00f59b', marginBottom: '1.25rem' }}>
                                    {alertScenarios[activeScenario].metric}
                                </div>
                                <p style={{ color: 'rgba(226, 232, 240, 0.85)', fontSize: '0.98rem', lineHeight: 1.6, margin: 0 }}>
                                    {alertScenarios[activeScenario].action}
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(2, 6, 23, 0.7)',
                                border: '1px solid rgba(0, 245, 155, 0.2)',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                                color: '#94a3b8',
                                lineHeight: 1.7
                            }}>
                                <div style={{ color: '#00f59b', fontWeight: '700', marginBottom: '0.5rem' }}>
                                    &gt; IoT Edge Broker Output
                                </div>
                                <div>[LOG] Anomaly detected: {alertScenarios[activeScenario].title}</div>
                                <div>[METRIC] Delta load: {alertScenarios[activeScenario].metric}</div>
                                <div>[EDGE] Dispatching MQTT command to micro-relays...</div>
                                <div style={{ color: '#00f59b' }}>[SUCCESS] State transitioned to OPTIMAL (0ms timeout)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Part 5: The Engineering Intelligence Team */}
            <section id="intelligence-team" style={{ 
                padding: '7rem 6% 5rem 6%',
                background: 'radial-gradient(circle at center top, rgba(0, 245, 155, 0.08) 0%, #020617 80%)', 
                borderBottom: '1px solid rgba(0, 245, 155, 0.15)',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 1rem',
                        background: 'rgba(0, 245, 155, 0.08)',
                        border: '1px solid rgba(0, 245, 155, 0.25)',
                        borderRadius: '50px',
                        marginBottom: '1.25rem'
                    }}>
                        <FiUser color="#00f59b" size={14} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.1em', color: '#34d399', textTransform: 'uppercase' }}>
                            FINAL YEAR PROJECT RESEARCH TEAM
                        </span>
                    </div>

                    <h2 style={{
                        fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
                        fontWeight: '900',
                        marginBottom: '1.2rem',
                        letterSpacing: '-0.03em',
                        color: '#ffffff'
                    }}>
                        The <span style={{
                            background: 'linear-gradient(135deg, #00f59b 0%, #22e6b6 50%, #06b6d4 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>Intelligence</span> Team
                    </h2>
                    <p style={{
                        color: 'rgba(226, 232, 240, 0.75)',
                        fontSize: '1.15rem',
                        maxWidth: '650px',
                        margin: '0 auto 4rem auto',
                        lineHeight: 1.6
                    }}>
                        Department of Computer Systems Engineering — Final Year Project (2026).
                    </p>
                    
                    {/* Team Members Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem',
                        marginBottom: '4.5rem'
                    }}>
                        {teamMembers.map((member, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                                style={{
                                    background: member.isLeader ? 'rgba(6, 18, 42, 0.85)' : 'rgba(5, 12, 30, 0.65)',
                                    border: member.isLeader ? '1px solid rgba(0, 245, 155, 0.55)' : '1px solid rgba(0, 245, 155, 0.22)',
                                    borderRadius: '24px',
                                    padding: '2.5rem 2rem',
                                    textAlign: 'center',
                                    boxShadow: member.isLeader 
                                        ? '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(0, 245, 155, 0.2)' 
                                        : '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 25px rgba(0, 245, 155, 0.08)',
                                    backdropFilter: 'blur(16px)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {member.isLeader && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '14px',
                                        right: '16px',
                                        background: 'rgba(0, 245, 155, 0.15)',
                                        border: '1px solid rgba(0, 245, 155, 0.45)',
                                        color: '#00f59b',
                                        fontSize: '0.72rem',
                                        fontWeight: '800',
                                        padding: '0.2rem 0.65rem',
                                        borderRadius: '20px',
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase'
                                    }}>
                                        Group Leader
                                    </div>
                                )}
                                <div style={{
                                    width: '72px',
                                    height: '72px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00f59b 0%, #059669 100%)',
                                    color: '#02090c',
                                    fontSize: '1.75rem',
                                    fontWeight: '900',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem auto',
                                    boxShadow: '0 0 25px rgba(0, 245, 155, 0.5)'
                                }}>
                                    {member.name.charAt(0)}
                                </div>

                                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.35rem' }}>
                                    {member.name}
                                </h3>

                                <div style={{
                                    display: 'inline-block',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    color: '#00f59b',
                                    background: 'rgba(0, 245, 155, 0.1)',
                                    padding: '0.25rem 0.8rem',
                                    borderRadius: '50px',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(0, 245, 155, 0.2)'
                                }}>
                                    Roll No: {member.roll}
                                </div>

                                <div style={{
                                    fontSize: '0.92rem',
                                    fontWeight: '600',
                                    color: '#e2e8f0',
                                    marginBottom: '0.75rem'
                                }}>
                                    {member.role}
                                </div>

                                <p style={{
                                    fontSize: '0.86rem',
                                    color: '#94a3b8',
                                    lineHeight: 1.55,
                                    margin: 0
                                }}>
                                    {member.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                    
                    {/* Project Supervision Pill */}
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '1.5rem', 
                        padding: '1.1rem 2.5rem', 
                        background: 'rgba(5, 12, 30, 0.8)', 
                        border: '1px solid rgba(0, 245, 155, 0.35)', 
                        borderRadius: '100px',
                        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(0, 245, 155, 0.15)',
                        backdropFilter: 'blur(16px)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f59b', boxShadow: '0 0 10px #00f59b' }} />
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Project Supervision
                            </span>
                        </div>
                        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)' }}></div>
                        <span style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: '800' }}>
                            Madam <span style={{ color: '#00f59b' }}>Anam Ali</span>
                        </span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                padding: '6rem 6% 3rem 6%',
                background: '#02090c',
                borderTop: '1px solid rgba(0, 245, 155, 0.15)'
            }}>
                <div style={{
                    maxWidth: '1280px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '4rem',
                    marginBottom: '4rem'
                }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <SmartLogo size={36} className="mb-4" />
                        <p style={{ color: '#94a3b8', lineHeight: '1.7', maxWidth: '380px', fontSize: '0.95rem' }}>
                            Building the next generation of energy-efficient educational environments through advanced AI edge computing and real-time autonomous load balancing.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f59b', boxShadow: '0 0 8px #00f59b' }} />
                            <span style={{ fontSize: '0.82rem', color: '#00f59b', fontWeight: '600' }}>
                                System Status: All Nodes Nominal
                            </span>
                        </div>
                    </div>

                    <div>
                        <h5 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff' }}>
                            Platform
                        </h5>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <li><Link to="/map" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>Spatial Campus Map</Link></li>
                            <li><Link to="/predictions" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>AI Insights & Predictions</Link></li>
                            <li><Link to="/ml-lab" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>Research Lab & Datasets</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff' }}>
                            FYP Project
                        </h5>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <li><Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>Administrator Portal</Link></li>
                            <li><Link to="/signup" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>Create Account</Link></li>
                            <li><a href="#live-simulation" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.92rem' }}>Simulation Overview</a></li>
                        </ul>
                    </div>
                </div>

                <div style={{
                    paddingTop: '2.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    maxWidth: '1280px',
                    margin: '0 auto'
                }}>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                        © {new Date().getFullYear()} SmartEnergy (Final Year Project). Developed for Smart Campuses.
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>React 18 + Vite</span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>•</span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Python Flask REST API</span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>•</span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Edge Microgrid</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
