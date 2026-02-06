"use client";

import React from 'react';
import { InsightsFeed } from './InsightsFeed';
import { CenterPanel } from './CenterPanel';
import { TalkCopilot } from './TalkCopilot';
import { ExplainerPanel } from './ExplainerPanel';
import { SimulationModal } from './SimulationModal';
import { BudgetModal } from './BudgetModal';

export function InsightsLayout() {
    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
            <ExplainerPanel />
            <SimulationModal />
            <BudgetModal />
            {/* 2. Main Content Grid */}
            <main className="flex-1 grid grid-cols-12 overflow-hidden">

                {/* Left Col: Insights Feed (25%) */}
                <aside className="col-span-3 border-r border-border bg-background/50 overflow-hidden backdrop-blur-sm">
                    <InsightsFeed />
                </aside>

                {/* Center Col: Graph + Timeline (50%) - The "Stage" */}
                <CenterPanel />

                {/* Right Col: Copilot (25%) */}
                <aside className="col-span-3 border-l border-border bg-card shadow-2xl z-10">
                    <TalkCopilot />
                </aside>

            </main>
        </div>
    );
}
