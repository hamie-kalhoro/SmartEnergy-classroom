import React, { useMemo } from 'react';

/**
 * LuminousBackground
 * High-performance ambient background featuring:
 * 1. Luminous curved energy lines (emerald neon & electric cyan gradients)
 * 2. Sparking light particles (twinkling 4-point starbursts and floating glints)
 * 3. Volumetric glowing aura blooms behind the cards
 *
 * Excludes the left navigation panel by respecting sidebar width.
 */
const LuminousBackground = ({ isCollapsed = false, className = '' }) => {
    // Generate deterministic sparkle points so there is no layout jump
    const sparks = useMemo(() => [
        { id: 1, top: '12%', left: '18%', size: 16, delay: '0s', dur: '3.4s', color: '#00f59b' },
        { id: 2, top: '22%', left: '74%', size: 22, delay: '1.2s', dur: '4.1s', color: '#06b6d4' },
        { id: 3, top: '38%', left: '42%', size: 14, delay: '2.1s', dur: '3.8s', color: '#38bdf8' },
        { id: 4, top: '56%', left: '86%', size: 20, delay: '0.6s', dur: '4.5s', color: '#00f59b' },
        { id: 5, top: '68%', left: '26%', size: 18, delay: '1.8s', dur: '3.2s', color: '#34d399' },
        { id: 6, top: '82%', left: '62%', size: 15, delay: '2.7s', dur: '4.0s', color: '#06b6d4' },
        { id: 7, top: '15%', left: '50%', size: 12, delay: '0.9s', dur: '3.6s', color: '#52eea3' },
        { id: 8, top: '48%', left: '15%', size: 24, delay: '1.5s', dur: '4.8s', color: '#00f59b' },
        { id: 9, top: '75%', left: '88%', size: 16, delay: '2.4s', dur: '3.5s', color: '#38bdf8' },
        { id: 10, top: '28%', left: '32%', size: 10, delay: '3.1s', dur: '4.2s', color: '#ffffff' },
        { id: 11, top: '62%', left: '54%', size: 12, delay: '0.3s', dur: '3.9s', color: '#ffffff' },
        { id: 12, top: '88%', left: '36%', size: 18, delay: '1.7s', dur: '4.6s', color: '#00f59b' }
    ], []);

    const leftOffset = isCollapsed ? 'var(--sidebar-collapsed-w, 78px)' : 'var(--sidebar-w, 260px)';

    return (
        <div
            className={`luminous-bg-root ${className}`}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: leftOffset,
                zIndex: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'radial-gradient(ellipse at 50% 0%, #0a1322 0%, #050811 55%, #020408 100%)'
            }}
            aria-hidden="true"
        >
            <style>{`
                @keyframes luminousFlow1 {
                    0% { transform: translateY(0px) rotate(0deg) scale(1); }
                    50% { transform: translateY(-24px) rotate(1.5deg) scale(1.03); }
                    100% { transform: translateY(0px) rotate(0deg) scale(1); }
                }

                @keyframes luminousFlow2 {
                    0% { transform: translateY(0px) rotate(0deg) scale(1); }
                    50% { transform: translateY(28px) rotate(-1.5deg) scale(0.98); }
                    100% { transform: translateY(0px) rotate(0deg) scale(1); }
                }

                @keyframes luminousDash {
                    0% { stroke-dashoffset: 2400; }
                    100% { stroke-dashoffset: 0; }
                }

                @keyframes sparkTwinkle {
                    0%, 100% {
                        opacity: 0.15;
                        transform: scale(0.6) rotate(0deg);
                    }
                    50% {
                        opacity: 0.95;
                        transform: scale(1.15) rotate(90deg);
                        filter: drop-shadow(0 0 12px currentColor);
                    }
                }

                @keyframes bloomBreathe {
                    0%, 100% {
                        opacity: 0.45;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.75;
                        transform: scale(1.18);
                    }
                }
            `}</style>

            {/* Ambient Volumetric Glow Blooms behind cards */}
            <div
                style={{
                    position: 'absolute',
                    top: '-15%',
                    left: '20%',
                    width: '650px',
                    height: '550px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 245, 155, 0.14) 0%, rgba(6, 182, 212, 0.08) 45%, transparent 70%)',
                    filter: 'blur(70px)',
                    animation: 'bloomBreathe 8s ease-in-out infinite'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '5%',
                    right: '-5%',
                    width: '750px',
                    height: '650px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.13) 0%, rgba(37, 99, 235, 0.07) 50%, transparent 70%)',
                    filter: 'blur(90px)',
                    animation: 'bloomBreathe 11s ease-in-out infinite 2s'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: '45%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 245, 155, 0.09) 0%, rgba(52, 211, 153, 0.04) 50%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'bloomBreathe 9s ease-in-out infinite 4s'
                }}
            />

            {/* Subtle Futuristic Background Grid Texture */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(0, 245, 155, 0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(6, 182, 212, 0.025) 1px, transparent 1px)
                    `,
                    backgroundSize: '54px 54px',
                    opacity: 0.85,
                    maskImage: 'radial-gradient(circle at 50% 40%, black 30%, transparent 85%)',
                    WebkitMaskImage: 'radial-gradient(circle at 50% 40%, black 30%, transparent 85%)'
                }}
            />

            {/* SVG Luminous Curved Lines & Neon Energy Streams */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 1600 1000"
                preserveAspectRatio="none"
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'visible'
                }}
            >
                <defs>
                    {/* Emerald-to-Cyan Gradients */}
                    <linearGradient id="lumGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f59b" stopOpacity="0.85" />
                        <stop offset="35%" stopColor="#10b981" stopOpacity="0.75" />
                        <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
                    </linearGradient>

                    <linearGradient id="lumGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                        <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.7" />
                        <stop offset="80%" stopColor="#00f59b" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#52eea3" stopOpacity="0.6" />
                    </linearGradient>

                    <linearGradient id="lumGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                        <stop offset="30%" stopColor="#00f59b" stopOpacity="0.75" />
                        <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#00f59b" stopOpacity="0.1" />
                    </linearGradient>

                    {/* Neon Glow Filters */}
                    <filter id="lumGlowIntense" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="8" result="blur1" />
                        <feGaussianBlur stdDeviation="18" result="blur2" />
                        <feMerge>
                            <feMergeNode in="blur2" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="lumGlowSoft" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="12" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Primary Luminous S-Curve - Upper Ribbon */}
                <g style={{ animation: 'luminousFlow1 16s ease-in-out infinite' }}>
                    {/* Deep ambient glow layer */}
                    <path
                        d="M -100 240 C 350 80, 680 480, 1150 210 C 1380 90, 1550 180, 1750 130"
                        fill="none"
                        stroke="url(#lumGrad1)"
                        strokeWidth="14"
                        opacity="0.16"
                        filter="url(#lumGlowSoft)"
                    />
                    {/* Core neon curve */}
                    <path
                        d="M -100 240 C 350 80, 680 480, 1150 210 C 1380 90, 1550 180, 1750 130"
                        fill="none"
                        stroke="url(#lumGrad1)"
                        strokeWidth="2.8"
                        filter="url(#lumGlowIntense)"
                    />
                    {/* Flowing animated dash energy pulse */}
                    <path
                        d="M -100 240 C 350 80, 680 480, 1150 210 C 1380 90, 1550 180, 1750 130"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeDasharray="90 320"
                        style={{ animation: 'luminousDash 9s linear infinite' }}
                        opacity="0.85"
                    />
                </g>

                {/* Secondary Luminous S-Curve - Lower Cross Ribbon */}
                <g style={{ animation: 'luminousFlow2 20s ease-in-out infinite' }}>
                    {/* Ambient glow layer */}
                    <path
                        d="M -80 720 C 320 890, 640 520, 1080 780 C 1340 920, 1520 740, 1720 790"
                        fill="none"
                        stroke="url(#lumGrad2)"
                        strokeWidth="12"
                        opacity="0.14"
                        filter="url(#lumGlowSoft)"
                    />
                    {/* Core neon curve */}
                    <path
                        d="M -80 720 C 320 890, 640 520, 1080 780 C 1340 920, 1520 740, 1720 790"
                        fill="none"
                        stroke="url(#lumGrad2)"
                        strokeWidth="2.5"
                        filter="url(#lumGlowIntense)"
                    />
                    {/* Pulsing dash */}
                    <path
                        d="M -80 720 C 320 890, 640 520, 1080 780 C 1340 920, 1520 740, 1720 790"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeDasharray="120 400"
                        style={{ animation: 'luminousDash 12s linear infinite reverse' }}
                        opacity="0.8"
                    />
                </g>

                {/* Tertiary Harmonic Diagonal Wave */}
                <g style={{ animation: 'luminousFlow1 24s ease-in-out infinite 3s' }}>
                    <path
                        d="M 50 -50 C 420 300, 800 250, 1200 650 C 1420 860, 1550 950, 1700 1100"
                        fill="none"
                        stroke="url(#lumGrad3)"
                        strokeWidth="2"
                        strokeDasharray="180 250"
                        opacity="0.45"
                        filter="url(#lumGlowSoft)"
                    />
                </g>

                {/* Accent Parabolic Energy Arc */}
                <path
                    d="M 200 880 Q 750 350 1450 480"
                    fill="none"
                    stroke="rgba(0, 245, 155, 0.35)"
                    strokeWidth="1.5"
                    strokeDasharray="8 12"
                />
            </svg>

            {/* Sparking Light Points (Star-burst glints and shimmering sparkles) */}
            {sparks.map((s) => (
                <div
                    key={s.id}
                    style={{
                        position: 'absolute',
                        top: s.top,
                        left: s.left,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        color: s.color,
                        animation: `sparkTwinkle ${s.dur} ease-in-out infinite ${s.delay}`,
                        transformOrigin: 'center center'
                    }}
                >
                    <svg viewBox="-12 -12 24 24" width="100%" height="100%">
                        {/* 4-Point Star Glint */}
                        <path
                            d="M 0 -11 Q 1 -2 11 0 Q 1 2 0 11 Q -1 2 -11 0 Q -1 -2 0 -11 Z"
                            fill="currentColor"
                        />
                        {/* Central bright core */}
                        <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default LuminousBackground;
