'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface FinancialRiverProps {
    monthlyIncome: number;
    monthlySpending: number;
    categories: Record<string, number>;
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

export function FinancialRiver({ monthlyIncome, monthlySpending, categories, isConnected }: FinancialRiverProps) {
    const flows = useMemo(() => {
        if (!isConnected || monthlyIncome === 0) {
            return { categoryFlows: [], savingsFlow: 0, savingsPercentage: 0 };
        }

        const sorted = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const totalCategorySpending = sorted.reduce((sum, [, amount]) => sum + amount, 0);
        const savings = monthlyIncome - monthlySpending;
        const savingsPercentage = (savings / monthlyIncome) * 100;

        const categoryFlows = sorted.map(([category, amount]) => ({
            category,
            amount,
            percentage: (amount / monthlyIncome) * 100,
            color: CATEGORY_COLORS[category] || '#6B7280',
        }));

        return { categoryFlows, savingsFlow: savings, savingsPercentage };
    }, [monthlyIncome, monthlySpending, categories, isConnected]);

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        className="w-32 h-2 bg-gradient-to-r from-transparent via-secondary to-transparent rounded-full mx-auto mb-3"
                        animate={{ x: [-20, 20, -20] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <p className="text-sm text-foreground-muted">Connect accounts to see money flow</p>
                </div>
            </div>
        );
    }

    const { categoryFlows, savingsFlow, savingsPercentage } = flows;

    return (
        <div className="h-full flex flex-col p-2">
            {/* Income source */}
            <div className="flex items-center justify-center mb-4">
                <motion.div
                    className="relative"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-success/30 to-success/10 border-2 border-success/50 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-[9px] uppercase tracking-wider text-foreground-muted">Income</p>
                            <p className="text-lg font-bold font-mono text-success">
                                ${monthlyIncome.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    
                    {/* Pulse rings */}
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-success/30"
                        animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                </motion.div>
            </div>

            {/* Flow streams */}
            <div className="flex-1 relative">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Flow gradients */}
                        {categoryFlows.map((flow) => (
                            <linearGradient key={`grad-${flow.category}`} id={`flow-${flow.category}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.6" />
                                <stop offset="50%" stopColor={flow.color} stopOpacity="0.8" />
                                <stop offset="100%" stopColor={flow.color} stopOpacity="0.4" />
                            </linearGradient>
                        ))}
                        
                        <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.8" />
                        </linearGradient>
                    </defs>

                    {/* Category flow paths */}
                    {categoryFlows.map((flow, index) => {
                        const startX = 150;
                        const endX = 30 + index * 55;
                        const width = Math.max(4, (flow.percentage / 100) * 30);
                        
                        return (
                            <g key={flow.category}>
                                {/* Flow path */}
                                <motion.path
                                    d={`
                                        M ${startX - width/2} 0
                                        Q ${startX - width/2} 80, ${endX - width/2} 160
                                        L ${endX + width/2} 160
                                        Q ${startX + width/2} 80, ${startX + width/2} 0
                                        Z
                                    `}
                                    fill={`url(#flow-${flow.category})`}
                                    initial={{ opacity: 0, pathLength: 0 }}
                                    animate={{ opacity: 0.7, pathLength: 1 }}
                                    transition={{ duration: 1, delay: index * 0.15 }}
                                />
                                
                                {/* Animated particles */}
                                <motion.circle
                                    r="3"
                                    fill={flow.color}
                                    initial={{ opacity: 0 }}
                                    animate={{
                                        opacity: [0, 1, 1, 0],
                                        cx: [startX, startX, endX, endX],
                                        cy: [0, 40, 120, 160],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: index * 0.3,
                                        ease: 'easeInOut',
                                    }}
                                />
                            </g>
                        );
                    })}

                    {/* Savings flow (if positive) */}
                    {savingsFlow > 0 && (
                        <motion.path
                            d={`
                                M 145 0
                                Q 145 80, 270 160
                                L 285 160
                                Q 155 80, 155 0
                                Z
                            `}
                            fill="url(#savingsGradient)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    )}
                </svg>

                {/* Category labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                    {categoryFlows.map((flow, index) => (
                        <motion.div
                            key={flow.category}
                            className="text-center"
                            style={{ width: '55px' }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                        >
                            <div
                                className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1"
                                style={{ backgroundColor: `${flow.color}30`, border: `1px solid ${flow.color}50` }}
                            >
                                <span className="text-xs font-bold" style={{ color: flow.color }}>
                                    {flow.percentage.toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-[8px] text-foreground-muted truncate">{flow.category}</p>
                        </motion.div>
                    ))}
                    
                    {/* Savings box */}
                    {savingsFlow > 0 && (
                        <motion.div
                            className="text-center"
                            style={{ width: '55px' }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.3 }}
                        >
                            <div className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-1 bg-primary/20 border border-primary/40">
                                <span className="text-xs font-bold text-primary">
                                    {savingsPercentage.toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-[8px] text-foreground-muted">Savings</p>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Bottom summary */}
            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-foreground-muted">In: ${monthlyIncome.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-foreground-muted">Out: ${monthlySpending.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className={savingsFlow >= 0 ? 'text-success' : 'text-destructive'}>
                        {savingsFlow >= 0 ? '+' : ''}${savingsFlow.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
