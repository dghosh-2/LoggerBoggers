"use client";

import React, { useMemo } from 'react';
import { MOCK_INSIGHTS, MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { Sparkles, TrendingUp, Calendar, Repeat, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInsightsStore } from '@/stores/insights-store';

export function TrendsView() {
    const { setExplainingInsightId } = useInsightsStore();

    // SIMPLE CALCULATION ENGINE (No future projections)
    // 1. Calculate Previous Month Total
    // 2. Calculate Current Month Total

    const stats = useMemo(() => {
        const now = new Date('2026-02-15'); // Mock Current Date
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Helper to sum transactions for a given month
        const getSum = (m: number, y: number) => MOCK_TRANSACTIONS
            .filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === m && d.getFullYear() === y;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const currentTotal = getSum(currentMonth, currentYear);
        const prevTotal = getSum(prevMonth, prevYear);

        return {
            current: { label: "Feb '26", amount: currentTotal },
            previous: { label: "Jan '26", amount: prevTotal }
        };
    }, []);

    const getIcon = (id: string, severity: string) => {
        if (severity === 'critical') return <TrendingUp className="w-5 h-5 text-red-500" />;
        if (id.includes('season')) return <Calendar className="w-5 h-5 text-pink-500" />;
        if (id.includes('rec')) return <Repeat className="w-5 h-5 text-blue-500" />;
        return <Sparkles className="w-5 h-5 text-primary" />;
    };

    const TrendCard = ({ title, dateLabel, amount, type }: { title: string, dateLabel: string, amount: number, type: 'past' | 'present' }) => (
        <div className={cn(
            "p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden transition-all duration-300",
            type === 'present'
                ? "bg-primary/5 border-primary/20"
                : "bg-card border-border"
        )}>
            <div className="flex justify-between items-start mb-2">
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    type === 'present'
                        ? "bg-primary/20 text-primary-foreground border-primary/30"
                        : "bg-secondary text-foreground-muted border-border"
                )}>{title}</span>
                <span className="text-xs text-foreground-muted font-medium">{dateLabel}</span>
            </div>

            <div className="text-2xl font-mono font-bold text-foreground mb-1">
                ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Simple sparkline or visual indicator could go here */}
            <div className="text-xs text-foreground-muted">
                {type === 'present' ? 'Month to Date' : 'Finalized'}
            </div>
        </div>
    );

    return (
        <div className="min-h-full w-full pt-16 p-8 pb-24 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-accent/10 rounded-xl">
                    <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Trend Intelligence</h2>
                    <p className="text-foreground-muted text-sm">AI-detected patterns and insights (Historical Only)</p>
                </div>
            </div>

            {/* Timeline Cards - ONLY Previous and Current */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <TrendCard title="Previous" dateLabel={stats.previous.label} amount={stats.previous.amount} type="past" />
                <TrendCard title="Current" dateLabel={stats.current.label} amount={stats.current.amount} type="present" />
            </div>

            {/* Insight Grid */}
            <h3 className="text-lg font-semibold text-foreground mt-8 mb-4">Detected Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_INSIGHTS.map((insight) => (
                    <div
                        key={insight.id}
                        // onClick={() => setExplainingInsightId(insight.id)} // Disabled for now as panel might not be ready
                        className={cn(
                            "cursor-pointer group relative p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] shadow-sm",
                            insight.severity === 'critical' ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" :
                                insight.severity === 'warning' ? "bg-warning/5 border-warning/20 hover:border-warning/40" :
                                    "bg-card border-border hover:border-foreground/20"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-secondary border border-border">
                                {getIcon(insight.id, insight.severity)}
                            </div>
                            <span className={cn(
                                "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                                insight.confidence === 'High' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                                    "bg-secondary text-foreground-muted border-border"
                            )}>
                                {insight.confidence} Conf.
                            </span>
                        </div>

                        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                            {insight.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                            {insight.drivers.map((driver, i) => (
                                <p key={i} className="text-sm text-foreground-muted flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                                    <span>{driver}</span>
                                </p>
                            ))}
                        </div>

                        {insight.changePercentage && (
                            <div className="absolute bottom-6 right-6 flex items-center">
                                {insight.changePercentage.startsWith('+')
                                    ? <ArrowUpRight className="w-4 h-4 text-red-500 mr-1" />
                                    : <ArrowDownRight className="w-4 h-4 text-emerald-500 mr-1" />
                                }
                                <span className={cn(
                                    "text-xl font-mono font-bold",
                                    insight.changePercentage.startsWith('+') ? "text-red-500" : "text-emerald-500"
                                )}>
                                    {insight.changePercentage}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
