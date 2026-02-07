"use client";

import React from 'react';
import { Network, CalendarDays, PieChart, Sparkles } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full p-1 shadow-xl">
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
                                ? "bg-zinc-800 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
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
