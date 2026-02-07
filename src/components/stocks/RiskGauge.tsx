'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RISK_COLORS } from '@/lib/visualization-schema';

interface RiskGaugeProps {
    value: number;
    max?: number;
    label: string;
    symbol?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    delay?: number;
}

/**
 * Animated gauge visualization for risk metrics
 */
export function RiskGauge({
    value,
    max = 100,
    label,
    symbol,
    description,
    size = 'md',
    showValue = true,
    delay = 0,
}: RiskGaugeProps) {
    const percentage = Math.min((value / max) * 100, 100);
    
    // Determine color based on value
    const getColor = () => {
        if (percentage < 20) return RISK_COLORS.very_low;
        if (percentage < 40) return RISK_COLORS.low;
        if (percentage < 60) return RISK_COLORS.medium;
        if (percentage < 80) return RISK_COLORS.high;
        return RISK_COLORS.very_high;
    };

    const color = getColor();
    
    const sizes = {
        sm: { width: 100, strokeWidth: 8, fontSize: 'text-lg' },
        md: { width: 140, strokeWidth: 10, fontSize: 'text-2xl' },
        lg: { width: 180, strokeWidth: 12, fontSize: 'text-3xl' },
    };

    const { width, strokeWidth, fontSize } = sizes[size];
    const radius = (width - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Half circle
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: delay / 1000 }}
        >
            <div className="relative" style={{ width, height: width / 2 + 20 }}>
                <svg
                    width={width}
                    height={width / 2 + 10}
                    viewBox={`0 0 ${width} ${width / 2 + 10}`}
                    className="transform -rotate-0"
                >
                    {/* Background arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    
                    {/* Value arc */}
                    <motion.path
                        d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, delay: delay / 1000 + 0.2, ease: 'easeOut' }}
                    />
                </svg>

                {/* Center value */}
                {showValue && (
                    <div className="absolute inset-0 flex items-end justify-center pb-2">
                        <motion.span
                            className={`${fontSize} font-bold`}
                            style={{ color }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: delay / 1000 + 0.5 }}
                        >
                            {value.toFixed(1)}%
                        </motion.span>
                    </div>
                )}
            </div>

            {/* Label */}
            <div className="text-center mt-2">
                {symbol && (
                    <p className="text-xs text-foreground-muted">{symbol}</p>
                )}
                <p className="text-sm font-medium">{label}</p>
                {description && (
                    <p className="text-xs text-foreground-muted mt-1">{description}</p>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Horizontal progress bar for risk metrics
 */
interface RiskBarProps {
    value: number;
    max?: number;
    label: string;
    symbol?: string;
    showPercentage?: boolean;
    delay?: number;
}

export function RiskBar({
    value,
    max = 100,
    label,
    symbol,
    showPercentage = true,
    delay = 0,
}: RiskBarProps) {
    const percentage = Math.min((value / max) * 100, 100);
    
    const getColor = () => {
        if (percentage < 20) return RISK_COLORS.very_low;
        if (percentage < 40) return RISK_COLORS.low;
        if (percentage < 60) return RISK_COLORS.medium;
        if (percentage < 80) return RISK_COLORS.high;
        return RISK_COLORS.very_high;
    };

    return (
        <motion.div
            className="w-full"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay / 1000 }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {symbol && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary">
                            {symbol}
                        </span>
                    )}
                    <span className="text-sm font-medium">{label}</span>
                </div>
                {showPercentage && (
                    <span className="text-sm font-bold" style={{ color: getColor() }}>
                        {value.toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getColor() }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: delay / 1000 + 0.1, ease: 'easeOut' }}
                />
            </div>
        </motion.div>
    );
}

/**
 * Risk level indicator with icon
 */
interface RiskLevelProps {
    level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    delay?: number;
}

const LEVEL_LABELS = {
    very_low: 'Very Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High',
};

export function RiskLevel({ level, label, size = 'md', delay = 0 }: RiskLevelProps) {
    const color = RISK_COLORS[level];
    
    const sizes = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4',
    };

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
    };

    return (
        <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: delay / 1000 }}
        >
            <motion.div
                className={`${sizes[size]} rounded-full`}
                style={{ backgroundColor: color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay / 1000 + 0.1, type: 'spring' }}
            />
            <span className={`${textSizes[size]} font-medium`} style={{ color }}>
                {label || LEVEL_LABELS[level]}
            </span>
        </motion.div>
    );
}
