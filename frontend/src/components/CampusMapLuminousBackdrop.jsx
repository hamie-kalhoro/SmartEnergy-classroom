import React, { useMemo } from 'react';

/**
 * CampusMapLuminousBackdrop
 * High-tech digital twin backdrop rendered behind the Campus Map artboard.
 * Features:
 * - Radiant luminous curved energy conduits (emerald neon & electric cyan)
 * - Sparkling light flares & twinkling micro-spark particles
 * - Volumetric glow blooms highlighting facility coordinates
 */
const CampusMapLuminousBackdrop = () => {
    const mapSparks = useMemo(() => [
        { id: 1, top: '15%', left: '22%', size: 18, delay: '0s', dur: '3.2s', color: '#00f59b' },
        { id: 2, top: '28%', left: '78%', size: 22, delay: '1.4s', dur: '4.0s', color: '#06b6d4' },
        { id: 3, top: '45%', left: '35%', size: 14, delay: '0.7s', dur: '3.6s', color: '#38bdf8' },
        { id: 4, top: '65%', left: '70%', size: 24, delay: '2.1s', dur: '4.4s', color: '#52eea3' },
        { id: 5, top: '78%', left: '25%', size: 16, delay: '1.0s', dur: '3.8s', color: '#00f59b' },
        { id: 6, top: '85%', left: '82%', size: 20, delay: '2.5s', dur: '4.2s', color: '#06b6d4' },
        { id: 7, top: '35%', left: '88%', size: 12, delay: '0.4s', dur: '3.5s', color: '#ffffff' },
        { id: 8, top: '52%', left: '16%', size: 15, delay: '1.8s', dur: '3.9s', color: '#34d399' },
        { id: 9, top: '10%', left: '55%', size: 16, delay: '2.8s', dur: '4.5s', color: '#06b6d4' },
        { id: 10, top: '92%', left: '48%', size: 14, delay: '1.2s', dur: '3.7s', color: '#00f59b' }
    ], []);

    return (
        <div
            className="campus-map-luminous-backdrop"
            style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 1
            }}
            aria-hidden="true"
        >
            <style>{`
                @keyframes mapWaveFlow1 {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-16px) rotate(1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }

                @keyframes mapWaveFlow2 {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(18px) rotate(-1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }

                @keyframes mapConduitFlow {
                    0% { stroke-dashoffset: 1600; }
                    100% { stroke-dashoffset: 0; }
                }

                @keyframes mapSparkFlare {
                    0%, 100% {
                        opacity: 0.2;
                        transform: scale(0.65) rotate(0deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.25) rotate(90deg);
                        filter: drop-shadow(0 0 14px currentColor);
                    }
                }

                @keyframes mapBloomAura {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.85; transform: scale(1.2); }
                }
            `}</style>

            {/* Radiant Volumetric Energy Blooms behind map hero card */}
            <div
                style={{
                    position: 'absolute',
                    top: '18%',
                    left: '28%',
                    width: '450px',
                    height: '450px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 245, 155, 0.16) 0%, rgba(6, 182, 212, 0.08) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                    animation: 'mapBloomAura 7s ease-in-out infinite'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '20%',
                    right: '22%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(0, 245, 155, 0.06) 45%, transparent 70%)',
                    filter: 'blur(70px)',
                    animation: 'mapBloomAura 9s ease-in-out infinite 2s'
                }}
            />

            {/* Luminous Curved Lines & Neon Energy Streams on Back of Map */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 1200 900"
                preserveAspectRatio="none"
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'visible'
                }}
            >
                <defs>
                    <linearGradient id="mapNeonEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f59b" stopOpacity="0.9" />
                        <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
                    </linearGradient>

                    <linearGradient id="mapNeonCyan" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                        <stop offset="55%" stopColor="#00f59b" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#52eea3" stopOpacity="0.7" />
                    </linearGradient>

                    <filter id="mapNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" result="blur1" />
                        <feGaussianBlur stdDeviation="15" result="blur2" />
                        <feMerge>
                            <feMergeNode in="blur2" />
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Primary Luminous Curved Ribbon 1 */}
                <g style={{ animation: 'mapWaveFlow1 14s ease-in-out infinite' }}>
                    {/* Deep ambient glow layer */}
                    <path
                        d="M -50 180 C 280 40, 520 440, 880 160 C 1040 40, 1180 120, 1300 80"
                        fill="none"
                        stroke="url(#mapNeonEmerald)"
                        strokeWidth="10"
                        opacity="0.16"
                        filter="url(#mapNeonGlow)"
                    />
                    {/* Core sharp neon line */}
                    <path
                        d="M -50 180 C 280 40, 520 440, 880 160 C 1040 40, 1180 120, 1300 80"
                        fill="none"
                        stroke="url(#mapNeonEmerald)"
                        strokeWidth="2.5"
                        filter="url(#mapNeonGlow)"
                    />
                    {/* Flowing electric tracer pulse */}
                    <path
                        d="M -50 180 C 280 40, 520 440, 880 160 C 1040 40, 1180 120, 1300 80"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeDasharray="80 260"
                        style={{ animation: 'mapConduitFlow 7s linear infinite' }}
                        opacity="0.9"
                    />
                </g>

                {/* Secondary Luminous Curved Ribbon 2 */}
                <g style={{ animation: 'mapWaveFlow2 18s ease-in-out infinite' }}>
                    <path
                        d="M -40 680 C 260 820, 560 480, 920 740 C 1080 840, 1200 690, 1280 730"
                        fill="none"
                        stroke="url(#mapNeonCyan)"
                        strokeWidth="9"
                        opacity="0.15"
                        filter="url(#mapNeonGlow)"
                    />
                    <path
                        d="M -40 680 C 260 820, 560 480, 920 740 C 1080 840, 1200 690, 1280 730"
                        fill="none"
                        stroke="url(#mapNeonCyan)"
                        strokeWidth="2.2"
                        filter="url(#mapNeonGlow)"
                    />
                    <path
                        d="M -40 680 C 260 820, 560 480, 920 740 C 1080 840, 1200 690, 1280 730"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        strokeDasharray="90 300"
                        style={{ animation: 'mapConduitFlow 9s linear infinite reverse' }}
                        opacity="0.85"
                    />
                </g>

                {/* Cybernetic Geometric Energy Rings */}
                <g opacity="0.4" style={{ transformOrigin: '600px 420px', animation: 'mapWaveFlow1 22s ease-in-out infinite' }}>
                    <circle cx="580" cy="400" r="280" fill="none" stroke="rgba(0, 245, 155, 0.2)" strokeWidth="1.2" strokeDasharray="12 18" />
                    <circle cx="580" cy="400" r="420" fill="none" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" strokeDasharray="20 30" />
                </g>
            </svg>

            {/* Sparking Light Points across the Map Hero Card */}
            {mapSparks.map((spark) => (
                <div
                    key={spark.id}
                    style={{
                        position: 'absolute',
                        top: spark.top,
                        left: spark.left,
                        width: `${spark.size}px`,
                        height: `${spark.size}px`,
                        color: spark.color,
                        animation: `mapSparkFlare ${spark.dur} ease-in-out infinite ${spark.delay}`,
                        transformOrigin: 'center center'
                    }}
                >
                    <svg viewBox="-12 -12 24 24" width="100%" height="100%">
                        <path
                            d="M 0 -11 Q 1 -2 11 0 Q 1 2 0 11 Q -1 2 -11 0 Q -1 -2 0 -11 Z"
                            fill="currentColor"
                        />
                        <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default CampusMapLuminousBackdrop;
