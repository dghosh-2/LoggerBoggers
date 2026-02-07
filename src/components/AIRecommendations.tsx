'use client';

import React from 'react';

interface AIRecommendationsProps {
    recommendations: any | null;
    loading: boolean;
}

export default function AIRecommendations({ recommendations, loading }: AIRecommendationsProps) {
    if (loading) {
        return (
            <div className="ios-glass rounded-[28px] p-6">
                <style jsx>{`
                    .ios-glass {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: saturate(180%) blur(30px);
                        -webkit-backdrop-filter: saturate(180%) blur(30px);
                        border: 0.5px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                    }
                `}</style>
                <h2 className="text-lg font-semibold text-white mb-4">AI Analysis</h2>
                <div className="animate-pulse space-y-3">
                    <div className="h-3 bg-white/20 rounded w-full" />
                    <div className="h-3 bg-white/20 rounded w-4/5" />
                    <div className="h-3 bg-white/20 rounded w-3/4" />
                </div>
            </div>
        );
    }

    if (!recommendations) {
        return (
            <div className="ios-glass rounded-[28px] p-6">
                <style jsx>{`
                    .ios-glass {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: saturate(180%) blur(30px);
                        -webkit-backdrop-filter: saturate(180%) blur(30px);
                        border: 0.5px solid rgba(255, 255, 255, 0.3);
                        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                    }
                `}</style>
                <h2 className="text-lg font-semibold text-white mb-2">AI Analysis</h2>
                <p className="text-sm text-white/60">Search for stocks to get AI insights</p>
            </div>
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
        <>
            <style jsx>{`
                .ios-glass {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: saturate(180%) blur(30px);
                    -webkit-backdrop-filter: saturate(180%) blur(30px);
                    border: 0.5px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.4);
                }
                .ios-metric-card {
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: saturate(180%) blur(20px);
                    -webkit-backdrop-filter: saturate(180%) blur(20px);
                    border: 0.5px solid rgba(255, 255, 255, 0.35);
                }
            `}</style>

            <div className="ios-glass rounded-[28px] p-6 relative overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 pointer-events-none rounded-[28px]" />

                <div className="relative">
                    <h2 className="text-lg font-semibold text-white mb-5">AI Analysis</h2>

                    {/* Key Points */}
                    <div className="space-y-3 mb-5">
                        {keyPoints.map((point, idx) => (
                            <p key={idx} className="text-sm text-white/90 leading-relaxed">
                                <span className="font-semibold text-white">{point.label}:</span>{' '}
                                {point.content}
                            </p>
                        ))}
                    </div>

                    {/* Numerical Key Insights */}
                    {recommendations.insights && recommendations.insights.length > 0 && (
                        <div className="border-t border-white/20 pt-4">
                            <h3 className="text-sm font-semibold text-white mb-3">Key Metrics</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {recommendations.insights.slice(0, 4).map((insight: any, idx: number) => (
                                    <div key={idx} className="ios-metric-card rounded-[16px] px-3 py-2.5">
                                        <p className="text-xs text-white/70 mb-1">{insight.title}</p>
                                        <p className="text-sm font-semibold text-white truncate">{insight.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Risk note */}
                    {recommendations.riskAlignment && (
                        <p className="text-xs text-white/60 mt-4 pt-3 border-t border-white/20">
                            {recommendations.riskAlignment.slice(0, 100)}...
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
