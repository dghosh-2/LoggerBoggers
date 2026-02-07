'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface WealthPulseProps {
    monthlyTrend: Array<{
        month: string;
        income: number;
        spending: number;
    }>;
    isConnected: boolean;
}

export function WealthPulse({ monthlyTrend, isConnected }: WealthPulseProps) {
    const { pathData, incomePoints, spendingPoints, maxValue, savings } = useMemo(() => {
        if (!isConnected || monthlyTrend.length === 0) {
            return { pathData: '', incomePoints: [], spendingPoints: [], maxValue: 0, savings: [] };
        }

        const data = monthlyTrend.slice(-8); // Last 8 months
        const max = Math.max(
            ...data.map(d => Math.max(d.income, d.spending)),
            1
        );
        
        const width = 360;
        const height = 180;
        const padding = 20;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        
        const incomePoints: { x: number; y: number; value: number; month: string }[] = [];
        const spendingPoints: { x: number; y: number; value: number; month: string }[] = [];
        const savingsData: { month: string; amount: number; percentage: number }[] = [];
        
        data.forEach((item, index) => {
            const x = padding + (index / (data.length - 1)) * graphWidth;
            const incomeY = padding + graphHeight - (item.income / max) * graphHeight;
            const spendingY = padding + graphHeight - (item.spending / max) * graphHeight;
            
            incomePoints.push({ x, y: incomeY, value: item.income, month: item.month });
            spendingPoints.push({ x, y: spendingY, value: item.spending, month: item.month });
            
            const saved = item.income - item.spending;
            const savingsRate = item.income > 0 ? (saved / item.income) * 100 : 0;
            savingsData.push({ month: item.month, amount: saved, percentage: savingsRate });
        });
        
        // Create smooth curve path for income
        const createPath = (points: typeof incomePoints) => {
            if (points.length < 2) return '';
            
            let path = `M ${points[0].x} ${points[0].y}`;
            
            for (let i = 0; i < points.length - 1; i++) {
                const current = points[i];
                const next = points[i + 1];
                const midX = (current.x + next.x) / 2;
                
                path += ` Q ${current.x + 20} ${current.y}, ${midX} ${(current.y + next.y) / 2}`;
            }
            
            const last = points[points.length - 1];
            path += ` T ${last.x} ${last.y}`;
            
            return path;
        };
        
        return {
            pathData: createPath(incomePoints),
            incomePoints,
            spendingPoints,
            maxValue: max,
            savings: savingsData,
        };
    }, [monthlyTrend, isConnected]);

    const avgSavingsRate = useMemo(() => {
        if (savings.length === 0) return 0;
        return savings.reduce((sum, s) => sum + s.percentage, 0) / savings.length;
    }, [savings]);

    if (!isConnected) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <motion.div 
                        className="w-16 h-1 bg-secondary rounded-full mx-auto mb-3"
                        animate={{ scaleX: [1, 1.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <p className="text-sm text-foreground-muted">Connect accounts to see wealth pulse</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header stats */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-foreground-muted font-medium">Avg Savings Rate</p>
                    <p className={`text-xl font-bold font-mono ${avgSavingsRate >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {avgSavingsRate.toFixed(1)}%
                    </p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-foreground-muted">Income</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-foreground-muted">Spending</span>
                    </div>
                </div>
            </div>

            {/* Pulse visualization */}
            <div className="flex-1 relative">
                <svg className="w-full h-full" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Income gradient */}
                        <linearGradient id="incomeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                        </linearGradient>
                        
                        {/* Spending gradient */}
                        <linearGradient id="spendingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--destructive)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0" />
                        </linearGradient>
                        
                        {/* Glow filter */}
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map((ratio) => (
                        <line
                            key={ratio}
                            x1="20"
                            y1={20 + 140 * (1 - ratio)}
                            x2="340"
                            y2={20 + 140 * (1 - ratio)}
                            stroke="var(--border)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.3"
                        />
                    ))}

                    {/* Income area fill */}
                    {incomePoints.length > 1 && (
                        <motion.path
                            d={`${incomePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} L ${incomePoints[incomePoints.length - 1].x} 160 L ${incomePoints[0].x} 160 Z`}
                            fill="url(#incomeGradient)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1 }}
                        />
                    )}

                    {/* Income line */}
                    {incomePoints.length > 1 && (
                        <motion.polyline
                            points={incomePoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="var(--success)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#glow)"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    )}

                    {/* Spending line */}
                    {spendingPoints.length > 1 && (
                        <motion.polyline
                            points={spendingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="var(--destructive)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="6 3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                        />
                    )}

                    {/* Income points with pulse */}
                    {incomePoints.map((point, i) => (
                        <g key={`income-${i}`}>
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="var(--success)"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 + i * 0.1 }}
                            />
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="var(--success)"
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 2, opacity: 0 }}
                                transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity, 
                                    delay: i * 0.2,
                                    repeatDelay: 1
                                }}
                            />
                        </g>
                    ))}

                    {/* Month labels */}
                    {incomePoints.map((point, i) => (
                        <text
                            key={`label-${i}`}
                            x={point.x}
                            y="175"
                            textAnchor="middle"
                            className="fill-foreground-muted text-[9px]"
                        >
                            {point.month}
                        </text>
                    ))}
                </svg>

                {/* Floating heartbeat indicator */}
                <motion.div
                    className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <motion.div
                        className="w-2 h-2 rounded-full bg-success"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-[9px] font-medium text-success">Healthy</span>
                </motion.div>
            </div>

            {/* Bottom savings bar */}
            <div className="mt-2 flex gap-1">
                {savings.map((s, i) => (
                    <motion.div
                        key={s.month}
                        className="flex-1 h-6 rounded-md relative overflow-hidden"
                        style={{
                            background: s.amount >= 0 
                                ? `linear-gradient(to top, var(--success) ${Math.min(100, s.percentage)}%, transparent ${Math.min(100, s.percentage)}%)`
                                : `linear-gradient(to top, var(--destructive) ${Math.min(100, Math.abs(s.percentage))}%, transparent ${Math.min(100, Math.abs(s.percentage))}%)`,
                            backgroundColor: 'var(--secondary)',
                        }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                        title={`${s.month}: ${s.amount >= 0 ? '+' : ''}$${s.amount.toLocaleString()}`}
                    />
                ))}
            </div>
        </div>
    );
}
