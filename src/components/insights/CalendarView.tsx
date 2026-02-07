"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { calculateMonthlyProjection } from '@/lib/projection-engine';
import { useInsightsStore } from '@/stores/insights-store';
import { useFinancialData } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass-button';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Empty subscriptions - would be detected from real data
const SUBSCRIPTIONS: Array<{ date: number; name: string; amount: number }> = [];

export function CalendarView() {
    const router = useRouter();
    const {
        selectedCategory,
        selectedMonth,
        setSelectedMonth,
        reductionGoals,
        selectedDate, // From store
        setSelectedDate // From store
    } = useInsightsStore();
    const { transactions, isConnected, loading } = useFinancialData();
    // Removed local selectedDay state

    // Helper to parse "Jan 2026"
    const parseSelectedMonth = () => {
        const parts = selectedMonth.split(' ');
        const monthIdx = new Date(`${parts[0]} 1, 2000`).getMonth();
        const year = parseInt(parts[1]);
        return new Date(year, monthIdx, 1);
    };

    const currentDate = parseSelectedMonth();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Calculate Projection / Actual
    const projection = useMemo(() =>
        calculateMonthlyProjection(year, month, reductionGoals, transactions),
        [year, month, reductionGoals, transactions]
    );

    const actualSum = useMemo(() => {
        if (!isConnected || transactions.length === 0) return 0;
        return transactions
            .filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === month && d.getFullYear() === year;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }, [month, year, transactions, isConnected]);

    const isFuture = projection.isFuture;
    const displayTotal = isFuture ? projection.total : actualSum;

    // Find max daily spend for heatmap scaling
    const maxDailySpend = useMemo(() => {
        if (!isConnected || transactions.length === 0) return 1;

        let max = 0;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const dayStr = dateObj.toISOString().split('T')[0];
            const dayTotal = transactions
                .filter(t => t.date === dayStr)
                .reduce((sum, t) => sum + t.amount, 0);
            if (dayTotal > max) max = dayTotal;
        }
        return max || 1;
    }, [year, month, transactions, isConnected]);

    // Generate calendar grid
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const startDayOffset = firstDayOfMonth.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: any[] = [];

        // Pad empty days
        for (let i = 0; i < startDayOffset; i++) {
            days.push({ day: null });
        }

        // Fill actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dayStr = `${yyyy}-${mm}-${dd}`;

            const dailyTransactions = (!isConnected || transactions.length === 0) ? [] : transactions.filter(t => {
                const isSameDay = t.date === dayStr;
                const isSameCategory = selectedCategory ? t.category === selectedCategory : true;
                return isSameDay && isSameCategory;
            });

            const amount = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);

            // Get all subscriptions for this day
            let subs = SUBSCRIPTIONS.filter(s => s.date === i);
            if (selectedCategory && selectedCategory !== 'Subscriptions' && selectedCategory !== 'Bills' && selectedCategory !== 'Rent') {
                subs = [];
            }

            days.push({ day: i, amount, subs, transactions: dailyTransactions, fullDate: dayStr });
        }

        return days;
    }, [year, month, selectedCategory, transactions, isConnected]);

    // Get heatmap intensity based on amount relative to max (using primary color)
    const getHeatmapStyle = (amount: number) => {
        if (amount === 0) return 'bg-secondary/30 border-border';

        const intensity = Math.min(amount / maxDailySpend, 1);

        if (intensity < 0.15) return 'bg-primary/10 border-primary/20';
        if (intensity < 0.3) return 'bg-primary/20 border-primary/30';
        if (intensity < 0.5) return 'bg-primary/35 border-primary/45';
        if (intensity < 0.75) return 'bg-primary/50 border-primary/60';
        return 'bg-primary/70 border-primary/80 shadow-sm';
    };

    const handlePrevMonth = () => {
        const prev = new Date(year, month - 1, 1);
        setSelectedMonth(prev.toLocaleString('default', { month: 'short', year: 'numeric' }));
        setSelectedDate(null);
    };

    const handleNextMonth = () => {
        const next = new Date(year, month + 1, 1);
        setSelectedMonth(next.toLocaleString('default', { month: 'short', year: 'numeric' }));
        setSelectedDate(null);
    };

    // Helper to check if a day is selected
    const isSelected = (dayInfo: any) => {
        return dayInfo.fullDate === selectedDate;
    };

    return (
        <div className="h-full w-full flex flex-col p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between w-full mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5",
                            isFuture
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                        )}>
                            {isFuture ? <TrendingUp className="w-3 h-3" /> : null}
                            {isFuture ? 'PROJECTED' : 'TOTAL SPENT'}
                        </span>
                        <span className="text-2xl font-mono font-bold text-foreground">
                            ${displayTotal.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        onClick={handlePrevMonth}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2.5 rounded-xl border border-border hover:bg-secondary text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                        onClick={handleNextMonth}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2.5 rounded-xl border border-border hover:bg-secondary text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            {/* Calendar Grid - Scrollable Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden mb-4">
                <div className="w-full grid grid-cols-7 gap-2">
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}

                    {calendarDays.map((date, idx) => (
                        <motion.div
                            key={idx}
                            onClick={() => {
                                if (date.day && date.fullDate) {
                                    if (selectedDate === date.fullDate) {
                                        setSelectedDate(null); // Deselect if clicking same day
                                    } else {
                                        setSelectedDate(date.fullDate);
                                    }
                                }
                            }}
                            whileHover={date.day ? { scale: 1.03 } : {}}
                            whileTap={date.day ? { scale: 0.98 } : {}}
                            className={cn(
                                "aspect-square rounded-xl border relative p-2 flex flex-col transition-all duration-200 overflow-hidden",
                                date.day ? "cursor-pointer" : "",
                                isSelected(date) ? "ring-2 ring-primary ring-offset-2 ring-offset-background z-10 scale-[1.02]" : "",
                                date.day
                                    ? getHeatmapStyle(date.amount || 0)
                                    : "bg-transparent border-transparent"
                            )}
                        >
                            {date.day && (
                                <>
                                    {/* Day number */}
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        date.amount && date.amount > 500 ? "text-foreground" : "text-foreground-muted"
                                    )}>
                                        {date.day}
                                    </span>

                                    {/* Middle section: Subscriptions */}
                                    {date.subs && date.subs.length > 0 && (
                                        <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-hidden">
                                            {date.subs.map((sub: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate bg-secondary/80 text-foreground-muted border border-border"
                                                    title={`${sub.name}: $${sub.amount}`}
                                                >
                                                    {sub.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Bottom: Amount spent */}
                                    {date.amount !== undefined && date.amount > 0 && (
                                        <div className="mt-auto">
                                            <span className={cn(
                                                "text-[11px] font-mono font-medium block",
                                                date.amount > 500 ? "text-foreground" : "text-foreground-muted"
                                            )}>
                                                ${date.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Heatmap Legend */}
            <div className="w-full flex items-center justify-center gap-2 flex-shrink-0">
                <span className="text-xs text-foreground-muted">Less</span>
                <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-secondary/30 border border-border" />
                    <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
                    <div className="w-4 h-4 rounded bg-primary/25 border border-primary/35" />
                    <div className="w-4 h-4 rounded bg-primary/45 border border-primary/55" />
                    <div className="w-4 h-4 rounded bg-primary/65 border border-primary/75" />
                </div>
                <span className="text-xs text-foreground-muted">More</span>
            </div>

            {/* Inline Detail Panel REMOVED - Using global DayDetails side panel now */}
        </div>
    );
}
