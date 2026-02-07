'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import { InsightReasoningPanel } from './InsightReasoningPanel';
import {
    Lightbulb,
    AlertTriangle,
    Trophy,
    TrendingUp,
    X,
    ArrowRight,
    Sparkles,
    Check,
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
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        actionLabel: 'Apply Reallocation',
    },
    warning: {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        actionLabel: 'Fix Now',
    },
    achievement: {
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        actionLabel: 'Celebrate',
    },
    pattern: {
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        actionLabel: 'Take Action',
    },
};

export function BudgetInsights() {
    const { insights, dismissInsight, applyInsightRecommendation } = useBudgetStore();

    if (insights.length === 0) {
        return (
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-xl font-semibold text-white">AI Insights</h2>
                </div>
                <GlassCard className="p-8 text-center">
                    <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                        We&apos;ll analyze your spending patterns and provide personalized insights soon.
                    </p>
                </GlassCard>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-xl font-semibold text-white">AI Insights</h2>
                </div>
                <span className="text-sm text-gray-500">
                    {insights.filter(i => i.isActionable).length} actionable
                </span>
            </div>

            {/* Insights Grid */}
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
        // Auto-dismiss after applying
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
            <GlassCard className={`p-4 border ${config.borderColor} hover:border-opacity-50 transition-all`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                            {config.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">{insight.title}</h3>
                            <span className={`text-xs ${config.color} capitalize`}>
                                {insight.insightType}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-3 leading-relaxed">{insight.description}</p>

                {/* Impact Badge */}
                {insight.impact && (
                    <div className={`p-2.5 rounded-lg ${config.bgColor} mb-3`}>
                        <p className={`text-sm font-medium ${config.color}`}>
                            Impact: {insight.impact}
                        </p>
                    </div>
                )}

                {/* Reasoning Panel (clickable accordion) */}
                {insight.reasoning && (
                    <InsightReasoningPanel
                        reasoning={insight.reasoning}
                        isExpanded={isReasoningExpanded}
                        onToggle={() => setIsReasoningExpanded(!isReasoningExpanded)}
                    />
                )}

                {/* Action Button */}
                {insight.isActionable && (
                    <button
                        onClick={handleAction}
                        disabled={isApplied}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg mt-3 ${
                            isApplied
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : `${config.bgColor} ${config.color} hover:opacity-80`
                        } transition-all text-sm font-medium`}
                    >
                        {isApplied ? (
                            <>
                                <Check className="w-4 h-4" />
                                Applied!
                            </>
                        ) : (
                            <>
                                {config.actionLabel}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                )}
            </GlassCard>
        </motion.div>
    );
}
