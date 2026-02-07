"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, CalendarDays, BarChart3, CreditCard } from 'lucide-react';
import { useInsightsStore } from '@/stores/insights-store';
import { cn } from '@/lib/utils';

export function ViewSwitcher() {
    const { currentView, setCurrentView } = useInsightsStore();

    const views = [
        { id: 'graph', label: 'Breakdown', icon: PieChart },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'analysis', label: 'Analysis', icon: BarChart3 },
        { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    ] as const;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center bg-card/95 dark:bg-card/90 backdrop-blur-md border border-border rounded-xl p-1.5 shadow-lg">
            {views.map((view) => {
                const Icon = view.icon;
                const isActive = currentView === view.id;

                return (
                    <motion.button
                        key={view.id}
                        onClick={() => setCurrentView(view.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                                ? "text-primary-foreground"
                                : "text-foreground-muted hover:text-foreground"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                            />
                        )}
                        <Icon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">{view.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}
