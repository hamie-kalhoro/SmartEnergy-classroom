import React from 'react';
import { motion } from 'framer-motion';

const DynamicLoader = ({ size = 24, className = "", color = "var(--primary)" }) => {
    return (
        <div className={`d-flex align-items-center justify-content-center ${className}`}
            style={{ width: size, height: size, position: 'relative' }}>
            {/* Outer Rotating Segment */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `2px solid transparent`,
                    borderTopColor: color,
                    borderRightColor: color,
                    opacity: 0.8
                }}
                animate={{ rotate: 360 }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            {/* Inner Pulsing Bolt (The Dynamic Element from Landing Page) */}
            <motion.svg
                width={size * 0.6}
                height={size * 0.6}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <motion.path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    fill={color}
                    initial={{ opacity: 0.3, scale: 0.8 }}
                    animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.1, 0.8]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.svg>

            {/* Outer Glow */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: '50%',
                    background: color,
                    filter: 'blur(8px)',
                    zIndex: -1
                }}
                animate={{
                    opacity: [0, 0.2, 0]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
};

export default DynamicLoader;
