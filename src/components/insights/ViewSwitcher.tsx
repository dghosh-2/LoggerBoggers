"use client";

import React from 'react';
import { Network, CalendarDays, PieChart, Sparkles } from 'lucide-react';
import { useInsightsStore } from '@/stores/insights-store';
import { cn } from '@/lib/utils';

export function ViewSwitcher() {
    const { currentView, setCurrentView } = useInsightsStore();

    const views = [
        { id: 'graph', label: 'Graph', icon: Network },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'analysis', label: 'Analysis', icon: PieChart },
        { id: 'trends', label: 'Trends', icon: Sparkles },
    ] as const;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-background/80 backdrop-blur-md border border-border rounded-full p-1 shadow-md">
            {views.map((view) => {
                const Icon = view.icon;
                const isActive = currentView === view.id;

                return (
                    <button
                        key={view.id}
                        onClick={() => setCurrentView(view.id)}
                        className={cn(
                            "flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-foreground-muted hover:text-foreground hover:bg-secondary"
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{view.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
