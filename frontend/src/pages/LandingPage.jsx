import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SmartLogo from '../components/SmartLogo';
import EnergyBackground from '../components/EnergyBackground';

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
            background: 'transparent',
            color: 'var(--text)',
            overflowX: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            <EnergyBackground />
            {/* Navbar */}
            <nav style={{
                position: 'fixed',
                top: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 5%',
                zIndex: 100,
                background: 'rgba(5, 5, 5, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <SmartLogo size={28} />
                </div>
                <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                    <Link to="/map" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>Campus Map</Link>
                    <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>Sign In</Link>
                    <Link to="/signup" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '50px', fontWeight: '600' }}>Get Started</Link>
                </div>
            </nav>

            {/* Part 1: Hero Section (Picture 1) */}
            <header className="viewport-section" style={{
                textAlign: 'center',
                background: 'radial-gradient(circle at center, rgba(0, 210, 106, 0.08) 0%, transparent 70%)'
            }}>
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    style={{
                        fontSize: 'clamp(3.5rem, 10vw, 5.5rem)',
                        fontWeight: '900',
                        maxWidth: '1000px',
                        lineHeight: '1.0',
                        letterSpacing: '-0.05em',
                        color: 'var(--text)'
                    }}
                >
                    Stop Wasting Energy. <br />
                    <span style={{
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        display: 'inline-block'
                    }}>Start Saving Future.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{
                        marginTop: '2rem',
                        fontSize: '1.25rem',
                        maxWidth: '700px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.6'
                    }}
                >
                    Monitor, control, and optimize your energy footprint with the project SmartClass. Join the revolution of intelligent educational environments.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    style={{ marginTop: '3.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}
                >
                    <Link to="/signup" className="btn btn-primary btn-lg px-5" style={{ borderRadius: '50px', height: '56px', display: 'flex', alignItems: 'center' }}>
                        Start Saving Now
                    </Link>
                    <button
                        onClick={() => document.getElementById('live-simulation').scrollIntoView({ behavior: 'smooth' })}
                        className="btn btn-secondary btn-lg px-5"
                        style={{ borderRadius: '50px', height: '56px', display: 'flex', alignItems: 'center' }}
                    >
                        Live Demo
                    </button>
                </motion.div>
            </header>

            {/* Part 2: Live Simulation & Video (Picture 2) */}
            <section id="live-simulation" className="viewport-section" style={{
                background: 'var(--bg-surface)',
                padding: '0 10%'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4rem',
                    width: '100%',
                    maxWidth: '1200px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ flex: '1', minWidth: '300px', textAlign: 'left' }}>
                        <h2 style={{ fontSize: '3.5rem', fontWeight: '900', letterSpacing: '-0.04em', marginBottom: '1.5rem', color: 'var(--text)' }}>
                            Smarter <br />
                            <span style={{ color: 'var(--primary)' }}>Control Hub.</span>
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                            Watch our AI handle complex energy distribution patterns in real-time. A fully automated educational environment designed for the future.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary)' }}></div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Real-time Optimization</span>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        style={{
                            flex: '1.2',
                            minWidth: '300px',
                            position: 'relative'
                        }}
                    >
                        <div style={{
                            borderRadius: '24px',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border)',
                            boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                        }}>
                            {/* Glass Header Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '32px',
                                right: '32px',
                                background: 'rgba(5, 5, 5, 0.6)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(0, 210, 106, 0.3)',
                                color: 'var(--primary)',
                                padding: '0.65rem 1.25rem',
                                borderRadius: '50px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                zIndex: 10,
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                            }}>
                                <span className="pulse-green" style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 12px var(--primary)' }}></span>
                                LIVE PREVIEW
                            </div>

                            <div style={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                position: 'relative',
                                aspectRatio: '16 / 9',
                                background: '#0a0a0a',
                            }}>
                                <video
                                    src=""
                                    poster="/assets/dashboard_preview.png"
                                    autoPlay
                                    muted
                                    loop
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Part 3: Engineered for Efficiency (Picture 3) */}
            <section className="viewport-section" style={{
                padding: '8rem 5%',
                background: 'rgba(255, 255, 255, 0.01)',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>Engineered for Efficiency</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                        Watch how our system transforms raw classroom data into actionable energy savings.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
                    {features.map((feature, idx) => {
                        const isActive = idx === activeFeature;
                        return (
                            <motion.div
                                key={idx}
                                animate={{
                                    scale: isActive ? 1.02 : 1,
                                    opacity: isActive ? 1 : 0.6,
                                }}
                                transition={{ duration: 0.4 }}
                                style={{
                                    background: 'var(--bg-card)',
                                    padding: '3rem 2.5rem',
                                    borderRadius: 'var(--radius-xl)',
                                    border: isActive ? '1px solid rgba(0, 210, 106, 0.4)' : '1px solid var(--border)',
                                    textAlign: 'left',
                                    boxShadow: isActive ? 'var(--shadow-xl)' : 'var(--shadow-md)',
                                    maxWidth: '380px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
                                }}
                                onClick={() => setActiveFeature(idx)}
                            >
                                <div className="icon-box mb-4" style={{
                                    background: isActive ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                                    color: isActive ? 'white' : 'var(--text-muted)',
                                    width: '60px',
                                    height: '60px',
                                    fontSize: '1.75rem'
                                }}>
                                    {feature.icon}
                                </div>

                                <h3 style={{
                                    fontSize: '1.5rem',
                                    marginBottom: '1rem',
                                    fontWeight: '700',
                                    color: isActive ? 'var(--text)' : 'var(--text-secondary)'
                                }}>
                                    {feature.title}
                                </h3>

                                <p style={{
                                    lineHeight: '1.7',
                                    fontSize: '1rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: isActive ? '2rem' : '0'
                                }}>
                                    {feature.desc}
                                </p>

                                {isActive && (
                                    <motion.div
                                        initial={{ width: '0%' }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 4, ease: "linear" }}
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            height: '4px',
                                            background: 'var(--gradient-primary)',
                                            boxShadow: '0 0 12px var(--primary)'
                                        }}
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Part 4: Intelligent Alerts (Picture 4) */}
            <section className="viewport-section" style={{
                background: 'radial-gradient(circle at bottom right, rgba(0, 210, 106, 0.03) 0%, transparent 50%)'
            }}>
                <div style={{ maxWidth: '800px', textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>Experience Intelligent Alerts</h2>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        Notifications appear only when you need them. They guide you to shut down unused devices and vanish when the job is done.
                    </p>
                </div>

                <div style={{
                    width: '100%',
                    maxWidth: '1000px',
                    height: '500px',
                    background: 'url(/assets/dashboard_preview.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '24px',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-xl)'
                }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(5, 5, 5, 0.8)', backdropFilter: 'blur(8px)' }}></div>

                    <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
                        <small style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.3em',
                            color: 'var(--text-muted)',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            display: 'block',
                            marginBottom: '2rem'
                        }}>Interactive System Response</small>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={popups[0].id}
                                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: -20, opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                style={{
                                    background: 'var(--bg-card)',
                                    padding: '1.5rem 2rem',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border)',
                                    borderLeft: `4px solid ${popups[0].type === 'alert' ? 'var(--accent-pink)' : 'var(--primary)'}`,
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.5rem',
                                    maxWidth: '450px',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    background: popups[0].type === 'alert' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(0, 210, 106, 0.1)',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    color: popups[0].type === 'alert' ? 'var(--accent-pink)' : 'var(--primary)',
                                    fontSize: '1.5rem',
                                    display: 'flex'
                                }}>
                                    {popups[0].type === 'alert' ? <FiIcons.FiAlertCircle /> : <FiIcons.FiCheckCircle />}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                        {popups[0].type === 'alert' ? 'Critical Alert' : 'Optimization Result'}
                                    </h4>
                                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        {popups[0].text}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* Part 5: Premium Footer (Picture 5) */}
            <footer className="viewport-section" style={{
                padding: '6rem 5% 4rem 5%',
                background: 'var(--bg-deep)',
                borderTop: '1px solid var(--border)',
                justifyContent: 'flex-start' // Reset for footer
            }}>
                <div style={{
                    maxWidth: '1200px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '4rem',
                    marginBottom: '4rem'
                }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <SmartLogo size={36} className="mb-4" />
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '350px' }}>
                            Building the next generation of energy-efficient educational environments through advanced AI and real-time automation.
                        </p>
                    </div>

                    <div>
                        <h5 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Platform</h5>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li><Link to="/map" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Campus Map</Link></li>
                            <li><Link to="/predictions" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>AI Insights</Link></li>
                            <li><Link to="/ml-lab" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Research Lab</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company</h5>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li><a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>About Us</a></li>
                            <li><a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Ethical AI</a></li>
                            <li><a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Sustainability</a></li>
                        </ul>
                    </div>
                </div>

                <div style={{
                    paddingTop: '3rem',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        © {new Date().getFullYear()} SmartEnergy. Crafted for a greener future.
                    </p>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>Privacy Policy</a>
                        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
