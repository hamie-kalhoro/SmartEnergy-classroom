import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBarChart2, FiCpu, FiSliders } from 'react-icons/fi';
import HeroVideoSection, { Toggle } from '../components/HeroVideoSection';
import { ChargeLine } from '../components/ChargeEffects';
import { evaluateLoadAlert } from '../components/LoadAlerts';
import Wordmark from '../components/Wordmark';
import './LandingPage.css';

const STATS = [
    { value: 'Random Forest', label: 'Occupancy model' },
    { value: '5', label: 'Occupancy levels' },
    { value: '19', label: 'Rooms on the campus map' }
];

const DEMO_ROOMS = [
    { name: 'Lab CS-06', present: 0, seats: 40, kw: 2.4, on: true },
    { name: 'Seminar Hall', present: 0, seats: 120, kw: 3.6, on: false },
    { name: 'AI Lab', present: 32, seats: 40, kw: 3.1, on: true },
    { name: 'Library', present: 18, seats: 60, kw: 1.8, on: true }
];

const CAPABILITIES = [
    {
        icon: <FiCpu />,
        title: 'Occupancy prediction',
        desc: 'A Random Forest model estimates how full each session will be from the day, time slot, batch, section and attendance history.'
    },
    {
        icon: <FiSliders />,
        title: 'Device recommendations',
        desc: 'Occupancy and climate rules turn each prediction into suggested settings for lights, fans and air conditioning.'
    },
    {
        icon: <FiBarChart2 />,
        title: 'Energy reporting',
        desc: 'Administrators can review estimated kWh savings and send an energy report based on the recommended settings.'
    }
];

const ALERT_SCENARIOS = [
    {
        title: 'Empty room, devices on',
        room: 'Lab CS-04',
        liveKw: 2.8,
        planKw: 0.1,
        reason: 'No one is present, but the air conditioning, fans and lights are still running.',
        action: 'Switch off the devices in this room.'
    },
    {
        title: 'More lighting than needed',
        room: 'Classroom 12',
        liveKw: 0.9,
        planKw: 0.6,
        reason: 'A small group is using one side of the room, but every light is on.',
        action: 'Keep only the occupied zones lit.'
    },
    {
        title: 'Within recommendation',
        room: 'Seminar Hall',
        liveKw: 1.4,
        planKw: 1.35,
        reason: 'The room is drawing close to its recommended load, so a small difference is ignored.',
        action: 'No action needed.'
    }
];

const SEVERITY_LABEL = { critical: 'Critical', warning: 'Warning' };

const TEAM_MEMBERS = [
    {
        name: 'Hamid Ali',
        roll: '22CS002',
        role: 'Lead Architecture & IoT Systems',
        desc: 'Led the backend architecture and ESP32 hardware integration.',
        isLeader: true
    },
    {
        name: 'Karan Kumar',
        roll: '22CS008',
        role: 'ML Modeling & Prediction',
        desc: 'Built the Random Forest occupancy model.'
    },
    {
        name: 'Mir Liaquat',
        roll: '22CS018',
        role: 'Frontend Systems & UI/UX',
        desc: 'Crafted interactive spatial digital twin campus map, analytics dashboards, and reactive states.'
    }
];

const SectionHeader = ({ eyebrow, title, children }) => (
    <header className="lp-section-header">
        <p className="lp-eyebrow">{eyebrow}</p>
        <h2 className="lp-heading">{title}</h2>
        {children && <p className="lp-lead">{children}</p>}
    </header>
);

const LandingPage = () => {
    const pageRef = useRef(null);
    const [scrolled, setScrolled] = useState(false);
    const [activeScenario, setActiveScenario] = useState(0);
    const [demoRooms, setDemoRooms] = useState(DEMO_ROOMS);

    // Keeps the enterprise light theme (theme-light.css) off this page.
    useLayoutEffect(() => {
        document.documentElement.setAttribute('data-page', 'landing');
        return () => document.documentElement.removeAttribute('data-page');
    }, []);

    // The app shell scrolls inside .main-content, not the window.
    useEffect(() => {
        const scroller = pageRef.current?.closest('.main-content');
        if (!scroller) return undefined;
        const handleScroll = () => setScrolled(scroller.scrollTop > 40);
        scroller.addEventListener('scroll', handleScroll, { passive: true });
        return () => scroller.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleDemoRoom = (name) => {
        setDemoRooms(prev => prev.map(room => (room.name === name ? { ...room, on: !room.on } : room)));
    };

    const totalKw = demoRooms.reduce((sum, room) => sum + (room.on ? room.kw : 0), 0);
    const scenario = ALERT_SCENARIOS[activeScenario];
    const scenarioAlert = evaluateLoadAlert(scenario.room, null, null, scenario.liveKw, scenario.planKw);

    return (
        <div className="landing-page" ref={pageRef}>
            <nav className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`} aria-label="Main">
                <div className="landing-nav-inner">
                    <Wordmark className="landing-nav-brand" />

                    <div className="landing-nav-links">
                        <a href="#live-simulation" className="landing-nav-link landing-nav-section">Platform</a>
                        <a href="#capabilities" className="landing-nav-link landing-nav-section">Capabilities</a>
                        <a href="#alerts" className="landing-nav-link landing-nav-section">Alerts</a>
                        <a href="#intelligence-team" className="landing-nav-link landing-nav-section">Team</a>
                        <Link to="/map" className="landing-nav-link landing-nav-map">Campus Map</Link>
                    </div>

                    <div className="landing-nav-actions">
                        <Link to="/login" className="landing-nav-link">Sign in</Link>
                        <Link to="/signup" className="landing-nav-cta">Get started</Link>
                    </div>
                </div>
                <ChargeLine className="landing-nav-charge" />
            </nav>

            <HeroVideoSection />

            {/* Platform: simulated room demo */}
            <section id="live-simulation" className="lp-section">
                <div className="lp-container lp-split">
                    <div>
                        <SectionHeader eyebrow="Platform" title="See where a campus is using more than it needs">
                            SmartClass compares what each room is using with what its occupancy calls for, so staff know where to act. Decisions stay with people.
                        </SectionHeader>

                        <dl className="lp-stats">
                            {STATS.map(stat => (
                                <div key={stat.label} className="lp-stat">
                                    <dt>{stat.label}</dt>
                                    <dd>{stat.value}</dd>
                                </div>
                            ))}
                        </dl>

                        <Link to="/login" className="lp-btn">
                            <span>Sign in to open the campus map</span>
                            <FiArrowRight aria-hidden="true" />
                        </Link>
                    </div>

                    <div className="lp-panel lp-panel-live">
                        <ChargeLine className="lp-panel-charge" />
                        <div className="lp-panel-head">
                            <h3>Room load demo</h3>
                            <span className="lp-tag">Simulated</span>
                        </div>

                        <ul className="lp-demo-list">
                            {demoRooms.map(room => {
                                const wasteful = room.on && room.present === 0;
                                return (
                                    <li key={room.name} className="lp-demo-row">
                                        <div className="lp-demo-room">
                                            <strong>{room.name}</strong>
                                            <span>{room.present} of {room.seats} present</span>
                                        </div>
                                        <span className={`lp-demo-status ${wasteful ? 'is-warning' : ''}`}>
                                            {!room.on ? 'Off' : wasteful ? 'Empty, devices on' : 'In use'}
                                        </span>
                                        <span className="lp-demo-load">{(room.on ? room.kw : 0).toFixed(1)} kW</span>
                                        <Toggle on={room.on} onClick={() => toggleDemoRoom(room.name)} label={`${room.name} devices`} />
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="lp-demo-total" aria-live="polite">
                            <span>Total load</span>
                            <strong key={totalKw} className="lp-total-value">{totalKw.toFixed(1)} kW</strong>
                        </div>
                        <p className="lp-note">Sample values for illustration, not live readings.</p>
                    </div>
                </div>
            </section>

            {/* Capabilities */}
            <section id="capabilities" className="lp-section">
                <div className="lp-container">
                    <SectionHeader eyebrow="Capabilities" title="From attendance data to practical recommendations" />

                    <div className="lp-card-grid">
                        {CAPABILITIES.map(item => (
                            <article key={item.title} className="lp-card">
                                <span className="lp-card-icon" aria-hidden="true">{item.icon}</span>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Load alerts, graded by the same rule as the campus map */}
            <section id="alerts" className="lp-section">
                <div className="lp-container">
                    <SectionHeader eyebrow="Load alerts" title="Know when a room goes over its recommended load">
                        The campus map compares each room's current load with its recommendation and raises an alert when the difference matters.
                    </SectionHeader>

                    <div className="lp-tabs" role="group" aria-label="Alert examples">
                        {ALERT_SCENARIOS.map((item, i) => (
                            <button
                                key={item.title}
                                type="button"
                                className={`lp-tab ${activeScenario === i ? 'is-active' : ''}`}
                                aria-pressed={activeScenario === i}
                                onClick={() => setActiveScenario(i)}
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>

                    <div className="lp-panel lp-panel-live lp-alert">
                        <ChargeLine className="lp-panel-charge" />
                        <div className="lp-panel-head">
                            <h3>{scenario.room}</h3>
                            <span className={`lp-severity ${scenarioAlert ? `is-${scenarioAlert.severity}` : ''}`}>
                                {scenarioAlert ? SEVERITY_LABEL[scenarioAlert.severity] : 'No alert'}
                            </span>
                        </div>

                        <dl className="lp-alert-metrics">
                            <div>
                                <dt>Current load</dt>
                                <dd>{scenario.liveKw.toFixed(2)} kW</dd>
                            </div>
                            <div>
                                <dt>Recommended</dt>
                                <dd>{scenario.planKw.toFixed(2)} kW</dd>
                            </div>
                            <div>
                                <dt>Difference</dt>
                                <dd>+{(scenario.liveKw - scenario.planKw).toFixed(2)} kW</dd>
                            </div>
                        </dl>

                        <div className="lp-alert-detail">
                            <p><strong>What happened</strong>{scenario.reason}</p>
                            <p><strong>Suggested action</strong>{scenario.action}</p>
                        </div>
                        <p className="lp-note">Example values. Room loads on the campus map are currently simulated, with no live meter connected.</p>
                    </div>
                </div>
            </section>

            {/* Team */}
            <section id="intelligence-team" className="lp-section">
                <div className="lp-container">
                    <SectionHeader eyebrow="Final Year Project" title="Project team">
                        Department of Computer Systems Engineering, Final Year Project (2026).
                    </SectionHeader>

                    <div className="lp-card-grid">
                        {TEAM_MEMBERS.map(member => (
                            <article key={member.roll} className="lp-card">
                                <div className="lp-member-head">
                                    <span className="lp-avatar" aria-hidden="true">{member.name.charAt(0)}</span>
                                    <div>
                                        <h3>{member.name}</h3>
                                        <span className="lp-member-roll">Roll No: {member.roll}</span>
                                    </div>
                                    {member.isLeader && <span className="lp-tag lp-member-tag">Group Leader</span>}
                                </div>
                                <p className="lp-member-role">{member.role}</p>
                                <p>{member.desc}</p>
                            </article>
                        ))}
                    </div>

                    <p className="lp-supervisor">
                        <span>Project Supervision</span>
                        <strong>Madam Anam Ali</strong>
                    </p>
                </div>
            </section>

            <footer className="lp-footer">
                <div className="lp-container">
                    <div className="lp-footer-grid">
                        <div className="lp-footer-brand">
                            <Wordmark className="landing-nav-brand" />
                            <p>Occupancy prediction and energy recommendations for smarter classrooms.</p>
                        </div>

                        <div>
                            <h4>Platform</h4>
                            <ul>
                                <li><a href="#live-simulation">Room load demo</a></li>
                                <li><a href="#capabilities">Capabilities</a></li>
                                <li><a href="#alerts">Load alerts</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4>Project</h4>
                            <ul>
                                <li><a href="#intelligence-team">Team</a></li>
                                <li><Link to="/login">Sign in</Link></li>
                                <li><Link to="/signup">Create account</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <p>© {new Date().getFullYear()} SmartClass. Final Year Project.</p>
                        <p>React + Vite · Python Flask · scikit-learn</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
