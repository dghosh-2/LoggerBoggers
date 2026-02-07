'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Target,
    Plus,
    Calendar,
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Savings Goals</h2>
                    <p className="text-xs text-foreground-muted">Track progress toward the things you care about</p>
                </div>
                <GlassButton
                    onClick={onCreateGoal}
                    variant="secondary"
                    size="sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Goal
                </GlassButton>
            </div>

            {savingsGoals.length === 0 ? (
                <GlassCard className="p-8 text-center">
                    <Target className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                    <p className="text-foreground-muted mb-4">No savings goals yet</p>
                    <GlassButton onClick={onCreateGoal} variant="secondary" size="md">
                        <Plus className="w-4 h-4" />
                        Create Goal
                    </GlassButton>
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

                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: savingsGoals.length * 0.1 }}
                        onClick={onCreateGoal}
                        className="min-w-[280px] md:min-w-0 h-[180px] rounded-lg border border-dashed border-border hover:border-border-strong flex flex-col items-center justify-center gap-3 text-foreground-muted hover:text-foreground transition-colors"
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
        on_track: 'text-foreground bg-secondary',
        behind: 'text-warning bg-warning-soft',
        ahead: 'text-foreground bg-secondary',
        completed: 'text-success bg-success-soft',
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
                className="p-5 h-full cursor-pointer transition-all"
                onClick={onClick}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary text-foreground-muted">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground truncate max-w-[160px]">{goal.name}</h3>
                            {goal.category && (
                                <p className="text-xs text-foreground-muted">{goal.category}</p>
                            )}
                        </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[goal.status]}`}>
                        {statusLabels[goal.status]}
                    </span>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-foreground-muted">
                            ${goal.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-foreground font-medium">
                            ${goal.targetAmount.toLocaleString()}
                        </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentComplete, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-primary"
                        />
                    </div>
                    <div className="mt-1 text-right">
                        <span className="text-xs text-foreground-muted">{percentComplete.toFixed(0)}% complete</span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    {goal.deadline ? (
                        <div className="flex items-center gap-1.5 text-foreground-muted">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {goal.daysRemaining !== undefined
                                    ? `${goal.daysRemaining} days left`
                                    : new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                }
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-foreground-muted">
                            <Clock className="w-4 h-4" />
                            <span>No deadline</span>
                        </div>
                    )}

                    {goal.requiredWeekly && goal.status !== 'completed' && (
                        <div className="flex items-center gap-1 text-foreground-muted">
                            <TrendingUp className="w-4 h-4" />
                            <span>${Math.round(goal.requiredWeekly)}/wk</span>
                        </div>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    );
}
