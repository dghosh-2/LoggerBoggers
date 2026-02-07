'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryConstellationProps {
    categories: Record<string, number>;
    totalSpending: number;
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
    'Education': '#A855F7',
    'Other': '#6B7280',
};

const CATEGORY_ICONS: Record<string, string> = {
    'Shopping': '🛍️',
    'Food & Drink': '🍔',
    'Bills & Utilities': '⚡',
    'Transportation': '🚗',
    'Health & Fitness': '💪',
    'Entertainment': '🎬',
    'Personal Care': '✨',
    'Travel': '✈️',
    'Education': '📚',
    'Other': '📦',
};

export function CategoryConstellation({ categories, totalSpending, isConnected }: CategoryConstellationProps) {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    const bubbles = useMemo(() => {
        if (!isConnected || Object.keys(categories).length === 0) {
            return [];
        }

        const sorted = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        const maxAmount = Math.max(...sorted.map(([, amount]) => amount));
        const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);

        // Pack circles algorithm - simplified version
        const positions: { x: number; y: number; r: number; category: string; amount: number; percentage: number; color: string }[] = [];
        
        sorted.forEach(([category, amount], index) => {
            const percentage = (amount / total) * 100;
            const radius = Math.max(30, Math.min(70, (amount / maxAmount) * 70));
            
            // Spiral placement
            const angle = index * 0.8 + Math.PI / 4;
            const distance = 60 + index * 25;
            const x = 180 + Math.cos(angle) * distance;
            const y = 150 + Math.sin(angle) * distance;
            
            positions.push({
                x,
                y,
                r: radius,
                category,
                amount,
                percentage,
                color: CATEGORY_COLORS[category] || '#6B7280',
            });
        });

        return positions;
    }, [categories, isConnected]);

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="flex gap-2 justify-center mb-3">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="w-8 h-8 rounded-full bg-secondary/50"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-foreground-muted">Connect accounts to see spending constellation</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full relative overflow-hidden">
            {/* Background stars */}
            <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-0.5 h-0.5 bg-foreground/20 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                        transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </div>

            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 300">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
                        <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {bubbles.slice(0, -1).map((bubble, i) => {
                    const next = bubbles[i + 1];
                    if (!next) return null;
                    return (
                        <motion.line
                            key={`line-${i}`}
                            x1={bubble.x}
                            y1={bubble.y}
                            x2={next.x}
                            y2={next.y}
                            stroke="url(#lineGradient)"
                            strokeWidth="1"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                        />
                    );
                })}
            </svg>

            {/* Bubbles */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 300">
                <defs>
                    {bubbles.map((bubble) => (
                        <radialGradient key={`grad-${bubble.category}`} id={`bubble-${bubble.category}`} cx="30%" cy="30%">
                            <stop offset="0%" stopColor={bubble.color} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={bubble.color} stopOpacity="0.4" />
                        </radialGradient>
                    ))}
                    <filter id="bubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {bubbles.map((bubble, index) => (
                    <g key={bubble.category}>
                        {/* Outer glow */}
                        <motion.circle
                            cx={bubble.x}
                            cy={bubble.y}
                            r={bubble.r + 5}
                            fill={bubble.color}
                            opacity={hoveredCategory === bubble.category ? 0.3 : 0.1}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        />
                        
                        {/* Main bubble */}
                        <motion.circle
                            cx={bubble.x}
                            cy={bubble.y}
                            r={bubble.r}
                            fill={`url(#bubble-${bubble.category})`}
                            stroke={bubble.color}
                            strokeWidth="2"
                            filter="url(#bubbleGlow)"
                            className="cursor-pointer"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ 
                                scale: hoveredCategory === bubble.category ? 1.1 : 1,
                                opacity: 1,
                            }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            onMouseEnter={() => setHoveredCategory(bubble.category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                        />
                        
                        {/* Icon */}
                        <text
                            x={bubble.x}
                            y={bubble.y - 5}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-lg pointer-events-none"
                        >
                            {CATEGORY_ICONS[bubble.category] || '📦'}
                        </text>
                        
                        {/* Percentage */}
                        <text
                            x={bubble.x}
                            y={bubble.y + 12}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white text-[10px] font-bold pointer-events-none"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                        >
                            {bubble.percentage.toFixed(0)}%
                        </text>
                    </g>
                ))}
            </svg>

            {/* Hover tooltip */}
            <AnimatePresence>
                {hoveredCategory && (
                    <motion.div
                        className="absolute top-4 left-4 bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-xl z-20"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {(() => {
                            const bubble = bubbles.find(b => b.category === hoveredCategory);
                            if (!bubble) return null;
                            return (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{CATEGORY_ICONS[hoveredCategory] || '📦'}</span>
                                        <span className="font-semibold text-sm">{hoveredCategory}</span>
                                    </div>
                                    <p className="text-lg font-bold font-mono" style={{ color: bubble.color }}>
                                        ${bubble.amount.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-foreground-muted">
                                        {bubble.percentage.toFixed(1)}% of total spending
                                    </p>
                                </>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Total spending indicator */}
            <div className="absolute bottom-3 right-3 text-right">
                <p className="text-[9px] uppercase tracking-wider text-foreground-muted">Total</p>
                <p className="text-sm font-bold font-mono">${totalSpending.toLocaleString()}</p>
            </div>
        </div>
    );
}
