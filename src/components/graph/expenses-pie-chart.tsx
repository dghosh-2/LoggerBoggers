"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useInsightsStore } from '@/stores/insights-store';
import { useThemeStore } from '@/stores/theme-store';
import { useFinancialData } from '@/hooks/useFinancialData';
import { Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass-button';

// Monochrome + accent palette
const LIGHT_COLORS = [
    '#18181B', // primary
    '#6366F1', // indigo
    '#3F3F46', // zinc dark
    '#16A34A', // green
    '#71717A', // zinc mid
    '#A1A1AA', // zinc light
];

const DARK_COLORS = [
    '#FAFAFA', // primary
    '#818CF8', // indigo
    '#A1A1AA', // zinc light
    '#4ADE80', // green
    '#71717A', // zinc mid
    '#52525B', // zinc dark
];

interface CategoryData {
    name: string;
    value: number;
    color: string;
}

export function ExpensesPieChart() {
    const router = useRouter();
    const { selectedRange, setSelectedCategory, selectedCategory } = useInsightsStore();
    const { theme } = useThemeStore();
    const { transactions, isConnected, loading } = useFinancialData();
    const [mounted, setMounted] = React.useState(false);

    const COLORS = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const categoryData = useMemo(() => {
        if (!mounted || !isConnected || transactions.length === 0) return [];

        const now = new Date();
        const rangeTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            if (selectedRange === 'MTD') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            } else if (selectedRange === '3M') {
                const threeMonthsAgo = new Date(now);
                threeMonthsAgo.setMonth(now.getMonth() - 3);
                return date >= threeMonthsAgo;
            } else if (selectedRange === 'YR') {
                const twelveMonthsAgo = new Date(now);
                twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
                return date >= twelveMonthsAgo;
            }
            return true;
        });

        const categoryTotals: Record<string, number> = {};
        rangeTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        // Sort by value and get total
        let sortedData = Object.entries(categoryTotals)
            .map(([name, value]) => ({
                name,
                value: Math.round(value * 100) / 100,
            }))
            .sort((a, b) => b.value - a.value);

        const total = sortedData.reduce((sum, cat) => sum + cat.value, 0);

        // Keep top 5 categories, group rest into "Other"
        const MAX_CATEGORIES = 5;
        let finalData: CategoryData[] = [];
        let otherTotal = 0;

        sortedData.forEach((item, index) => {
            if (index < MAX_CATEGORIES) {
                finalData.push({
                    ...item,
                    color: COLORS[index % COLORS.length]
                });
            } else {
                otherTotal += item.value;
            }
        });

        // Add "Other" category if there are more than MAX_CATEGORIES
        if (otherTotal > 0) {
            finalData.push({
                name: 'Other',
                value: Math.round(otherTotal * 100) / 100,
                color: theme === 'dark' ? '#6b6860' : '#9ca3af'
            });
        }

        return finalData;
    }, [selectedRange, mounted, COLORS, theme, transactions, isConnected]);

    const totalSpend = useMemo(() => {
        return categoryData.reduce((sum, cat) => sum + cat.value, 0);
    }, [categoryData]);

    const handleClick = (data: CategoryData) => {
        if (selectedCategory === data.name) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(data.name);
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = totalSpend > 0 ? ((data.value / totalSpend) * 100).toFixed(1) : '0.0';
            return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
                    <p className="text-sm font-semibold text-foreground">{data.name}</p>
                    <p className="text-xs text-foreground-muted">
                        ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    if (!mounted) return null;

    // Show connect prompt if not connected
    if (!isConnected) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8">
                <div className="p-4 rounded-full bg-secondary mb-4">
                    <Link2 className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Accounts</h3>
                <p className="text-sm text-foreground-muted text-center mb-6 max-w-[300px]">
                    Link your bank accounts via Plaid to see your spending breakdown and insights
                </p>
                <GlassButton 
                    variant="primary" 
                    size="md"
                    onClick={() => router.push('/imports')}
                >
                    Connect via Plaid
                </GlassButton>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 pt-16 relative">
            {/* Header Overlay */}
            <div className="absolute top-16 left-6 z-10 flex flex-col space-y-2">
                <div className="px-4 py-3 rounded-xl bg-card/95 dark:bg-card/90 border border-border backdrop-blur-md shadow-lg">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-foreground-muted mb-1">
                        Total Spending
                    </div>
                    <div className="text-2xl font-mono font-bold text-foreground">
                        ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                        {categoryData.length} categories
                    </div>
                </div>
            </div>

            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        cx="50%"
                        cy="42%"
                        innerRadius={70}
                        outerRadius={130}
                        paddingAngle={2}
                        dataKey="value"
                        onClick={(_, index) => handleClick(categoryData[index])}
                        style={{ cursor: 'pointer', outline: 'none' }}
                    >
                        {categoryData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke={selectedCategory === entry.name ? 'var(--background)' : 'transparent'}
                                strokeWidth={selectedCategory === entry.name ? 3 : 0}
                                opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}
                                style={{ 
                                    transition: 'opacity 0.3s ease, stroke-width 0.2s ease',
                                }}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '16px', paddingBottom: '8px' }}
                        formatter={(value) => <span className="text-xs text-foreground-muted">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Label - shows selected category */}
            {selectedCategory && (
                <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                    <div className="font-medium text-primary text-sm">{selectedCategory}</div>
                </div>
            )}
        </div>
    );
}
