"use client";

import React from 'react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { FinancialGraphViewer } from './FinancialGraphViewer';
import { CalendarView } from './CalendarView';
import { AnalysisView } from './AnalysisView';
import { ViewSwitcher } from './ViewSwitcher';
import { InsightsTimeline } from './InsightsTimeline';
import { TrendsView } from './TrendsView';

export function CenterPanel() {
    const { currentView } = useInsightsStore();

    return (
        <section className="col-span-6 flex flex-col relative bg-black/40 h-full overflow-hidden">
            {/* Switcher Floating on Top */}
            <ViewSwitcher />

            {/* Grid Pattern Background */}
            <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }}
            />

            {/* Main View Area */}
            <div className="flex-1 p-0 relative overflow-auto z-10">
                {currentView === 'graph' && <FinancialGraphViewer />}
                {currentView === 'calendar' && <CalendarView />}
                {currentView === 'analysis' && <AnalysisView />}
                {currentView === 'trends' && <TrendsView />}
            </div>

            {/* Timeline Area (Bottom of Center) - Only show on Graph View? Or all? 
            Let's keep it on Graph View for now, maybe hide on Calendar since Calendar is full screen.
        */}
            {currentView === 'graph' && (
                <div className="h-48 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur z-20 shrink-0">
                    <InsightsTimeline />
                </div>
            )}
        </section>
    );
}
