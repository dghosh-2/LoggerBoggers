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
    { id: '3m', label: '3 Months', months: 3 },
    { id: '6m', label: '6 Months', months: 6 },
    { id: '1y', label: '1 Year', months: 12 },
    { id: 'all', label: 'All Time', months: 24 },
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

    // Load baseline on mount
    useEffect(() => {
        loadBaseline();
    }, [loadBaseline]);

    // Handle range change
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

    // Calculate summary stats
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                                <Clock className="w-6 h-6 text-purple-400" />
                            </div>
                            Time Machine
                        </h1>
                        <p className="text-foreground-muted mt-1">
                            Rewind your money and try again — see how different choices would change today
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedOps.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={clearOperations}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Reset Changes
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                    {TIME_RANGES.map((range) => (
                        <motion.button
                            key={range.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRangeChange(range.id)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                selectedRange === range.id
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "bg-secondary/50 text-foreground-muted hover:text-foreground border border-transparent"
                            )}
                        >
                            {range.label}
                        </motion.button>
                    ))}
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Timeline & Summary */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Diverging Timeline Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-elevated p-5"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10">
                                        <GitBranch className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">Timeline</h3>
                                        <p className="text-xs text-foreground-muted">
                                            {branch ? 'Showing alternate reality' : 'Your financial history'}
                                        </p>
                                    </div>
                                </div>
                                {branch && delta && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-sm font-semibold",
                                            delta.netWorthDelta >= 0
                                                ? "bg-success/10 text-success"
                                                : "bg-destructive/10 text-destructive"
                                        )}
                                    >
                                        {delta.netWorthDelta >= 0 ? '+' : ''}${delta.netWorthDelta.toLocaleString()}
                                    </motion.div>
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
                                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <Rewind className="w-4 h-4 text-purple-400" />
                                        Active Changes ({selectedOps.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedOps.map((op, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
                                            >
                                                <span className="text-sm">
                                                    {op.description || `${op.type}: ${(op as any).eventId || (op as any).category || (op as any).seriesId}`}
                                                </span>
                                                <button
                                                    onClick={() => useTimeMachineStore.getState().removeOperation(i)}
                                                    className="p-1 rounded-lg hover:bg-destructive/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Column - Regret Leaderboard & Events */}
                    <div className="space-y-6">
                        {/* Regret Leaderboard */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card-elevated p-5"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                    <Award className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">Regret Leaderboard</h3>
                                    <p className="text-xs text-foreground-muted">
                                        Top decisions to undo
                                    </p>
                                </div>
                            </div>
                            <RegretLeaderboard />
                        </motion.div>

                        {/* Quick Stats */}
                        {stats && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="card-elevated p-5"
                            >
                                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-primary" />
                                    Period Summary
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground-muted">Transactions</span>
                                        <span className="font-mono font-semibold">{stats.totalEvents}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground-muted">Total Spent</span>
                                        <span className="font-mono font-semibold text-destructive">
                                            ${stats.totalSpent.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground-muted">Avg Monthly</span>
                                        <span className="font-mono font-semibold">
                                            ${stats.avgMonthly.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-border">
                                        <span className="text-sm text-foreground-muted">Net Savings</span>
                                        <span className={cn(
                                            "font-mono font-semibold",
                                            stats.savings >= 0 ? "text-success" : "text-destructive"
                                        )}>
                                            ${stats.savings.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Event List (scrollable) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card-elevated p-5"
                        >
                            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
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
                            <div className="flex items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border shadow-lg">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm font-medium">Computing timeline...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
