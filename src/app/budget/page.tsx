'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useBudgetStore } from '@/stores/budgetStore';
import { PlaidGate } from '@/components/budget/PlaidGate';
import { BudgetOverview } from '@/components/budget/BudgetOverview';
import { SavingsGoalsGrid } from '@/components/budget/SavingsGoalsGrid';
import { BudgetFlowChart } from '@/components/budget/BudgetFlowChart';
import { CreateGoalModal } from '@/components/budget/CreateGoalModal';
import { AdjustBudgetModal } from '@/components/budget/AdjustBudgetModal';
import { PageTransition } from '@/components/layout/page-transition';
import { GlassCard } from '@/components/ui/glass-card';
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

    useEffect(() => {
        initialize();
    }, [initialize]);

    if (isLoading && !isInitialized) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Budget</h1>
                    <p className="text-foreground-muted text-xs md:text-sm mt-0.5 md:mt-1">Loading your budget...</p>
                </div>
                <GlassCard className="py-14">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                        <p className="text-foreground-muted">One moment</p>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <>
            <CreateGoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
            />

            <AdjustBudgetModal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
            />

            <div className="flex flex-col gap-6 md:gap-8 pb-12">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Budget</h1>
                    <p className="text-foreground-muted text-xs md:text-sm mt-0.5 md:mt-1">
                        Simple overview of your money this month
                    </p>
                </div>

                <div className="space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <BudgetOverview onOpenAdjust={() => setIsAdjustModalOpen(true)} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                    >
                        <SavingsGoalsGrid onCreateGoal={() => setIsGoalModalOpen(true)} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <BudgetFlowChart />
                    </motion.div>
                </div>
            </div>
        </>
    );
}
