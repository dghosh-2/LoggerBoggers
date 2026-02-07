'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgetStore } from '@/stores/budgetStore';
import { PlaidGate } from '@/components/budget/PlaidGate';
import { BudgetOverview } from '@/components/budget/BudgetOverview';
import { SavingsGoalsGrid } from '@/components/budget/SavingsGoalsGrid';
import { CategoryBreakdown } from '@/components/budget/CategoryBreakdown';
import { UpcomingEvents } from '@/components/budget/UpcomingEvents';
import { BudgetInsights } from '@/components/budget/BudgetInsights';
import { CreateGoalModal } from '@/components/budget/CreateGoalModal';
import { AdjustBudgetModal } from '@/components/budget/AdjustBudgetModal';
import { PageTransition } from '@/components/layout/page-transition';
import { Loader2 } from 'lucide-react';

export default function BudgetPage() {
    return (
        <PageTransition>
            <PlaidGate>
                <BudgetPageContent />
            </PlaidGate>
        </PageTransition>
    );
}

function BudgetPageContent() {
    const {
        isLoading,
        isInitialized,
        initialize,
    } = useBudgetStore();

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    // Initialize budget data on mount
    useEffect(() => {
        initialize();
    }, [initialize]);

    // Show loading state
    if (isLoading && !isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-400">Loading your budget...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Create Goal Modal */}
            <CreateGoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
            />

            {/* Adjust Budget Modal */}
            <AdjustBudgetModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
            />

            {/* Main Content */}
            <div className="min-h-screen pb-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-6 pb-8 px-4 md:px-6"
                >
                    <h1 className="text-3xl font-bold text-white mb-2">Budget</h1>
                    <p className="text-gray-400">
                        Your AI-powered financial autopilot
                    </p>
                </motion.div>

                {/* Sections */}
                <div className="px-4 md:px-6 space-y-8">
                    {/* Section 1: Overview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <BudgetOverview />
                    </motion.div>

                    {/* Section 2: Savings Goals */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <SavingsGoalsGrid onCreateGoal={() => setIsGoalModalOpen(true)} />
                    </motion.div>

                    {/* Section 3: Category Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <CategoryBreakdown onAdjustBudgets={() => setIsAdjustModalOpen(true)} />
                    </motion.div>

                    {/* Section 4: Upcoming Events */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <UpcomingEvents />
                    </motion.div>

                    {/* Section 5: AI Insights */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <BudgetInsights />
                    </motion.div>
                </div>
            </div>
        </>
    );
}
