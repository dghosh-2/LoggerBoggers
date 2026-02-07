'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Wallet,
    TrendingDown,
    PiggyBank,
    AlertTriangle,
    ChevronRight,
    Settings,
    Sparkles,
} from 'lucide-react';

export function BudgetOverview() {
    const { currentMonth, alerts, config, rebalanceBudget, isLoading } = useBudgetStore();

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
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Overview</h2>
                <button
                    onClick={rebalanceBudget}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium hover:from-emerald-600 hover:to-blue-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Sparkles className="w-4 h-4" />
                    {isLoading ? 'Rebalancing...' : 'AI Rebalance'}
                </button>
            </div>

            {/* Alert Banner */}
            {unacknowledgedAlerts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <span className="text-amber-200">
                            {unacknowledgedAlerts[0].message}
                        </span>
                    </div>
                    {unacknowledgedAlerts.length > 1 && (
                        <span className="text-amber-400 text-sm">
                            +{unacknowledgedAlerts.length - 1} more
                        </span>
                    )}
                </motion.div>
            )}

            {/* Hero Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Safe to Spend */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-gray-400">Today</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-400">Safe to Spend</p>
                        <p className="text-3xl font-bold text-white">
                            ${currentMonth.safeToSpend.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        {currentMonth.daysRemaining} days left in month
                    </p>
                </GlassCard>

                {/* This Month Spending */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <TrendingDown className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-xs text-gray-400">This Month</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-400">Total Spending</p>
                        <p className="text-3xl font-bold text-white">
                            ${currentMonth.totalSpent.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">of ${currentMonth.totalBudget.toLocaleString()} budget</span>
                            <span className={spendingProgress > 90 ? 'text-red-400' : spendingProgress > 75 ? 'text-amber-400' : 'text-emerald-400'}>
                                {spendingProgress.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(spendingProgress, 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${spendingProgress > 90 ? 'bg-red-500' :
                                    spendingProgress > 75 ? 'bg-amber-500' :
                                        'bg-emerald-500'
                                    }`}
                            />
                        </div>
                    </div>
                </GlassCard>

                {/* Savings Progress */}
                <GlassCard className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <PiggyBank className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-400">
                            {config?.priority === 'aggressive' ? '30%' :
                                config?.priority === 'balanced' ? '20%' : '10%'} target
                        </span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-gray-400">Savings Progress</p>
                        <p className="text-3xl font-bold text-white">
                            ${currentMonth.savingsActual.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </p>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">of ${currentMonth.savingsTarget.toLocaleString()} goal</span>
                            <span className={savingsProgress >= 100 ? 'text-emerald-400' : savingsProgress >= 50 ? 'text-blue-400' : 'text-amber-400'}>
                                {savingsProgress.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(savingsProgress, 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className={`h-full rounded-full ${savingsProgress >= 100 ? 'bg-emerald-500' :
                                    savingsProgress >= 50 ? 'bg-blue-500' :
                                        'bg-amber-500'
                                    }`}
                            />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </section>
    );
}
