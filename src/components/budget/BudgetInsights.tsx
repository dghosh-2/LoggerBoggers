'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useBudgetStore } from '@/stores/budgetStore';
import { InsightReasoningPanel } from './InsightReasoningPanel';
import {
    Lightbulb,
    AlertTriangle,
    Trophy,
    TrendingUp,
    X,
    ArrowRight,
} from 'lucide-react';
import type { BudgetInsight, InsightType } from '@/types/budget';

const INSIGHT_CONFIG: Record<InsightType, {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    actionLabel: string;
}> = {
    optimization: {
        icon: <Lightbulb className="w-5 h-5" />,
        color: 'text-foreground',
        bgColor: 'bg-secondary',
        borderColor: 'border-border',
        actionLabel: 'Apply',
    },
    warning: {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-foreground',
        bgColor: 'bg-secondary',
        borderColor: 'border-border',
        actionLabel: 'Fix',
    },
    achievement: {
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-foreground',
        bgColor: 'bg-secondary',
        borderColor: 'border-border',
        actionLabel: 'Save',
    },
    pattern: {
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-foreground',
        bgColor: 'bg-secondary',
        borderColor: 'border-border',
        actionLabel: 'View',
    },
};

export function BudgetInsights() {
    const { insights, dismissInsight, applyInsightRecommendation } = useBudgetStore();

    if (insights.length === 0) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">Insights</h2>
                </div>
                <GlassCard className="p-8 text-center">
                    <p className="text-foreground-muted">
                        Insights will appear here once we have enough data.
                    </p>
                </GlassCard>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Insights</h2>
                    <p className="text-xs text-foreground-muted">Simple suggestions based on your spending</p>
                </div>
                <span className="text-sm text-foreground-muted">
                    {insights.filter(i => i.isActionable).length} actionable
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                    <InsightCard
                        key={insight.id}
                        insight={insight}
                        index={index}
                        onDismiss={() => dismissInsight(insight.id)}
                        onAction={() => applyInsightRecommendation(insight.id)}
                    />
                ))}
            </div>
        </section>
    );
}

interface InsightCardProps {
    insight: BudgetInsight;
    index: number;
    onDismiss: () => void;
    onAction: () => void;
}

function InsightCard({ insight, index, onDismiss, onAction }: InsightCardProps) {
    const config = INSIGHT_CONFIG[insight.insightType];
    const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
    const [isApplied, setIsApplied] = useState(false);

    const handleAction = async () => {
        setIsApplied(true);
        onAction();
        setTimeout(() => {
            onDismiss();
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <GlassCard className={`p-4 border ${config.borderColor} transition-all`}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                            {config.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground text-sm">{insight.title}</h3>
                            <span className="text-xs text-foreground-muted capitalize">
                                {insight.insightType}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-sm text-foreground-muted mb-3 leading-relaxed">{insight.description}</p>

                {insight.impact && (
                    <div className="p-2.5 rounded-lg bg-secondary mb-3">
                        <p className="text-sm font-medium text-foreground">
                            Impact: {insight.impact}
                        </p>
                    </div>
                )}

                {insight.reasoning && (
                    <InsightReasoningPanel
                        reasoning={insight.reasoning}
                        isExpanded={isReasoningExpanded}
                        onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
                    />
                )}

                {insight.isActionable && (
                    <GlassButton
                        onClick={handleAction}
                        disabled={isApplied}
                        variant="secondary"
                        size="md"
                        className="w-full mt-3"
                    >
                        {isApplied ? 'Saved' : config.actionLabel}
                        {!isApplied && <ArrowRight className="w-4 h-4" />}
                    </GlassButton>
                )}
            </GlassCard>
        </motion.div>
    );
}
