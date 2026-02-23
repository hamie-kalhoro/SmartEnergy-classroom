import React from 'react';
import { motion } from 'framer-motion';

const EnergyBackground = () => {
    // Generate some random lines for the "Energy Flow"
    const lines = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        initialX: Math.random() * 100,
        initialY: Math.random() * 100,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 5,
        length: 50 + Math.random() * 150,
        angle: Math.random() > 0.5 ? 0 : 90 // Horizontal or Vertical
    }));

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            background: 'var(--bg-deep)',
            overflow: 'hidden',
            pointerEvents: 'none'
        }}>
            {/* Subtle Grid Base */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '100px 100px',
                opacity: 0.5
            }} />

            {/* Glowing Energy Pulses */}
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                    <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {lines.map((line) => (
                    <motion.rect
                        key={line.id}
                        x={line.angle === 0 ? '-20%' : `${line.initialX}%`}
                        y={line.angle === 90 ? '-20%' : `${line.initialY}%`}
                        width={line.angle === 0 ? line.length : 1.5}
                        height={line.angle === 90 ? line.length : 1.5}
                        fill="url(#pulse-gradient)"
                        filter="url(#glow)"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: [0, 0.8, 0],
                            x: line.angle === 0 ? ['-20%', '120%'] : `${line.initialX}%`,
                            y: line.angle === 90 ? ['-20%', '120%'] : `${line.initialY}%`,
                        }}
                        transition={{
                            duration: line.duration,
                            delay: line.delay,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />
                ))}
            </svg>

            {/* Ambient Radial Gradients (Subtle Glows) */}
            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.2, 1]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    top: '20%',
                    left: '10%',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(0, 210, 106, 0.05) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(100px)'
                }}
            />
            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1.2, 1, 1.2]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '5%',
                    width: '800px',
                    height: '800px',
                    background: 'radial-gradient(circle, rgba(0, 210, 106, 0.08) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(120px)'
                }}
            />
        </div>
    );
};

export default EnergyBackground;
