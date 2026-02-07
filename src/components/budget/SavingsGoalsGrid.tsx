'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Target,
    Plus,
    Calendar,
    ChevronRight,
    TrendingUp,
    Clock,
} from 'lucide-react';
import type { SavingsGoal } from '@/types/budget';

interface SavingsGoalsGridProps {
    onCreateGoal?: () => void;
}

export function SavingsGoalsGrid({ onCreateGoal }: SavingsGoalsGridProps) {
    const { savingsGoals, setSelectedGoal } = useBudgetStore();

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Savings Goals</h2>
                <button
                    onClick={onCreateGoal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Goal
                </button>
            </div>

            {/* Goals Grid */}
            {savingsGoals.length === 0 ? (
                <GlassCard className="p-8 text-center">
                    <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No savings goals yet</p>
                    <button
                        onClick={onCreateGoal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Goal
                    </button>
                </GlassCard>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3">
                    {savingsGoals.map((goal, index) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            index={index}
                            onClick={() => setSelectedGoal(goal)}
                        />
                    ))}

                    {/* Add Goal Card */}
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: savingsGoals.length * 0.1 }}
                        onClick={onCreateGoal}
                        className="min-w-[280px] md:min-w-0 h-[180px] rounded-xl border-2 border-dashed border-gray-700 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-emerald-400 transition-colors"
                    >
                        <Plus className="w-8 h-8" />
                        <span>Add Goal</span>
                    </motion.button>
                </div>
            )}
        </section>
    );
}

interface GoalCardProps {
    goal: SavingsGoal;
    index: number;
    onClick: () => void;
}

function GoalCard({ goal, index, onClick }: GoalCardProps) {
    const percentComplete = goal.percentComplete || 0;

    const statusColors = {
        on_track: 'text-emerald-400 bg-emerald-500/20',
        behind: 'text-amber-400 bg-amber-500/20',
        ahead: 'text-blue-400 bg-blue-500/20',
        completed: 'text-purple-400 bg-purple-500/20',
    };

    const statusLabels = {
        on_track: 'On Track',
        behind: 'Behind',
        ahead: 'Ahead',
        completed: 'Complete',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="min-w-[280px] md:min-w-0"
        >
            <GlassCard
                className="p-5 h-full cursor-pointer hover:ring-1 hover:ring-emerald-500/30 transition-all"
                onClick={onClick}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                            <Target className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white truncate max-w-[160px]">{goal.name}</h3>
                            {goal.category && (
                                <p className="text-xs text-gray-500">{goal.category}</p>
                            )}
                        </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[goal.status]}`}>
                        {statusLabels[goal.status]}
                    </span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-gray-400">
                            ${goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-white font-medium">
                            ${goal.targetAmount.toLocaleString()}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentComplete, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${goal.status === 'completed' ? 'bg-purple-500' :
                                    goal.status === 'ahead' ? 'bg-blue-500' :
                                        goal.status === 'behind' ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                }`}
                        />
                    </div>
                    <div className="mt-1 text-right">
                        <span className="text-xs text-gray-500">{percentComplete.toFixed(0)}% complete</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                    {goal.deadline ? (
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {goal.daysRemaining !== undefined
                                    ? `${goal.daysRemaining} days left`
                                    : new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                }
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>No deadline</span>
                        </div>
                    )}

                    {goal.requiredWeekly && goal.status !== 'completed' && (
                        <div className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>${Math.round(goal.requiredWeekly)}/wk</span>
                        </div>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    );
}
