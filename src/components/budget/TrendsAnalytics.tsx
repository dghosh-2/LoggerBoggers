'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    ChevronDown,
    Edit3,
} from 'lucide-react';
import type { TrendAnalytics, CategoryTrend } from '@/types/budget';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Area,
    AreaChart,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════════════════
// COLORS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_COLORS: Record<string, string> = {
    Dining: '#f97316',
    Shopping: '#a855f7',
    Entertainment: '#3b82f6',
    Groceries: '#22c55e',
    Transportation: '#eab308',
    Utilities: '#06b6d4',
    Healthcare: '#ec4899',
    Housing: '#6366f1',
    Other: '#6b7280',
};

function getCategoryColor(category: string): string {
    return CATEGORY_COLORS[category] || '#6b7280';
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(monthStr: string): string {
    const [, m] = monthStr.split('-');
    return MONTH_SHORT[parseInt(m) - 1] || monthStr;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

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
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Trends & Analytics</h2>
                </div>
                <GlassCard className="p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                        Not enough transaction data yet for trend analysis.
                    </p>
                </GlassCard>
            </section>
        );
    }

    // Get meaningful trends (non-zero data)
    const meaningfulTrends = analytics.categoryTrends.filter(
        t => t.dataPoints.some(d => d.value > 0)
    );

    const activeCategoryTrend = selectedCategory
        ? meaningfulTrends.find(t => t.category === selectedCategory)
        : meaningfulTrends[0];

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Trends & Analytics</h2>
                </div>
                <div className="flex items-center gap-1 text-sm">
                    {analytics.monthOverMonthChange !== 0 && (
                        <span className={`flex items-center gap-1 ${
                            analytics.monthOverMonthChange > 0 ? 'text-amber-400' : 'text-emerald-400'
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

            {/* Chart Tab Selector */}
            <div className="flex gap-2">
                {[
                    { id: 'trends', label: 'Spending Trends', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                    { id: 'dayofweek', label: 'Day Patterns', icon: <Calendar className="w-3.5 h-3.5" /> },
                    { id: 'categories', label: 'Top Categories', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveChart(tab.id as typeof activeChart)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeChart === tab.id
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'text-gray-500 hover:text-gray-300 border border-transparent'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Chart Area */}
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

            {/* Trend Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {meaningfulTrends
                    .filter(t => t.direction !== 'stable')
                    .slice(0, 4)
                    .map(trend => (
                        <TrendSummaryCard
                            key={trend.category}
                            trend={trend}
                            onClick={() => {
                                setSelectedCategory(trend.category);
                                setActiveChart('trends');
                            }}
                        />
                    ))
                }
            </div>
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPENDING TRENDS CHART (Line)
// ═══════════════════════════════════════════════════════════════════════════

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
        <GlassCard className="p-4 border border-gray-700/50">
            {/* Category Selector */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    {trends.slice(0, 6).map(t => (
                        <button
                            key={t.category}
                            onClick={() => onSelectCategory(t.category)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                (selectedCategory || trends[0].category) === t.category
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                            style={{
                                backgroundColor:
                                    (selectedCategory || trends[0].category) === t.category
                                        ? getCategoryColor(t.category) + '33'
                                        : 'transparent',
                                borderColor: getCategoryColor(t.category) + '44',
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
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-700/50 transition-all"
                    >
                        <Edit3 className="w-3 h-3" />
                        Edit Budget
                    </button>
                )}
            </div>

            {/* Chart */}
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                            <linearGradient id={`grad-${activeTrend.category}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} />
                        <YAxis
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
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

            {/* Trend Info */}
            <div className="flex items-center justify-between mt-3 text-xs">
                <div className="flex items-center gap-1">
                    {activeTrend.direction === 'increasing' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    ) : activeTrend.direction === 'decreasing' ? (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                        <Minus className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span className={
                        activeTrend.direction === 'increasing' ? 'text-amber-400' :
                        activeTrend.direction === 'decreasing' ? 'text-emerald-400' : 'text-gray-500'
                    }>
                        {activeTrend.direction === 'stable'
                            ? 'Stable'
                            : `${activeTrend.slope > 0 ? '+' : ''}$${activeTrend.slope.toFixed(0)}/mo`
                        }
                    </span>
                </div>
                <span className="text-gray-500">
                    Projected next month: ${activeTrend.projectedNextMonth.toLocaleString()}
                </span>
            </div>
        </GlassCard>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY OF WEEK CHART (Bar)
// ═══════════════════════════════════════════════════════════════════════════

function DayOfWeekChart({ data }: { data: TrendAnalytics['dayOfWeekData'] }) {
    const maxAvg = Math.max(...data.map(d => d.average));

    return (
        <GlassCard className="p-4 border border-gray-700/50">
            <p className="text-sm text-gray-400 mb-4">Average spending per transaction by day</p>

            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="day"
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={d => d.slice(0, 3)}
                        />
                        <YAxis
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            axisLine={false}
                            tickFormatter={v => `$${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: 12,
                            }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            formatter={((value: number) => [`$${value}`, 'Avg/transaction']) as any}
                        />
                        <Bar
                            dataKey="average"
                            radius={[4, 4, 0, 0]}
                            fill="#3b82f6"
                        >
                            {data.map((entry, index) => {
                                const isWeekend = entry.day === 'Saturday' || entry.day === 'Sunday';
                                return (
                                    <rect
                                        key={index}
                                        fill={isWeekend && entry.average > maxAvg * 0.8 ? '#f97316' : '#3b82f6'}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Weekend vs Weekday Summary */}
            <div className="flex justify-between mt-3 text-xs">
                <span className="text-gray-500">
                    Weekday avg: ${data.filter(d => !['Saturday', 'Sunday'].includes(d.day)).reduce((sum, d) => sum + d.average, 0) / 5 | 0}
                </span>
                <span className="text-gray-500">
                    Weekend avg: ${data.filter(d => ['Saturday', 'Sunday'].includes(d.day)).reduce((sum, d) => sum + d.average, 0) / 2 | 0}
                </span>
            </div>
        </GlassCard>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP CATEGORIES CHART (Horizontal Bar)
// ═══════════════════════════════════════════════════════════════════════════

function TopCategoriesChart({
    data,
    onEditCategory,
}: {
    data: TrendAnalytics['topCategories'];
    onEditCategory?: (category: string) => void;
}) {
    const maxTotal = Math.max(...data.map(d => d.total));

    return (
        <GlassCard className="p-4 border border-gray-700/50">
            <p className="text-sm text-gray-400 mb-4">Spending by category (all time)</p>

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
                                <span className="text-sm text-white">{cat.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">
                                    ${cat.total.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-600">
                                    {cat.percentOfBudget}%
                                </span>
                                {onEditCategory && (
                                    <button
                                        onClick={() => onEditCategory(cat.category)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-white transition-all"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
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

// ═══════════════════════════════════════════════════════════════════════════
// TREND SUMMARY CARD
// ═══════════════════════════════════════════════════════════════════════════

function TrendSummaryCard({
    trend,
    onClick,
}: {
    trend: CategoryTrend;
    onClick: () => void;
}) {
    const isUp = trend.direction === 'increasing';

    return (
        <button
            onClick={onClick}
            className="p-3 rounded-xl bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/50 transition-all text-left w-full"
        >
            <div className="flex items-center gap-1.5 mb-1">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getCategoryColor(trend.category) }}
                />
                <span className="text-xs text-gray-400 truncate">{trend.category}</span>
            </div>
            <div className="flex items-center gap-1">
                {isUp ? (
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className={`text-sm font-semibold ${isUp ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {trend.slope > 0 ? '+' : ''}${trend.slope.toFixed(0)}/mo
                </span>
            </div>
        </button>
    );
}
