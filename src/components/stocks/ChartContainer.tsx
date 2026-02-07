'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Download, Info } from 'lucide-react';

interface ChartContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    height?: 'sm' | 'md' | 'lg' | 'xl';
    onExpand?: () => void;
    onDownload?: () => void;
    showActions?: boolean;
    delay?: number;
    className?: string;
    useLiquidGlass?: boolean;
}

const HEIGHTS = {
    sm: 'h-[200px]',
    md: 'h-[320px]',
    lg: 'h-[400px]',
    xl: 'h-[500px]',
};

/**
 * Unified chart container with optional liquid glass styling
 */
export function ChartContainer({
    title,
    subtitle,
    children,
    height = 'md',
    onExpand,
    onDownload,
    showActions = true,
    delay = 0,
    className = '',
    useLiquidGlass = true,
}: ChartContainerProps) {
    const containerClass = useLiquidGlass 
        ? "liquid-glass liquid-glass-interactive rounded-3xl" 
        : "card-elevated rounded-2xl";

    return (
        <motion.div
            className={`${containerClass} overflow-hidden ${className}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-start justify-between relative z-10">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>
                    )}
                </div>
                {showActions && (
                    <div className="flex items-center gap-1">
                        {onDownload && (
                            <motion.button
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onDownload}
                            >
                                <Download className="w-4 h-4 text-foreground-muted" />
                            </motion.button>
                        )}
                        {onExpand && (
                            <motion.button
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onExpand}
                            >
                                <Maximize2 className="w-4 h-4 text-foreground-muted" />
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className={`px-4 pb-5 relative z-10 ${HEIGHTS[height]}`}>
                {children}
            </div>
        </motion.div>
    );
}

/**
 * Metric card with consistent styling
 */
interface MetricCardProps {
    label: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    delay?: number;
}

const COLOR_CLASSES = {
    default: 'bg-secondary',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    danger: 'bg-destructive/10',
    info: 'bg-primary/10',
};

const TEXT_COLORS = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
    info: 'text-primary',
};

export function MetricCard({
    label,
    value,
    change,
    changeLabel,
    icon,
    color = 'default',
    size = 'md',
    delay = 0,
    useLiquidGlass = true,
}: MetricCardProps & { useLiquidGlass?: boolean }) {
    const sizeClasses = {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5',
    };

    const valueClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
    };

    const containerClass = useLiquidGlass 
        ? "liquid-glass liquid-glass-interactive rounded-2xl" 
        : `${COLOR_CLASSES[color]} rounded-xl border border-border`;

    return (
        <motion.div
            className={`${containerClass} ${sizeClasses[size]}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delay / 1000 }}
            whileHover={useLiquidGlass ? { scale: 1.02 } : undefined}
        >
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-xs text-foreground-muted mb-1">{label}</p>
                    <p className={`${valueClasses[size]} font-bold ${TEXT_COLORS[color]}`}>
                        {value}
                    </p>
                    {change !== undefined && (
                        <p className={`text-xs mt-1 ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                            {changeLabel && <span className="text-foreground-muted ml-1">{changeLabel}</span>}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className={`p-2 rounded-lg ${COLOR_CLASSES[color]}`}>
                        {icon}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Section wrapper for grouping related visualizations
 */
interface SectionProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4;
    gap?: 'sm' | 'md' | 'lg';
    delay?: number;
}

const GAP_CLASSES = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
};

const GRID_CLASSES = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export function Section({
    title,
    subtitle,
    children,
    columns = 1,
    gap = 'md',
    delay = 0,
}: SectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay / 1000 }}
        >
            {(title || subtitle) && (
                <div className="mb-4">
                    {title && <h2 className="text-lg font-semibold">{title}</h2>}
                    {subtitle && <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>}
                </div>
            )}
            <div className={`grid ${GRID_CLASSES[columns]} ${GAP_CLASSES[gap]}`}>
                {children}
            </div>
        </motion.div>
    );
}
