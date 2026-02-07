'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Rewind,
    GitBranch,
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    Sparkles,
    RotateCcw,
    ChevronRight,
    Trash2,
    Percent,
    Calendar,
    DollarSign,
    Zap,
    Award,
} from 'lucide-react';
import { PageTransition } from '@/components/layout/page-transition';
import { GlassCard } from '@/components/ui/glass-card';
import { useTimeMachineStore } from '@/stores/timemachine-store';
import { DivergingTimeline } from '@/components/timemachine/DivergingTimeline';
import { RegretLeaderboard } from '@/components/timemachine/RegretLeaderboard';
import { DeltaSummary } from '@/components/timemachine/DeltaSummary';
import { EventList } from '@/components/timemachine/EventList';
import { cn } from '@/lib/utils';

const TIME_RANGES = [
    { id: '3m', label: '3M', months: 3 },
    { id: '6m', label: '6M', months: 6 },
    { id: '1y', label: '1Y', months: 12 },
    { id: 'all', label: 'All', months: 24 },
];

export default function TimeMachinePage() {
    const {
        dateRange,
        setDateRange,
        baseline,
        branch,
        delta,
        selectedOps,
        regretCandidates,
        events,
        isLoading,
        loadBaseline,
        clearOperations,
        reset,
    } = useTimeMachineStore();

    const [selectedRange, setSelectedRange] = useState('6m');

    useEffect(() => {
        loadBaseline();
    }, [loadBaseline]);

    const handleRangeChange = (rangeId: string) => {
        setSelectedRange(rangeId);
        const range = TIME_RANGES.find(r => r.id === rangeId);
        if (range) {
            const end = new Date('2026-02-01');
            const start = new Date('2026-02-01');
            start.setMonth(start.getMonth() - range.months);
            setDateRange({
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            });
        }
    };

    const stats = useMemo(() => {
        if (!baseline) return null;
        return {
            totalEvents: events.length,
            totalSpent: baseline.totalExpenses,
            avgMonthly: Math.round(baseline.totalExpenses / baseline.months.length),
            savings: baseline.totalSavings,
        };
    }, [baseline, events]);

    return (
        <PageTransition>
            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Time Machine
                        </h1>
                        <p className="text-foreground-muted text-sm mt-1">
                            Rewind your money and try again
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedOps.length > 0 && (
                            <button
                                onClick={clearOperations}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-1 p-0.5 bg-secondary rounded-md w-fit">
                    {TIME_RANGES.map((range) => (
                        <button
                            key={range.id}
                            onClick={() => handleRangeChange(range.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer",
                                selectedRange === range.id
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Diverging Timeline Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-elevated p-5"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-md bg-accent/10">
                                        <GitBranch className="w-3.5 h-3.5 text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-xs">Timeline</h3>
                                        <p className="text-[11px] text-foreground-muted">
                                            {branch ? 'Showing alternate reality' : 'Your financial history'}
                                        </p>
                                    </div>
                                </div>
                                {branch && delta && (
                                    <div
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums",
                                            delta.netWorthDelta >= 0
                                                ? "bg-success-soft text-success"
                                                : "bg-destructive-soft text-destructive"
                                        )}
                                    >
                                        {delta.netWorthDelta >= 0 ? '+' : ''}${delta.netWorthDelta.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            <DivergingTimeline />
                        </motion.div>

                        {/* Delta Summary Cards */}
                        <AnimatePresence>
                            {delta && (
                                <DeltaSummary delta={delta} />
                            )}
                        </AnimatePresence>

                        {/* Active Operations */}
                        <AnimatePresence>
                            {selectedOps.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="card-elevated p-5"
                                >
                                    <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5">
                                        <Rewind className="w-3.5 h-3.5 text-accent" />
                                        Active Changes ({selectedOps.length})
                                    </h3>
                                    <div className="space-y-1.5">
                                        {selectedOps.map((op, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center justify-between p-2.5 rounded-lg bg-accent/[0.06] border border-accent/10"
                                            >
                                                <span className="text-xs">
                                                    {op.description || `${op.type}: ${(op as any).eventId || (op as any).category || (op as any).seriesId}`}
                                                </span>
                                                <button
                                                    onClick={() => useTimeMachineStore.getState().removeOperation(i)}
                                                    className="p-1 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3 h-3 text-destructive" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        {/* Regret Leaderboard */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="card-elevated p-5"
                        >
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="p-1.5 rounded-md bg-warning/10">
                                    <Award className="w-3.5 h-3.5 text-warning" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-xs">Regret Leaderboard</h3>
                                    <p className="text-[11px] text-foreground-muted">
                                        Top decisions to undo
                                    </p>
                                </div>
                            </div>
                            <RegretLeaderboard />
                        </motion.div>

                        {/* Quick Stats */}
                        {stats && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="card-elevated p-5"
                            >
                                <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    Period Summary
                                </h3>
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-foreground-muted">Transactions</span>
                                        <span className="font-mono text-xs font-semibold tabular-nums">{stats.totalEvents}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-foreground-muted">Total Spent</span>
                                        <span className="font-mono text-xs font-semibold text-destructive tabular-nums">
                                            ${stats.totalSpent.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-foreground-muted">Avg Monthly</span>
                                        <span className="font-mono text-xs font-semibold tabular-nums">
                                            ${stats.avgMonthly.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-border">
                                        <span className="text-xs text-foreground-muted">Net Savings</span>
                                        <span className={cn(
                                            "font-mono text-xs font-semibold tabular-nums",
                                            stats.savings >= 0 ? "text-success" : "text-destructive"
                                        )}>
                                            ${stats.savings.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Event List */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="card-elevated p-5"
                        >
                            <h3 className="font-semibold text-xs mb-3 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                Major Events
                            </h3>
                            <EventList />
                        </motion.div>
                    </div>
                </div>

                {/* Loading Overlay */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50"
                        >
                            <div className="flex items-center gap-2.5 px-5 py-3 rounded-lg bg-card border border-border shadow-lg">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-medium">Computing timeline...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
