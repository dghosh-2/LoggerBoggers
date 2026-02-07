"use client";

import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useInsightsStore } from '@/stores/insights-store';
import { useThemeStore } from '@/stores/theme-store';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass-button';

// Monochrome + accent palette
const LIGHT_COLORS = [
    '#18181B', // primary black
    '#6366F1', // indigo accent
    '#3F3F46', // zinc dark
    '#16A34A', // green
    '#71717A', // zinc mid
    '#A1A1AA', // zinc light
];

const DARK_COLORS = [
    '#FAFAFA', // primary white
    '#818CF8', // indigo accent
    '#A1A1AA', // zinc light
    '#4ADE80', // green
    '#71717A', // zinc mid
    '#52525B', // zinc dark
];

export function AnalysisView() {
    const router = useRouter();
    const { selectedRange } = useInsightsStore();
    const { theme } = useThemeStore();
    const { transactions, isConnected, loading } = useFinancialData();

    const COLORS = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    // Get top 5 categories by total spend from real data
    const topCategories = useMemo(() => {
        if (!isConnected || transactions.length === 0) return [];
        
        const categoryTotals: Record<string, number> = {};
        transactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        
        return Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
    }, [transactions, isConnected]);

    // 1. Aggregate Transactions by Month, condensing small categories into "Other"
    const chartData = useMemo(() => {
        if (!isConnected || transactions.length === 0) return [];
        
        const dataMap = new Map<string, any>();

        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

            if (selectedRange === '3M') {
                const cutoff = new Date();
                cutoff.setMonth(cutoff.getMonth() - 3);
                if (date < cutoff) return;
            }

            if (!dataMap.has(monthKey)) {
                dataMap.set(monthKey, {
                    monthKey,
                    month: monthLabel,
                    total: 0
                });
            }

            const entry = dataMap.get(monthKey);
            
            // Group into top categories or "Other"
            const category = topCategories.includes(t.category) ? t.category : 'Other';
            entry[category] = (entry[category] || 0) + t.amount;
            entry.total += t.amount;
        });

        return Array.from(dataMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [selectedRange, topCategories, transactions, isConnected]);

    // Categories to display (top 5 + Other) - ensure unique
    const displayCategories = useMemo(() => {
        const cats = [...new Set(topCategories)]; // Ensure unique
        const hasOther = chartData.some(d => d['Other'] > 0);
        if (hasOther && !cats.includes('Other')) cats.push('Other');
        return cats;
    }, [topCategories, chartData]);

    // Map categories to colors
    const getCategoryColor = (category: string, index: number) => {
        if (category === 'Other') return COLORS[5];
        return COLORS[index % 5];
    };

    // Show connect prompt if not connected
    if (!loading && !isConnected) {
        return (
            <div className="h-full w-full pt-16 p-8 flex flex-col">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Monthly Spending</h2>
                    <p className="text-foreground-muted text-sm">Analyze your spending trends over time</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="p-4 rounded-full bg-secondary mb-4">
                        <Link2 className="w-8 h-8 text-foreground-muted" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Connect Your Accounts</h3>
                    <p className="text-sm text-foreground-muted text-center mb-6 max-w-[400px]">
                        Link your bank accounts via Plaid to see spending analysis
                    </p>
                    <GlassButton 
                        variant="primary" 
                        size="md"
                        onClick={() => router.push('/imports')}
                    >
                        Connect via Plaid
                    </GlassButton>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full pt-16 p-8 flex flex-col">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Monthly Spending</h2>
                <p className="text-foreground-muted text-sm">Analyze your spending trends over time</p>
            </div>

            <div className="flex-1 min-h-0 card-elevated p-6">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        stackOffset="sign"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                            dataKey="month"
                            stroke="var(--foreground-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="var(--foreground-muted)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

                                    return (
                                        <div className="bg-popover border border-border p-3 rounded-xl shadow-xl backdrop-blur-sm">
                                            <p className="text-foreground font-semibold mb-2">{label}</p>
                                            <div className="space-y-1.5 mb-2">
                                                {payload.map((p: any, idx: number) => (
                                                    p.value > 0 && (
                                                        <div key={idx} className="flex items-center justify-between text-xs w-44">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="text-foreground-muted">{p.name}</span>
                                                            </div>
                                                            <span className="font-mono text-foreground">${Math.round(p.value).toLocaleString()}</span>
                                                        </div>
                                                    )
                                                )).reverse()}
                                            </div>
                                            <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold text-foreground">
                                                <span>Total</span>
                                                <span>${Math.round(total).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend 
                            wrapperStyle={{ paddingTop: '16px' }} 
                            formatter={(value) => <span className="text-xs text-foreground-muted">{value}</span>} 
                        />
                        {displayCategories.map((cat, index) => (
                            <Bar
                                key={cat}
                                dataKey={cat}
                                stackId="a"
                                fill={getCategoryColor(cat, index)}
                                radius={index === displayCategories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
