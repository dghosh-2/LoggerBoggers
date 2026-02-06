"use client";

import React from 'react';
import { useInsightsStore } from '@/stores/insights-store';
import { ExpensesPieChart } from '@/components/graph/expenses-pie-chart';

// Placeholders for other views if not yet ported, or we can port them too.
// For now, simpler is better, assuming 'graph' view defaults to Pie Chart.
// We can expand this later if Calendar/Trend views are needed.

import { ViewSwitcher } from './ViewSwitcher';
import { CalendarView } from './CalendarView';
import { AnalysisView } from './AnalysisView';
import { TrendsView } from './TrendsView';

export function CenterPanel() {
    const { currentView } = useInsightsStore();

    return (
        <section className="col-span-6 flex flex-col relative bg-secondary/5 h-full overflow-hidden">
            {/* Switcher Floating on Top */}
            <ViewSwitcher />

            {/* Grid Pattern Background */}
            <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--foreground-muted) 1px, transparent 0)', backgroundSize: '24px 24px' }}
            />

            {/* Main View Area */}
            <div className="flex-1 p-0 relative overflow-auto z-10">
                {currentView === 'graph' && <ExpensesPieChart />}
                {currentView === 'calendar' && <CalendarView />}
                {currentView === 'analysis' && <AnalysisView />}
                {currentView === 'trends' && <TrendsView />}
            </div>

            {/* Timeline Placeholder - Only show on Graph for now */}
            {currentView === 'graph' && (
                <div className="h-16 border-t border-border bg-background/80 backdrop-blur z-20 shrink-0 flex items-center justify-center text-foreground-muted text-xs uppercase tracking-widest">
                    Interactive Timeline
                </div>
            )}
        </section>
    );
}
