import React, { useMemo } from 'react';

/**
 * EnergyBackground — Lightweight CSS-only animated background
 * Replaced 15 Framer Motion SVG animations with pure CSS @keyframes
 * for dramatically lower JS overhead.
 */
const EnergyBackground = ({ styleOverride = {}, className = "" }) => {
    const lines = useMemo(() => 
        Array.from({ length: 8 }, (_, i) => ({
            id: i,
            initialX: Math.random() * 100,
            initialY: Math.random() * 100,
            duration: 4 + Math.random() * 6,
            delay: Math.random() * 6,
            length: 60 + Math.random() * 120,
            isHorizontal: Math.random() > 0.5
        })), []
    );

    return (
        <div className={className} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            background: 'var(--bg-deep)',
            overflow: 'hidden',
            pointerEvents: 'none',
            ...styleOverride
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

            {/* CSS-animated energy pulses (no JS animation overhead) */}
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                    <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                    <style>{`
                        @keyframes pulseH {
                            0%   { transform: translateX(-25%); opacity: 0; }
                            20%  { opacity: 0.6; }
                            80%  { opacity: 0.6; }
                            100% { transform: translateX(120vw); opacity: 0; }
                        }
                        @keyframes pulseV {
                            0%   { transform: translateY(-25%); opacity: 0; }
                            20%  { opacity: 0.6; }
                            80%  { opacity: 0.6; }
                            100% { transform: translateY(120vh); opacity: 0; }
                        }
                    `}</style>
                </defs>

                {lines.map((line) => (
                    <rect
                        key={line.id}
                        x={line.isHorizontal ? '0' : `${line.initialX}%`}
                        y={line.isHorizontal ? `${line.initialY}%` : '0'}
                        width={line.isHorizontal ? line.length : 1.5}
                        height={line.isHorizontal ? 1.5 : line.length}
                        fill="url(#pulse-gradient)"
                        style={{
                            animation: `${line.isHorizontal ? 'pulseH' : 'pulseV'} ${line.duration}s ${line.delay}s linear infinite`,
                            willChange: 'transform, opacity'
                        }}
                    />
                ))}
            </svg>

            {/* Ambient Radial Gradients (pure CSS animation) */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(0, 210, 106, 0.05) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'ambientPulse 10s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '5%',
                width: '800px',
                height: '800px',
                background: 'radial-gradient(circle, rgba(0, 210, 106, 0.08) 0%, transparent 70%)',
                borderRadius: '50%',
                animation: 'ambientPulse 15s ease-in-out infinite',
            }} />

            <style>{`
                @keyframes ambientPulse {
                    0%, 100% { opacity: 0.3; }
                    50%      { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default EnergyBackground;
