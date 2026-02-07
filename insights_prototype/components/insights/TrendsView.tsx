"use client";

import React, { useEffect, useState } from 'react';
import { generateInsights, detectSeasonalEvents, detectSpikes, detectRecurring } from '@/data/trend_engine';
import { InsightItem, MOCK_TRANSACTIONS } from '@/data/fake_data';
import { Sparkles, TrendingUp, Calendar, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInsightsStore } from '@/store/useInsightsStore';
import { calculateMonthlyProjection } from '@/data/projection_engine';

export function TrendsView() {
    const [insights, setInsights] = useState<InsightItem[]>([]);
    const { setExplainingInsightId, setExplainingItem, reductionGoals } = useInsightsStore();

    // State for projections to force re-render
    const [projections, setProjections] = useState({
        prev: calculateMonthlyProjection(2026, 0, reductionGoals),
        curr: calculateMonthlyProjection(2026, 1, reductionGoals),
        next: calculateMonthlyProjection(2026, 2, reductionGoals),
    });

    useEffect(() => {
        const freshInsights = generateInsights();
        setInsights(freshInsights);
    }, []);

    // Recalculate projections when goals change
    useEffect(() => {
        console.log('Reduction goals changed:', reductionGoals);
        setProjections({
            prev: calculateMonthlyProjection(2026, 0, reductionGoals),
            curr: calculateMonthlyProjection(2026, 1, reductionGoals),
            next: calculateMonthlyProjection(2026, 2, reductionGoals),
        });
        console.log('Projections recalculated');
    }, [reductionGoals]);

    const getIcon = (id: string) => {
        if (id.includes('season') || id.includes('event')) return <Calendar className="w-5 h-5 text-pink-400" />;
        if (id.includes('rec')) return <Repeat className="w-5 h-5 text-blue-400" />;
        return <TrendingUp className="w-5 h-5 text-amber-400" />;
    };

    const handleProjectionClick = (title: string, data: any) => {
        setExplainingItem({
            id: 'proj-' + title,
            title: title + ' Analysis',
            confidence: data.confidence,
            severity: 'info',
            richDrivers: {
                stats: { freqChange: 'Stable', priceChange: 'Stable' },
                merchants: []
            },
            drivers: data.drivers,
            detailDrivers: data.detailedDrivers,
            causalGuess: "Financial projection based on recurring expenses, historical averages, and upcoming calendar events.",
            relatedNodeIds: [],
        });
    };

    // Check if any goals are active
    const hasActiveGoals = Object.keys(reductionGoals).length > 0;

    const ProjectionCard = ({ title, dateLabel, amount, data, type }: { title: string, dateLabel: string, amount: number, data: any, type: 'past' | 'present' | 'future' }) => (
        <div
            onClick={() => handleProjectionClick(title, data)}
            className={cn(
                "p-5 cursor-pointer rounded-2xl border backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                type === 'present' ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/40" :
                    type === 'future' ? "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/30" :
                        "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                    type === 'present' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                        type === 'future' ? "bg-purple-500/10 text-purple-300 border-purple-500/20" :
                            "bg-zinc-800 text-zinc-400 border-zinc-700"
                )}>{title}</span>
                <span className="text-xs text-zinc-500 font-medium">{dateLabel}</span>
            </div>

            <div className="text-2xl font-mono font-bold text-white mb-4">
                ${amount.toLocaleString()}
            </div>

            <div className="space-y-2">
                <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-zinc-800/50">
                    <div className="bg-emerald-500" style={{ width: `${(data.breakdown.fixed / amount) * 100}%` }} />
                    <div className="bg-amber-500" style={{ width: `${(data.breakdown.variable / amount) * 100}%` }} />
                    <div className="bg-purple-500" style={{ width: `${(data.breakdown.events / amount) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                    <span className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />Fixed</span>
                    <span className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />Var</span>
                    <span className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1" />Events</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-full w-full pt-16 p-8 pb-24 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Trend Intelligence</h2>
                    <p className="text-zinc-400 text-sm">AI-detected patterns and predictive alerts</p>
                </div>
            </div>

            {/* Timeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProjectionCard title="Review" dateLabel="Jan '26" amount={projections.prev.total} data={projections.prev} type="past" />
                <ProjectionCard title="Projected" dateLabel="Feb '26" amount={projections.curr.total} data={projections.curr} type="present" />
                <ProjectionCard title="Forecast" dateLabel="Mar '26" amount={projections.next.total} data={projections.next} type="future" />
            </div>

            {/* Masonry-style Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insights.map((insight) => (
                    <div
                        key={insight.id}
                        onClick={() => setExplainingInsightId(insight.id)}
                        className={cn(
                            "cursor-pointer group relative p-6 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:scale-[1.02]",
                            insight.severity === 'critical' ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40" :
                                insight.severity === 'warning' ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                                    "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                                {getIcon(insight.id)}
                            </div>
                            <span className={cn(
                                "px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                                insight.confidence === 'High' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                            )}>
                                {insight.confidence} Conf.
                            </span>
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary transition-colors">
                            {insight.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                            {insight.drivers.map((driver, i) => (
                                <p key={i} className="text-sm text-zinc-400 flex items-center space-x-2">
                                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                    <span>{driver}</span>
                                </p>
                            ))}
                        </div>

                        {insight.changePercentage && (
                            <div className="absolute bottom-6 right-6">
                                <span className={cn(
                                    "text-xl font-mono font-bold",
                                    insight.changePercentage.startsWith('+') ? "text-red-400" : "text-emerald-400"
                                )}>
                                    {insight.changePercentage}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
