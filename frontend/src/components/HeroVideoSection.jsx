import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
import { TbBolt, TbBulb, TbLeaf, TbBooks, TbSchool, TbFlask, TbBuildingBank, TbBallFootball } from 'react-icons/tb';
import CyberGridLightningBackground from './CyberGridLightningBackground';
import './HeroVideoSection.css';

// Each node card sits exactly over the label baked into hero_campus_v2.mp4
// (positions are % of the 1000x596 video frame), so the video's own labels are hidden.
const CAMPUS_NODES = [
  { id: 'library', name: 'Library', load: 2.1, icon: <TbBooks />, box: { left: 7.0, top: 23.6, width: 25.0, height: 13.8 } },
  { id: 'classrooms', name: 'Classroom Block', load: 3.4, icon: <TbSchool />, box: { left: 38.4, top: 22.3, width: 27.5, height: 14.0 } },
  { id: 'labs', name: 'Science Lab', load: 5.2, icon: <TbFlask />, box: { left: 70.5, top: 22.3, width: 26.0, height: 14.2 } },
  { id: 'admin', name: 'Admin Block', load: 1.8, icon: <TbBuildingBank />, box: { left: 1.4, top: 80.2, width: 25.0, height: 14.6 } },
  { id: 'outdoor', name: 'Sports Complex', load: 0.6, icon: <TbBallFootball />, box: { left: 69.5, top: 82.2, width: 27.0, height: 14.6 } }
];

const FEATURES = [
  { icon: <TbBolt />, title: 'Real-time Monitoring', desc: 'Live energy usage tracking' },
  { icon: <TbBulb />, title: 'Smart Control', desc: 'Turn on/off devices remotely' },
  { icon: <TbLeaf />, title: 'Cost Reduction', desc: 'Optimize usage, save money' },
  { icon: <FiTrendingUp />, title: 'Sustainable Campus', desc: 'Lower carbon footprint' }
];

const Toggle = ({ on, onClick, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`hero-switch ${on ? 'on' : ''}`}
    onClick={onClick}
  >
    <span className="hero-switch-knob" />
  </button>
);

const HeroVideoSection = () => {
  const [isLightningActive, setIsLightningActive] = useState(false);
  const [campusPowered, setCampusPowered] = useState(false);
  const [nodesOn, setNodesOn] = useState({ library: true, classrooms: true, labs: true, admin: true, outdoor: false });

  const videoRef = useRef(null);

  // Synchronize lightning pulse with the video's timeline
  // Video starts dark (0-1.5s), lightning surges at ~2s, conduits power up
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLightningActive(true);
      setCampusPowered(true);
      setTimeout(() => setIsLightningActive(false), 500);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    if (time >= 1.6 && time <= 2.2 && !isLightningActive) {
      setIsLightningActive(true);
      setCampusPowered(true);
      setTimeout(() => setIsLightningActive(false), 400);
    } else if (time < 1.0 && campusPowered) {
      setCampusPowered(false);
    }
  };

  const toggleNode = (id) => setNodesOn(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <header className="hero-lightning-section hero-section">
      <CyberGridLightningBackground isLightningActive={isLightningActive} />

      {/* Lightning Flash Overlay Screen FX */}
      <AnimatePresence>
        {isLightningActive && (
          <motion.div
            className="hero-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <div className="hero-container">
        <div className="hero-grid">
          {/* Left Column: Heading, Subtext, CTAs */}
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="hero-eyebrow">Intelligent Energy Management for Campuses</p>

            <h1 className="hero-title">
              Stop Wasting Energy.<br />
              <span className="hero-title-green">Start Saving </span>
              <span className="hero-title-cyan">Future.</span>
            </h1>

            <p className="hero-subtitle">
              SmartClass monitors, controls, and optimizes your energy footprint in real time.
              Powering smarter decisions for a sustainable and efficient campus.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="hero-btn-primary">
                <span>Start Saving Now</span>
                <FiArrowRight size={20} />
              </Link>
              <button
                type="button"
                className="hero-btn-ghost"
                onClick={() => {
                  const el = document.getElementById('live-simulation');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <FaPlay size={14} className="hero-play-icon" />
                <span>Live Demo</span>
              </button>
            </div>
          </motion.div>

          {/* Right Column: Campus video with live node cards */}
          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-visual-glow" style={{ opacity: campusPowered ? 1 : 0.35 }} />

            <div className="hero-campus">
              <video
                ref={videoRef}
                className="hero-campus-video"
                src="/assets/hero_campus_v2.mp4"
                autoPlay
                loop
                muted
                playsInline
                onTimeUpdate={handleVideoTimeUpdate}
              />

              {CAMPUS_NODES.map(node => {
                const on = nodesOn[node.id];
                return (
                  <div
                    key={node.id}
                    className={`hero-node ${on ? 'on' : 'off'}`}
                    style={{
                      left: `${node.box.left}%`,
                      top: `${node.box.top}%`,
                      width: `${node.box.width}%`,
                      height: `${node.box.height}%`
                    }}
                  >
                    <span className="hero-node-icon">{node.icon}</span>
                    <span className="hero-node-text">
                      <span className="hero-node-name">{node.name}</span>
                      <span className="hero-node-load">{node.load.toFixed(1)} kW</span>
                    </span>
                    <Toggle on={on} onClick={() => toggleNode(node.id)} label={`${node.name} power`} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Bottom Feature Strip */}
        <motion.div
          className="hero-features"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {FEATURES.map(feat => (
            <div key={feat.title} className="hero-feature">
              <span className="hero-feature-icon">{feat.icon}</span>
              <div>
                <h4>{feat.title}</h4>
                <p>{feat.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
};

export default HeroVideoSection;
