'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Edit3,
} from 'lucide-react';
import type { TrendAnalytics, CategoryTrend } from '@/types/budget';
import { normalizeCategory } from '@/lib/categories';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
} from 'recharts';

const CHART_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

function getCategoryColor(category: string): string {
    const key = normalizeCategory(category);
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) % CHART_COLORS.length;
    }
    return CHART_COLORS[hash];
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(monthStr: string): string {
    const [, m] = monthStr.split('-');
    return MONTH_SHORT[parseInt(m, 10) - 1] || monthStr;
}

interface TrendsAnalyticsProps {
    analytics: TrendAnalytics | null;
    onEditCategory?: (category: string) => void;
}

export function TrendsAnalytics({ analytics, onEditCategory }: TrendsAnalyticsProps) {
    const [activeChart, setActiveChart] = useState<'trends' | 'dayofweek' | 'categories'>('trends');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    if (!analytics || analytics.categoryTrends.length === 0) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">Trends</h2>
                </div>
                <GlassCard className="p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                    <p className="text-foreground-muted">
                        Not enough transaction data yet for trends.
                    </p>
                </GlassCard>
            </section>
        );
    }

    const meaningfulTrends = analytics.categoryTrends.filter(
        t => t.dataPoints.some(d => d.value > 0)
    );

    const activeCategoryTrend = selectedCategory
        ? meaningfulTrends.find(t => t.category === selectedCategory)
        : meaningfulTrends[0];

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Trends</h2>
                        <p className="text-xs text-foreground-muted">How spending changes over time</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-sm">
                    {analytics.monthOverMonthChange !== 0 && (
                        <span className={`flex items-center gap-1 ${
                            analytics.monthOverMonthChange > 0 ? 'text-warning' : 'text-success'
                        }`}>
                            {analytics.monthOverMonthChange > 0 ? (
                                <ArrowUpRight className="w-4 h-4" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4" />
                            )}
                            {Math.abs(analytics.monthOverMonthChange)}% vs last month
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                {[
                    { id: 'trends', label: 'Monthly', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                    { id: 'dayofweek', label: 'By Day', icon: <Calendar className="w-3.5 h-3.5" /> },
                    { id: 'categories', label: 'Top Categories', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveChart(tab.id as typeof activeChart)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeChart === tab.id
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-foreground-muted hover:text-foreground border border-transparent'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeChart}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeChart === 'trends' && (
                        <SpendingTrendsChart
                            trends={meaningfulTrends}
                            activeTrend={activeCategoryTrend || null}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            onEditCategory={onEditCategory}
                        />
                    )}
                    {activeChart === 'dayofweek' && (
                        <DayOfWeekChart data={analytics.dayOfWeekData} />
                    )}
                    {activeChart === 'categories' && (
                        <TopCategoriesChart
                            data={analytics.topCategories}
                            onEditCategory={onEditCategory}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </section>
    );
}

function SpendingTrendsChart({
    trends,
    activeTrend,
    selectedCategory,
    onSelectCategory,
    onEditCategory,
}: {
    trends: CategoryTrend[];
    activeTrend: CategoryTrend | null;
    selectedCategory: string | null;
    onSelectCategory: (cat: string | null) => void;
    onEditCategory?: (category: string) => void;
}) {
    if (!activeTrend) return null;

    const chartData = activeTrend.dataPoints.map(dp => ({
        month: formatMonth(dp.month),
        value: Math.round(dp.value),
    }));

    const color = getCategoryColor(activeTrend.category);

    return (
        <GlassCard className="p-4 border border-border">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {trends.slice(0, 6).map(t => (
                        <button
                            key={t.category}
                            onClick={() => onSelectCategory(t.category)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                (selectedCategory || trends[0].category) === t.category
                                    ? 'text-foreground'
                                    : 'text-foreground-muted hover:text-foreground'
                            }`}
                            style={{
                                backgroundColor:
                                    (selectedCategory || trends[0].category) === t.category
                                        ? `${getCategoryColor(t.category)}22`
                                        : 'transparent',
                                borderColor: `${getCategoryColor(t.category)}44`,
                                borderWidth: '1px',
                            }}
                        >
                            {t.category}
                        </button>
                    ))}
                </div>
                {onEditCategory && (
                    <button
                        onClick={() => onEditCategory(activeTrend.category)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-foreground-muted hover:text-foreground hover:bg-secondary transition-all"
                    >
                        <Edit3 className="w-3 h-3" />
                        Edit
                    </button>
                )}
            </div>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                            <linearGradient id={`grad-${activeTrend.category}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} axisLine={false} />
                        <YAxis
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--foreground)',
                                fontSize: 12,
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number) => [`$${value}`, activeTrend.category]) as any}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#grad-${activeTrend.category})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs">
                <div className="flex items-center gap-1">
                    {activeTrend.direction === 'increasing' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-warning" />
                    ) : activeTrend.direction === 'decreasing' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-success" />
                    ) : (
                        <Minus className="w-3.5 h-3.5 text-foreground-muted" />
                    )}
                    <span className={
                        activeTrend.direction === 'increasing' ? 'text-warning' :
                        activeTrend.direction === 'decreasing' ? 'text-success' : 'text-foreground-muted'
                    }>
                        {activeTrend.direction === 'stable'
                            ? 'Stable'
                            : `${activeTrend.slope > 0 ? '+' : ''}$${activeTrend.slope.toFixed(0)}/mo`
                        }
                    </span>
                </div>
                <span className="text-foreground-muted">
                    Next month: ${activeTrend.projectedNextMonth.toLocaleString()}
                </span>
            </div>
        </GlassCard>
    );
}

function DayOfWeekChart({ data }: { data: TrendAnalytics['dayOfWeekData'] }) {
    const maxAvg = Math.max(...data.map(d => d.average));

    return (
        <GlassCard className="p-4 border border-border">
            <p className="text-sm text-foreground-muted mb-4">Average spend per transaction</p>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                            dataKey="day"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={d => d.slice(0, 3)}
                        />
                        <YAxis
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--foreground)',
                                fontSize: 12,
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number) => [`$${value}`, 'Avg/transaction']) as any}
                        />
                        <Bar
                            dataKey="average"
                            radius={[4, 4, 0, 0]}
                            fill="var(--chart-2)"
                        >
                            {data.map((entry, index) => {
                                const isWeekend = entry.day === 'Saturday' || entry.day === 'Sunday';
                                return (
                                    <rect
                                        key={index}
                                        fill={isWeekend && entry.average > maxAvg * 0.8 ? 'var(--chart-4)' : 'var(--chart-2)'}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-between mt-3 text-xs">
                <span className="text-foreground-muted">
                    Weekday avg: ${data.filter(d => !['Saturday', 'Sunday'].includes(d.day)).reduce((sum, d) => sum + d.average, 0) / 5 | 0}
                </span>
                <span className="text-foreground-muted">
                    Weekend avg: ${data.filter(d => ['Saturday', 'Sunday'].includes(d.day)).reduce((sum, d) => sum + d.average, 0) / 2 | 0}
                </span>
            </div>
        </GlassCard>
    );
}

function TopCategoriesChart({
    data,
    onEditCategory,
}: {
    data: TrendAnalytics['topCategories'];
    onEditCategory?: (category: string) => void;
}) {
    const maxTotal = Math.max(...data.map(d => d.total));

    return (
        <GlassCard className="p-4 border border-border">
            <p className="text-sm text-foreground-muted mb-4">Top categories (all time)</p>

            <div className="space-y-3">
                {data.slice(0, 8).map((cat, index) => (
                    <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: getCategoryColor(cat.category) }}
                                />
                                <span className="text-sm text-foreground">{cat.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground-muted">
                                    ${cat.total.toLocaleString()}
                                </span>
                                <span className="text-xs text-foreground-muted">
                                    {cat.percentOfBudget}%
                                </span>
                                {onEditCategory && (
                                    <button
                                        onClick={() => onEditCategory(cat.category)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-foreground-muted hover:text-foreground transition-all"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(cat.total / maxTotal) * 100}%` }}
                                transition={{ duration: 0.6, delay: index * 0.05 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: getCategoryColor(cat.category) }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </GlassCard>
    );
}
