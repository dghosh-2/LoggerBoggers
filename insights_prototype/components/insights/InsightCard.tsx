"use client";

import React from 'react';
import { ArrowRight, Sparkles, TrendingUp, AlertOctagon } from 'lucide-react';
import { InsightItem } from '@/data/fake_data';
import { useInsightsStore } from '@/store/useInsightsStore';
import { cn } from '@/lib/utils';

interface InsightCardProps {
    insight: InsightItem;
}

export function InsightCard({ insight }: InsightCardProps) {
    const { selectedInsightId, setSelectedInsightId } = useInsightsStore();
    const isSelected = selectedInsightId === insight.id;

    return (
        <div
            onClick={() => setSelectedInsightId(isSelected ? null : insight.id)}
            className={cn(
                "p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden group select-none",
                isSelected
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_30px_-5px_rgba(34,197,94,0.1)]"
                    : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 hover:shadow-lg"
            )}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2.5">
                    {/* Icon Badge */}
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border",
                        insight.severity === 'warning' ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                            insight.severity === 'critical' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    )}>
                        {insight.severity === 'warning' ? <TrendingUp className="w-4 h-4" /> :
                            insight.severity === 'critical' ? <AlertOctagon className="w-4 h-4" /> :
                                <Sparkles className="w-4 h-4" />}
                    </div>

                    <span className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md",
                        insight.severity === 'warning' ? "bg-orange-500/10 text-orange-400" :
                            insight.severity === 'critical' ? "bg-red-500/10 text-red-400" :
                                "bg-blue-500/10 text-blue-400"
                    )}>
                        {insight.confidence} Conf.
                    </span>
                </div>
            </div>

            <h3 className="text-base font-bold text-zinc-100 mb-1 leading-snug group-hover:text-white transition-colors">
                {insight.title}
            </h3>

            {/* Drivers / Context */}
            <div className="mt-3 space-y-2">
                {insight.drivers.map((driver, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-zinc-400 bg-black/20 rounded-md px-2 py-1.5 border border-white/5">
                        <span>{driver.split('(')[0]}</span>
                        <span className="font-mono text-zinc-300">{driver.split('(')[1]?.replace(')', '') || ''}</span>
                    </div>
                ))}
            </div>

            {/* Action Buttons (Reveal on Hover/Select) */}
            <div className={cn(
                "flex items-center justify-end mt-4 space-x-2 transition-all duration-300",
                isSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
            )}>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
                    Explain
                </button>
                <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-black flex items-center shadow-lg shadow-green-900/20 hover:bg-green-400 transition-colors">
                    Fix Drift <ArrowRight className="w-3 h-3 ml-1" />
                </button>
            </div>

            {/* Active Sidebar Indicator */}
            {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_2px_rgba(34,197,94,0.5)]" />
            )}
        </div>
    );
}
