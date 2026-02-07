'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SpendingOrbitProps {
    categories: Record<string, number>;
    totalSpending: number;
    netWorth: number;
    isConnected: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Shopping': '#8B5CF6',
    'Food & Drink': '#F59E0B',
    'Bills & Utilities': '#3B82F6',
    'Transportation': '#10B981',
    'Health & Fitness': '#EC4899',
    'Entertainment': '#6366F1',
    'Personal Care': '#14B8A6',
    'Travel': '#F97316',
    'Education': '#8B5CF6',
    'Other': '#6B7280',
};

export function SpendingOrbit({ categories, totalSpending, netWorth, isConnected }: SpendingOrbitProps) {
    const orbits = useMemo(() => {
        if (!isConnected || Object.keys(categories).length === 0) {
            return [];
        }

        const sorted = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        const maxAmount = Math.max(...sorted.map(([, amount]) => amount));

        return sorted.map(([category, amount], index) => {
            const percentage = (amount / totalSpending) * 100;
            const size = Math.max(24, Math.min(56, (amount / maxAmount) * 56));
            const orbitRadius = 80 + index * 35;
            const duration = 20 + index * 8;
            const startAngle = (index * 60) % 360;

            return {
                category,
                amount,
                percentage,
                size,
                orbitRadius,
                duration,
                startAngle,
                color: CATEGORY_COLORS[category] || '#6B7280',
            };
        });
    }, [categories, totalSpending, isConnected]);

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-secondary/50 mx-auto mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-secondary" />
                    </div>
                    <p className="text-sm text-foreground-muted">Connect accounts to see spending orbit</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative overflow-hidden">
            {/* Orbit rings */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
                <defs>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </radialGradient>
                </defs>
                
                {/* Glow effect */}
                <circle cx="200" cy="200" r="60" fill="url(#centerGlow)" />
                
                {/* Orbit paths */}
                {orbits.map((orbit, i) => (
                    <circle
                        key={`ring-${i}`}
                        cx="200"
                        cy="200"
                        r={orbit.orbitRadius}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.3"
                    />
                ))}
            </svg>

            {/* Center - Net Worth */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">Net Worth</p>
                        <p className="text-lg font-bold font-mono">
                            ${Math.abs(netWorth).toLocaleString()}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Orbiting planets */}
            {orbits.map((orbit, index) => (
                <motion.div
                    key={orbit.category}
                    className="absolute left-1/2 top-1/2"
                    style={{
                        width: orbit.orbitRadius * 2,
                        height: orbit.orbitRadius * 2,
                        marginLeft: -orbit.orbitRadius,
                        marginTop: -orbit.orbitRadius,
                    }}
                    initial={{ rotate: orbit.startAngle, opacity: 0 }}
                    animate={{ 
                        rotate: orbit.startAngle + 360,
                        opacity: 1,
                    }}
                    transition={{
                        rotate: {
                            duration: orbit.duration,
                            repeat: Infinity,
                            ease: 'linear',
                        },
                        opacity: {
                            duration: 0.5,
                            delay: index * 0.1,
                        }
                    }}
                >
                    <motion.div
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{
                            left: '100%',
                            top: '50%',
                            width: orbit.size,
                            height: orbit.size,
                        }}
                        whileHover={{ scale: 1.2 }}
                        // Counter-rotate to keep text upright
                        animate={{ rotate: -360 - orbit.startAngle }}
                        transition={{
                            rotate: {
                                duration: orbit.duration,
                                repeat: Infinity,
                                ease: 'linear',
                            }
                        }}
                    >
                        <div
                            className="w-full h-full rounded-full flex items-center justify-center shadow-lg transition-shadow group-hover:shadow-xl"
                            style={{
                                background: `linear-gradient(135deg, ${orbit.color}40, ${orbit.color}20)`,
                                border: `2px solid ${orbit.color}60`,
                            }}
                        >
                            <span className="text-[9px] font-bold text-white drop-shadow-sm">
                                {orbit.percentage.toFixed(0)}%
                            </span>
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            <div className="bg-card border border-border rounded-lg px-2 py-1 shadow-lg">
                                <p className="text-[10px] font-semibold">{orbit.category}</p>
                                <p className="text-[9px] text-foreground-muted">${orbit.amount.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            ))}

            {/* Legend */}
            <div className="absolute bottom-2 left-2 right-2">
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {orbits.slice(0, 4).map((orbit) => (
                        <div key={orbit.category} className="flex items-center gap-1 text-[9px]">
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: orbit.color }}
                            />
                            <span className="text-foreground-muted">{orbit.category}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
