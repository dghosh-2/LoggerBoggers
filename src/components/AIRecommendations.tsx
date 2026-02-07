'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Shield } from 'lucide-react';

interface AIRecommendationsProps {
    recommendations: any | null;
    loading: boolean;
    useLiquidGlass?: boolean;
}

export default function AIRecommendations({ recommendations, loading, useLiquidGlass = false }: AIRecommendationsProps) {
    const containerClass = useLiquidGlass ? "liquid-glass p-6 rounded-3xl" : "card-elevated p-6 rounded-2xl";
    const borderClass = useLiquidGlass ? "border-primary/10" : "border-border";
    const bgClass = useLiquidGlass ? "bg-primary/5 border-primary/10" : "bg-secondary border-border";

    if (loading) {
        return (
            <motion.div 
                className={containerClass}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">AI Analysis</h2>
                </div>
                <div className="animate-pulse space-y-3 relative z-10">
                    <div className="h-3 bg-secondary rounded w-full" />
                    <div className="h-3 bg-secondary rounded w-4/5" />
                    <div className="h-3 bg-secondary rounded w-3/4" />
                </div>
            </motion.div>
        );
    }

    if (!recommendations) {
        return (
            <motion.div 
                className={containerClass}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">AI Analysis</h2>
                </div>
                <p className="text-sm text-foreground-muted relative z-10">Search for stocks to get AI insights</p>
            </motion.div>
        );
    }

    // Parse summary into key points
    const keyPoints = [
        { label: 'Overview', content: recommendations.summary || 'Analysis completed.' },
    ];

    if (recommendations.insights && recommendations.insights.length > 0) {
        recommendations.insights.slice(0, 3).forEach((insight: any) => {
            keyPoints.push({
                label: insight.title || 'Insight',
                content: insight.description || '',
            });
        });
    }

    return (
        <motion.div 
            className={containerClass}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="flex items-center gap-2 mb-5 relative z-10">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">AI Analysis</h2>
            </div>

            {/* Key Points */}
            <div className="space-y-3 mb-5 relative z-10">
                {keyPoints.map((point, idx) => (
                    <p key={idx} className="text-sm text-foreground-secondary leading-relaxed">
                        <span className="font-semibold text-foreground">{point.label}:</span>{' '}
                        {point.content}
                    </p>
                ))}
            </div>

            {/* Numerical Key Insights */}
            {recommendations.insights && recommendations.insights.length > 0 && (
                <div className={`border-t ${borderClass} pt-4 relative z-10`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-semibold">Key Metrics</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {recommendations.insights.slice(0, 4).map((insight: any, idx: number) => (
                            <div key={idx} className={`${bgClass} rounded-xl px-3 py-2.5 border`}>
                                <p className="text-xs text-foreground-muted mb-1">{insight.title}</p>
                                <p className="text-sm font-semibold truncate">{insight.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Risk note */}
            {recommendations.riskAlignment && (
                <div className={`mt-4 pt-3 border-t ${borderClass} relative z-10`}>
                    <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-foreground-muted mt-0.5" />
                        <p className="text-xs text-foreground-muted">
                            {recommendations.riskAlignment.slice(0, 150)}...
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
