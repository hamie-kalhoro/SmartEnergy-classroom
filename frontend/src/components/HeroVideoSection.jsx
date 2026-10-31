import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiArrowRight, FiBarChart2, FiCpu, FiSliders } from 'react-icons/fi';
import { ChargeArc } from './ChargeEffects';
import { TbBooks, TbSchool, TbFlask, TbBuildingBank, TbBallFootball } from 'react-icons/tb';
import './HeroVideoSection.css';

// Each node card sits exactly over the label baked into hero_campus_v2.mp4
// (positions are % of the 1000x596 video frame), so the video's own labels are hidden.
const CAMPUS_NODES = [
  { id: 'library', name: 'Library', load: 2.1, icon: <TbBooks />, box: { left: 7.0, top: 23.6, width: 25.0, height: 13.8 } },
  { id: 'classrooms', name: 'Classroom Block', short: 'Classrooms', load: 3.4, icon: <TbSchool />, box: { left: 38.4, top: 22.3, width: 27.5, height: 14.0 } },
  { id: 'labs', name: 'Science Lab', short: 'Labs', load: 5.2, icon: <TbFlask />, box: { left: 70.5, top: 22.3, width: 26.0, height: 14.2 } },
  { id: 'admin', name: 'Admin Block', short: 'Admin', load: 1.8, icon: <TbBuildingBank />, box: { left: 1.4, top: 80.2, width: 25.0, height: 14.6 } },
  { id: 'outdoor', name: 'Sports Complex', short: 'Sports', load: 0.6, icon: <TbBallFootball />, box: { left: 69.5, top: 82.2, width: 27.0, height: 14.6 } }
];

// Arcs jump only between two powered buildings. Coordinates are in the 1000x596 video frame.
const CAMPUS_ARCS = [
  { from: 'library', to: 'classrooms', d: 'M320 182 L336 170 L346 192 L360 168 L370 186 L384 175' },
  { from: 'classrooms', to: 'labs', d: 'M659 175 L671 190 L681 164 L693 187 L705 175' },
  { from: 'library', to: 'admin', slow: true, d: 'M150 223 L138 262 L162 300 L132 345 L158 395 L130 438 L142 478' },
  { from: 'labs', to: 'outdoor', slow: true, d: 'M835 217 L852 262 L822 312 L850 360 L818 412 L842 455 L830 490' }
];

const FEATURES = [
  { icon: <FiCpu />, title: 'Occupancy Prediction', desc: 'Estimates how full each session will be' },
  { icon: <FiSliders />, title: 'Device Recommendations', desc: 'Suggests lights, fans and AC settings' },
  { icon: <FiAlertTriangle />, title: 'Load Alerts', desc: 'Flags rooms above their recommended load' },
  { icon: <FiBarChart2 />, title: 'Energy Reports', desc: 'Shows estimated kWh savings' }
];

export const Toggle = ({ on, onClick, label }) => (
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
  const [nodesOn, setNodesOn] = useState({ library: true, classrooms: true, labs: true, admin: true, outdoor: false });

  const toggleNode = (id) => setNodesOn(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <header className="hero-lightning-section hero-section">
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
              <span className="hero-title-accent">Start Saving the Future.</span>
            </h1>

            <p className="hero-subtitle">
              SmartClass predicts classroom occupancy and recommends how lights, fans and
              air conditioning should run, so campus teams can see where energy is being wasted.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="hero-btn-primary">
                <span>Get started</span>
                <FiArrowRight size={18} />
              </Link>
              <button
                type="button"
                className="hero-btn-ghost"
                onClick={() => {
                  const el = document.getElementById('live-simulation');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>See the demo</span>
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
            <div className="hero-campus">
              <video
                className="hero-campus-video"
                src="/assets/hero_campus_v2.mp4"
                autoPlay
                loop
                muted
                playsInline
              />

              <svg className="hero-campus-arcs" viewBox="0 0 1000 596" preserveAspectRatio="none" aria-hidden="true">
                {CAMPUS_ARCS.filter(arc => nodesOn[arc.from] && nodesOn[arc.to]).map(arc => (
                  <ChargeArc key={`${arc.from}-${arc.to}`} d={arc.d} slow={arc.slow} />
                ))}
              </svg>

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
                      <span className="hero-node-name">
                        <span className="hero-node-long">{node.name}</span>
                        <span className="hero-node-short">{node.short || node.name}</span>
                      </span>
                      <span className="hero-node-load">{node.load.toFixed(1)} kW</span>
                    </span>
                    <Toggle on={on} onClick={() => toggleNode(node.id)} label={`${node.name} power`} />
                  </div>
                );
              })}
            </div>
            <p className="hero-campus-note">Simulated preview with sample values.</p>
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
