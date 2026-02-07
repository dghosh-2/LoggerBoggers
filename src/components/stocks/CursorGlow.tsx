'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface CursorGlowProps {
    enabled?: boolean;
    color?: string;
    size?: number;
    blur?: number;
    opacity?: number;
}

/**
 * Cursor-following glow effect with smooth inertia
 * Creates an Apple-like liquid glass ambient effect
 */
export function CursorGlow({
    enabled = true,
    color = 'rgba(184, 134, 11, 0.4)',
    size = 400,
    blur = 100,
    opacity = 0.6,
}: CursorGlowProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    // Raw mouse position
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    // Smooth mouse position with heavy inertia (spring physics)
    const smoothX = useSpring(mouseX, { 
        stiffness: 50, 
        damping: 30, 
        mass: 1 
    });
    const smoothY = useSpring(mouseY, { 
        stiffness: 50, 
        damping: 30, 
        mass: 1 
    });

    useEffect(() => {
        if (!enabled) return;

        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
            if (!isVisible) setIsVisible(true);
        };

        const handleMouseLeave = () => {
            setIsVisible(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [enabled, mouseX, mouseY, isVisible]);

    if (!enabled) return null;

    return (
        <motion.div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Main glow */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size,
                    height: size,
                    x: smoothX,
                    y: smoothY,
                    translateX: '-50%',
                    translateY: '-50%',
                    background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
                    filter: `blur(${blur}px)`,
                    opacity,
                }}
            />
            
            {/* Secondary smaller glow for more definition */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: size * 0.4,
                    height: size * 0.4,
                    x: smoothX,
                    y: smoothY,
                    translateX: '-50%',
                    translateY: '-50%',
                    background: `radial-gradient(circle at center, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`,
                    filter: `blur(${blur * 0.5}px)`,
                    opacity: opacity * 0.5,
                }}
            />
        </motion.div>
    );
}

/**
 * Wrapper component that adds cursor glow to a section
 */
export function WithCursorGlow({ 
    children, 
    className = '',
    ...glowProps 
}: { 
    children: React.ReactNode; 
    className?: string;
} & CursorGlowProps) {
    return (
        <div className={`relative ${className}`}>
            <CursorGlow {...glowProps} />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

export default CursorGlow;
