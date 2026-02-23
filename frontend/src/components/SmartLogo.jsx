import React from 'react';
import { motion } from 'framer-motion';

const SmartLogo = ({ size = 32, className = "", glow = true }) => {
    return (
        <div className={`d-flex align-items-center gap-2 ${className}`} style={{ cursor: 'pointer' }}>
            <motion.svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                initial="initial"
                animate="animate"
                whileHover="hover"
            >
                {/* Outer Glow Effect */}
                {glow && (
                    <motion.path
                        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                        stroke="var(--primary)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'blur(8px)', opacity: 0.4 }}
                        animate={{
                            opacity: [0.2, 0.5, 0.2],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                )}

                {/* Main Bolt */}
                <motion.path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    fill="var(--gradient-primary)"
                    stroke="var(--primary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={{
                        initial: { pathLength: 0, opacity: 0 },
                        animate: {
                            pathLength: [0, 1, 1], // Goes from 0 to 1, then stays at 1
                            opacity: [0, 1, 1],
                            transition: {
                                duration: 1.2,
                                times: [0, 0.8, 1], // Speed up the initial draw
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatDelay: 3.8 // Professional 5s total cycle
                            }
                        },
                        hover: {
                            scale: 1.1,
                            filter: 'brightness(1.2)',
                            transition: { duration: 0.3 }
                        }
                    }}
                />
            </motion.svg>
            <span style={{
                fontSize: size * 0.7,
                fontWeight: '800',
                letterSpacing: '-0.04em',
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'var(--font-heading)'
            }}>
                SmartClass
            </span>
        </div>
    );
};

export default SmartLogo;
