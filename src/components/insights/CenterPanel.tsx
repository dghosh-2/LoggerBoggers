"use client";

import React from 'react';
import { useInsightsStore } from '@/stores/insights-store';
import { ExpensesPieChart } from '@/components/graph/expenses-pie-chart';
import { cn } from '@/lib/utils';

import { ViewSwitcher } from './ViewSwitcher';
import { CalendarView } from './CalendarView';
import { AnalysisView } from './AnalysisView';
import { SubscriptionsView } from './SubscriptionsView';

export function CenterPanel() {
    const { currentView, selectedCategory, selectedDate } = useInsightsStore();

    // Show side panel if either a category or date is selected
    const showSidePanel = selectedCategory || selectedDate;

    return (
        <section className={cn(
            "flex flex-col relative card-elevated h-full overflow-hidden transition-all duration-300",
            showSidePanel ? "col-span-9" : "col-span-12"
        )}>
            {/* Switcher Floating on Top */}
            <ViewSwitcher />

            {/* Subtle Grid Pattern Background */}
            <div
                className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, var(--foreground-muted) 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Main View Area */}
            <div className="flex-1 relative overflow-auto z-10">
                {currentView === 'graph' && <ExpensesPieChart />}
                {currentView === 'calendar' && <CalendarView />}
                {currentView === 'analysis' && <AnalysisView />}
                {currentView === 'subscriptions' && <SubscriptionsView />}
            </div>

            {/* Range Selector - Bottom Bar */}
            {currentView === 'graph' && (
                <RangeSelector />
            )}
        </section>
    );
}

function RangeSelector() {
    const { selectedRange, setSelectedRange } = useInsightsStore();

    const ranges = [
        { id: 'MTD', label: 'This Month' },
        { id: '3M', label: '3 Months' },
        { id: 'YR', label: 'Year' },
    ] as const;

    return (
        <div className="h-14 border-t border-border bg-card/50 backdrop-blur z-20 shrink-0 flex items-center justify-center gap-2 px-4">
            {ranges.map((range) => (
                <button
                    key={range.id}
                    onClick={() => setSelectedRange(range.id)}
                    className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                        selectedRange === range.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground-muted hover:text-foreground hover:bg-secondary"
                    )}
                >
                    {range.label}
                </button>
            ))}
        </div>
    );
}
