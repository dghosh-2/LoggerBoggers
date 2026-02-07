'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Zap,
    Check,
    X,
    Lightbulb,
    AlertTriangle,
    Trophy,
    TrendingUp,
    ArrowRight,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { BudgetInsight, InsightType } from '@/types/budget';

const QUICK_INSIGHT_ICONS: Record<InsightType, React.ReactNode> = {
    optimization: <Lightbulb className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    achievement: <Trophy className="w-4 h-4" />,
    pattern: <TrendingUp className="w-4 h-4" />,
};

const QUICK_INSIGHT_COLORS: Record<InsightType, { text: string; bg: string; border: string }> = {
    optimization: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    achievement: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    pattern: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
};

interface QuickInsightsProps {
    maxItems?: number;
}

export function QuickInsights({ maxItems = 3 }: QuickInsightsProps) {
    const { insights, dismissInsight, applyInsightRecommendation } = useBudgetStore();
    const [showAll, setShowAll] = useState(false);

    const actionableInsights = insights.filter(i => i.isActionable && !i.dismissed);
    const displayInsights = showAll ? actionableInsights : actionableInsights.slice(0, maxItems);

    if (actionableInsights.length === 0) return null;

    const totalActions = actionableInsights.length;
    const warningCount = actionableInsights.filter(i => i.insightType === 'warning').length;
    const achievementCount = actionableInsights.filter(i => i.insightType === 'achievement').length;

    return (
        <section className="space-y-3">
            {/* Summary Bar */}
            <GlassCard className="p-3 border border-emerald-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/20">
                            <Zap className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-white">
                                {totalActions} action{totalActions !== 1 ? 's' : ''} available
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                                {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
                                {warningCount > 0 && achievementCount > 0 && ' · '}
                                {achievementCount > 0 && `${achievementCount} achievement${achievementCount !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Quick Action Cards */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {displayInsights.map((insight, index) => (
                        <QuickInsightCard
                            key={insight.id}
                            insight={insight}
                            index={index}
                            onApply={() => applyInsightRecommendation(insight.id)}
                            onDismiss={() => dismissInsight(insight.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Show More / Less */}
            {actionableInsights.length > maxItems && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors mx-auto"
                >
                    {showAll ? (
                        <>Show less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                        <>Show {actionableInsights.length - maxItems} more <ChevronDown className="w-3 h-3" /></>
                    )}
                </button>
            )}
        </section>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIVIDUAL QUICK INSIGHT CARD
// ═══════════════════════════════════════════════════════════════════════════

interface QuickInsightCardProps {
    insight: BudgetInsight;
    index: number;
    onApply: () => void;
    onDismiss: () => void;
}

function QuickInsightCard({ insight, index, onApply, onDismiss }: QuickInsightCardProps) {
    const [isApplied, setIsApplied] = useState(false);
    const colors = QUICK_INSIGHT_COLORS[insight.insightType];

    const handleApply = () => {
        setIsApplied(true);
        onApply();
        setTimeout(() => onDismiss(), 1200);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20, height: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <div className={`flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 border ${colors.border} group hover:bg-gray-800/50 transition-all`}>
                {/* Icon */}
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} flex-shrink-0`}>
                    {QUICK_INSIGHT_ICONS[insight.insightType]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{insight.title}</p>
                    {insight.impact && (
                        <p className={`text-xs ${colors.text}`}>{insight.impact}</p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isApplied ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-2 rounded-lg bg-emerald-500/20"
                        >
                            <Check className="w-4 h-4 text-emerald-400" />
                        </motion.div>
                    ) : (
                        <>
                            <button
                                onClick={handleApply}
                                className={`p-2 rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                                title="Apply"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onDismiss}
                                className="p-2 rounded-lg bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors opacity-0 group-hover:opacity-100"
                                title="Dismiss"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
