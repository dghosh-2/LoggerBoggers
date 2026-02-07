'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Wallet,
    TrendingDown,
    PiggyBank,
    AlertTriangle,
} from 'lucide-react';

interface BudgetOverviewProps {
    onOpenAdjust?: () => void;
}

export function BudgetOverview({ onOpenAdjust }: BudgetOverviewProps) {
    const { currentMonth, alerts, rebalanceBudget, isLoading } = useBudgetStore();

    if (!currentMonth) {
        return null;
    }

    const savingsProgress = currentMonth.savingsTarget > 0
        ? (currentMonth.savingsActual / currentMonth.savingsTarget) * 100
        : 0;

    const spendingProgress = currentMonth.totalBudget > 0
        ? (currentMonth.totalSpent / currentMonth.totalBudget) * 100
        : 0;

    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Overview</h2>
                    <p className="text-xs text-foreground-muted">What you can spend and how you are tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenAdjust && (
                        <GlassButton
                            onClick={onOpenAdjust}
                            variant="secondary"
                            size="sm"
                        >
                            Adjust
                        </GlassButton>
                    )}
                    <GlassButton
                        onClick={rebalanceBudget}
                        disabled={isLoading}
                        variant="primary"
                        size="sm"
                    >
                        {isLoading ? 'Updating...' : 'Update'}
                    </GlassButton>
                </div>
            </div>

            {unacknowledgedAlerts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        <span className="text-sm text-foreground">
                            {unacknowledgedAlerts[0].message}
                        </span>
                    </div>
                    {unacknowledgedAlerts.length > 1 && (
                        <span className="text-warning text-sm">
                            +{unacknowledgedAlerts.length - 1} more
                        </span>
                    )}
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-secondary text-foreground-muted">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-foreground-muted">Available</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-foreground-muted">Safe to spend</p>
                        <p className="text-2xl font-semibold text-foreground">
                            ${currentMonth.safeToSpend.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                    </div>
                    <p className="text-xs text-foreground-muted mt-3">
                        {currentMonth.daysRemaining} days left
                    </p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-secondary text-foreground-muted">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-foreground-muted">This month</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-foreground-muted">Total spending</p>
                        <p className="text-2xl font-semibold text-foreground">
                            ${currentMonth.totalSpent.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground-muted">Budget ${currentMonth.totalBudget.toLocaleString()}</span>
                            <span className="text-foreground-muted">{spendingProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(spendingProgress, 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full bg-primary"
                            />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-secondary text-foreground-muted">
                            <PiggyBank className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-foreground-muted">Goal</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-foreground-muted">Savings</p>
                        <p className="text-2xl font-semibold text-foreground">
                            ${currentMonth.savingsActual.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </p>
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground-muted">Target ${currentMonth.savingsTarget.toLocaleString()}</span>
                            <span className="text-foreground-muted">{savingsProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(savingsProgress, 100)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className="h-full rounded-full bg-primary"
                            />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </section>
    );
}
