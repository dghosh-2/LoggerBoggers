'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Lightbulb,
    AlertTriangle,
    Trophy,
    TrendingUp,
    X,
    ArrowRight,
    Sparkles,
} from 'lucide-react';
import type { BudgetInsight, InsightType } from '@/types/budget';

const INSIGHT_CONFIG: Record<InsightType, {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    optimization: {
        icon: <Lightbulb className="w-5 h-5" />,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    warning: {
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    achievement: {
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
    },
    pattern: {
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
};

export function BudgetInsights() {
    const { insights, dismissInsight, adjustCategoryBudget } = useBudgetStore();

    const handleAction = async (insight: BudgetInsight) => {
        if (!insight.isActionable || !insight.actionType) return;

        try {
            switch (insight.actionType) {
                case 'adjust_budget':
                    if (insight.actionPayload?.category) {
                        // This would typically open a modal
                        console.log('Adjust budget for:', insight.actionPayload.category);
                    }
                    break;
                default:
                    console.log('Action:', insight.actionType, insight.actionPayload);
            }
        } catch (error) {
            console.error('Failed to execute insight action:', error);
        }
    };

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
                        We'll analyze your spending patterns and provide personalized insights soon.
                    </p>
                </GlassCard>
            </section>
        );
    }

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-semibold text-white">AI Insights</h2>
            </div>

            {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                    <InsightCard
                        key={insight.id}
                        insight={insight}
                        index={index}
                        onDismiss={() => dismissInsight(insight.id)}
                        onAction={() => handleAction(insight)}
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <GlassCard className={`p-4 border ${config.borderColor}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                            {config.icon}
                        </div>
                        <h3 className="font-semibold text-white">{insight.title}</h3>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-3">{insight.description}</p>

                {/* Impact */}
                {insight.impact && (
                    <div className={`p-3 rounded-lg ${config.bgColor} mb-3`}>
                        <p className={`text-sm font-medium ${config.color}`}>{insight.impact}</p>
                    </div>
                )}

                {/* Action Button */}
                {insight.isActionable && (
                    <button
                        onClick={onAction}
                        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg ${config.bgColor} ${config.color} hover:opacity-80 transition-opacity text-sm font-medium`}
                    >
                        Apply Recommendation
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </GlassCard>
        </motion.div>
    );
}
