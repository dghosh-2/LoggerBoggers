'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LiquidGlassCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Simple glass card - transparent overlay, no borders
 */
export function LiquidGlassCard({
    children,
    className = '',
    delay = 0,
    padding = 'md'
}: LiquidGlassCardProps) {
    const paddingClasses = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
    };

    return (
        <motion.div
            className={`glass-module-subtle ${paddingClasses[padding]} ${className}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.3,
                delay: delay / 1000,
                ease: [0.22, 1, 0.36, 1]
            }}
        >
            {children}
        </motion.div>
    );
}

interface LiquidGlassIconProps {
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Simple glass icon container
 */
export function LiquidGlassIcon({ children, size = 'md', className = '' }: LiquidGlassIconProps) {
    const sizeClasses = {
        sm: 'w-7 h-7',
        md: 'w-9 h-9',
        lg: 'w-11 h-11',
    };

    return (
        <div className={`glass-icon ${sizeClasses[size]} ${className}`}>
            {children}
        </div>
    );
}

interface LiquidGlassPillProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Simple glass pill/badge
 */
export function LiquidGlassPill({ children, className = '' }: LiquidGlassPillProps) {
    return (
        <span className={`glass-pill ${className}`}>
            {children}
        </span>
    );
}

export default LiquidGlassCard;
