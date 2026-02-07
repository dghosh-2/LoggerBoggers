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
    optimization: { text: 'text-foreground', bg: 'bg-secondary', border: 'border-border' },
    warning: { text: 'text-foreground', bg: 'bg-secondary', border: 'border-border' },
    achievement: { text: 'text-foreground', bg: 'bg-secondary', border: 'border-border' },
    pattern: { text: 'text-foreground', bg: 'bg-secondary', border: 'border-border' },
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Actions</h2>
                    <p className="text-xs text-foreground-muted">Quick fixes and wins</p>
                </div>
                <span className="text-xs text-foreground-muted">{totalActions} available</span>
            </div>

            <GlassCard className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-secondary text-foreground">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-foreground">
                                {totalActions} action{totalActions !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-foreground-muted ml-2">
                                {warningCount > 0 && `${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
                                {warningCount > 0 && achievementCount > 0 && ' · '}
                                {achievementCount > 0 && `${achievementCount} win${achievementCount !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                    </div>
                </div>
            </GlassCard>

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

            {actionableInsights.length > maxItems && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors mx-auto"
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
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border} bg-secondary/40 group hover:bg-secondary transition-all`}>
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} flex-shrink-0`}>
                    {QUICK_INSIGHT_ICONS[insight.insightType]}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{insight.title}</p>
                    {insight.impact && (
                        <p className={`text-xs ${colors.text}`}>{insight.impact}</p>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isApplied ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-2 rounded-lg bg-secondary text-foreground"
                        >
                            <Check className="w-4 h-4" />
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
                                className="p-2 rounded-lg bg-secondary text-foreground-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
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
