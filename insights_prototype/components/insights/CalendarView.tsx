"use client";

import React, { useState } from 'react';
import { MOCK_TRANSACTIONS } from '@/data/fake_data';
import { useInsightsStore } from '@/store/useInsightsStore';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Zap, X } from 'lucide-react';
import { calculateMonthlyProjection } from '@/data/projection_engine';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Mock subscriptions for calendar
const SUBSCRIPTIONS = [
    { date: 15, name: 'Netflix', amount: 16 },
    { date: 28, name: 'Spotify', amount: 12 },
    { date: 1, name: 'Rent', amount: 2450 },
];

export function CalendarView() {
    const { selectedCategory, selectedMonth, setSelectedMonth } = useInsightsStore();
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
    const projection = calculateMonthlyProjection(year, month);
    const actualSum = MOCK_TRANSACTIONS
        .filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        })
        .reduce((sum, t) => sum + t.amount, 0);

    const isFuture = projection.isFuture;
    const displayTotal = isFuture ? projection.total : actualSum;

    // Generate calendar grid
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOffset = firstDayOfMonth.getDay(); // 0=Sun...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarDays = [];

    // Pad empty days
    for (let i = 0; i < startDayOffset; i++) {
        calendarDays.push({ day: null });
    }

    // Fill actual days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dayStr = `${yyyy}-${mm}-${dd}`;

        const dailyTransactions = MOCK_TRANSACTIONS.filter(t => {
            const isSameDay = t.date === dayStr;
            const isSameCategory = selectedCategory ? t.category === selectedCategory : true;
            return isSameDay && isSameCategory;
        });

        const amount = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
        let sub = SUBSCRIPTIONS.find(s => s.date === i);
        if (selectedCategory && selectedCategory !== 'Subscriptions') {
            sub = undefined;
        }

        calendarDays.push({ day: i, amount, sub, transactions: dailyTransactions });
    }

    // Get intensity color based on amount
    const getIntensity = (amount: number) => {
        if (amount === 0) return 'bg-zinc-900 border-zinc-800';
        if (amount < 100) return 'bg-emerald-900/40 border-emerald-900/60';
        if (amount < 500) return 'bg-emerald-700/60 border-emerald-600/60';
        if (amount < 1500) return 'bg-emerald-600 border-emerald-500';
        return 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
    };

    const handlePrevMonth = () => {
        const prev = new Date(year, month - 1, 1);
        setSelectedMonth(prev.toLocaleString('default', { month: 'short', year: 'numeric' }));
        setSelectedDay(null);
    };

    const handleNextMonth = () => {
        const next = new Date(year, month + 1, 1);
        setSelectedMonth(next.toLocaleString('default', { month: 'short', year: 'numeric' }));
        setSelectedDay(null);
    };

    // Day Detail Data
    const selectedDayData = selectedDay ? calendarDays.find(d => d.day === selectedDay) : null;

    return (
        <div className="min-h-full w-full pt-16 p-8 pb-24 flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center justify-between w-full max-w-4xl mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center mb-1">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <span className={cn(
                            "text-sm font-mono font-bold px-2 py-0.5 rounded",
                            isFuture ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                        )}>
                            {isFuture ? 'PROJECTED' : 'TOTAL SPENT'}
                        </span>
                        <span className="text-xl font-mono font-bold text-white">
                            ${displayTotal.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="flex space-x-2">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNextMonth} className="p-2 rounded-full border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="w-full max-w-4xl grid grid-cols-7 gap-3 mb-8">
                {DAYS.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-zinc-500 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}

                {calendarDays.map((date, idx) => (
                    <div
                        key={idx}
                        onClick={() => date.day && setSelectedDay(date.day)}
                        className={cn(
                            "aspect-square rounded-xl border relative p-3 flex flex-col justify-between transition-all duration-300",
                            date.day ? "cursor-pointer hover:scale-[1.02]" : "",
                            date.day === selectedDay ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 z-10" : "",
                            date.day
                                ? getIntensity(date.amount || 0)
                                : "bg-transparent border-transparent"
                        )}
                    >
                        {date.day && (
                            <>
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        date.amount && date.amount > 1500 ? "text-white" : "text-zinc-400"
                                    )}>
                                        {date.day}
                                    </span>
                                    {date.sub && (
                                        <div className="flex bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-full border border-blue-500/30 items-center">
                                            <Zap className="w-2 h-2 mr-1 fill-current" />
                                            <span className="hidden sm:inline">{date.sub.name}</span>
                                        </div>
                                    )}
                                </div>

                                {date.amount !== undefined && date.amount > 0 && (
                                    <div className="mt-auto">
                                        <span className={cn(
                                            "text-xs font-mono font-medium block",
                                            date.amount > 1500 ? "text-white" : "text-zinc-300"
                                        )}>
                                            ${date.amount.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Selected Day Detail Panel */}
            {selectedDayData && (
                <div className="w-full max-w-4xl bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">
                            {selectedMonth} {selectedDayData.day}
                        </h3>
                        <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {selectedDayData.transactions && selectedDayData.transactions.length > 0 ? (
                        <div className="space-y-2">
                            {selectedDayData.transactions.map((t, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                            {t.merchant ? t.merchant[0] : t.category[0]}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-white">{t.merchant || t.category}</div>
                                            <div className="text-xs text-zinc-500">{t.category}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono text-zinc-300">
                                        ${t.amount.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-sm text-center py-4">
                            No transactions on this day.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
