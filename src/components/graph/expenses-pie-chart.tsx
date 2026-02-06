"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { useInsightsStore } from '@/stores/insights-store';

const COLORS = [
    '#22c55e', // green
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
];

interface CategoryData {
    name: string;
    value: number;
    color: string;
}

export function ExpensesPieChart() {
    const { selectedRange, setSelectedCategory, selectedCategory } = useInsightsStore();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const categoryData = useMemo(() => {
        if (!mounted) return [];

        const now = new Date('2026-02-01');
        const rangeTransactions = MOCK_TRANSACTIONS.filter(t => {
            const date = new Date(t.date);
            if (selectedRange === 'MTD') {
                return date.getMonth() === 0 && date.getFullYear() === 2026;
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

        const data: CategoryData[] = Object.entries(categoryTotals)
            .map(([name, value], index) => ({
                name,
                value: Math.round(value * 100) / 100,
                color: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        return data;
    }, [selectedRange, mounted]);

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

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 relative">
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 z-10 flex flex-col space-y-1">
                <div className="px-3 py-1 rounded-full bg-background/80 border border-border text-xs font-medium text-foreground-muted backdrop-blur-md w-fit">
                    Spending Breakdown
                </div>
                <div className="px-4 py-2 rounded-xl bg-background/80 border border-border backdrop-blur-md shadow-lg">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-0.5">
                        {selectedRange === 'MTD' ? 'This Month' : selectedRange === '3M' ? 'Last 3 Months' : 'Yearly Total'}
                    </div>
                    <div className="text-xl font-mono font-bold text-foreground">
                        ${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
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
                                strokeWidth={selectedCategory === entry.name ? 5 : 0}
                                opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => <span className="text-xs text-foreground-muted">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                        {categoryData.length}
                    </div>
                    <div className="text-xs text-foreground-muted uppercase tracking-wide">
                        Categories
                    </div>
                </div>
            </div>
        </div>
    );
}
