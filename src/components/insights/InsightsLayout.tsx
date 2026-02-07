"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bell, Calendar } from 'lucide-react';
import { InsightsFeed } from './InsightsFeed';
import { CenterPanel } from './CenterPanel';
import { ExplainerPanel } from './ExplainerPanel';
import { SimulationModal } from './SimulationModal';
import { BudgetModal } from './BudgetModal';
import { PageTransition } from '@/components/layout/page-transition';
import { toast } from '@/components/ui/toast';

export function InsightsLayout() {
    const handleNotifications = () => {
        toast.info("No new notifications");
    };

    const handleCalendar = () => {
        toast.info("Calendar view available in the switcher above!");
    };

    return (
        <PageTransition>
            <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
                <ExplainerPanel />
                <SimulationModal />
                <BudgetModal />

                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Insights
                        </h1>
                        <p className="text-foreground-muted mt-1">
                            Explore your spending patterns and trends
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            className="p-2.5 rounded-xl bg-secondary border border-border"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNotifications}
                        >
                            <Bell className="w-5 h-5 text-foreground-muted" />
                        </motion.button>
                        <motion.button
                            className="p-2.5 rounded-xl bg-secondary border border-border"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCalendar}
                        >
                            <Calendar className="w-5 h-5 text-foreground-muted" />
                        </motion.button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
                    {/* Left: Category Details (when selected) */}
                    <InsightsFeed />

                    {/* Center: Main Visualization */}
                    <CenterPanel />
                </div>
            </div>
        </PageTransition>
    );
}
