"use client";

import React from 'react';
import { X, TrendingUp, DollarSign, Target, CheckCircle2, AlertCircle, TrendingDown } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { generateInsights } from '@/data/trend_engine'; // Re-generate to find the insight object
import { cn } from '@/lib/utils';
import { InsightItem } from '@/data/fake_data';

export function ExplainerPanel() {
    const { explainingInsightId, setExplainingInsightId, explainingItem, setExplainingItem, setActiveSim } = useInsightsStore();

    // Prefer passed item, otherwise find by ID
    let insight = explainingItem;
    if (!insight && explainingInsightId) {
        const allInsights = generateInsights();
        insight = allInsights.find(i => i.id === explainingInsightId);
    }

    const handleClose = () => {
        setExplainingInsightId(null);
        setExplainingItem(null);
    };

    if (!insight) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                onClick={handleClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900/95 backdrop-blur z-10 flex justify-between items-start">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                                insight.confidence === 'High' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                    "bg-zinc-800 text-zinc-400 border-zinc-700"
                            )}>
                                {insight.confidence} Confidence
                            </span>
                            <span className="text-zinc-500 text-xs">•</span>
                            <span className="text-zinc-500 text-xs">{insight.severity?.toUpperCase() || 'INFO'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-white leading-tight">{insight.title}</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Causal Diagnosis */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-100 mb-1">Causal Diagnosis</h4>
                                <p className="text-sm text-blue-200/80 leading-relaxed">
                                    {insight.causalGuess || "Algorithm detected statistical anomaly."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Drivers Section */}
                    {(insight.richDrivers || insight.detailDrivers) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Top Drivers</h3>

                            {/* Standard Insight Stats */}
                            {insight.richDrivers && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="text-xs text-zinc-500 mb-1">Frequency</div>
                                        <div className="text-sm font-mono font-bold text-white">
                                            {insight.richDrivers.stats?.freqChange || "Stable"}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="text-xs text-zinc-500 mb-1">Avg Ticket</div>
                                        <div className="text-sm font-mono font-bold text-white">
                                            {insight.richDrivers.stats?.priceChange || "Stable"}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Merchant/Driver List */}
                            <div className="space-y-3 pt-2">
                                {/* Standard Merchants */}
                                {insight.richDrivers?.merchants.map((m: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                {m.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{m.name}</div>
                                                <div className="text-xs text-zinc-500">{m.impact}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono text-zinc-300">
                                            ${m.amount.toFixed(0)}
                                        </div>
                                    </div>
                                ))}

                                {/* Projection Drivers */}
                                {insight.detailDrivers?.map((d: any, i: number) => (
                                    <div
                                        key={i}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Only simulate variable/projected expenses, not fixed ones like Rent
                                            if (d.type === 'projected' || ['Groceries', 'Food', 'Shopping', 'Transport', 'Coffee', 'Entertainment'].includes(d.name)) {
                                                setActiveSim({
                                                    type: 'reduction',
                                                    category: d.name,
                                                    currentSpend: d.amount,
                                                    totalBudget: 5000
                                                });
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center justify-between group p-2 rounded-lg transition-all",
                                            (d.type === 'projected' || ['Groceries', 'Food', 'Shopping', 'Transport', 'Coffee', 'Entertainment'].includes(d.name))
                                                ? "hover:bg-emerald-500/10 cursor-pointer hover:border hover:border-emerald-500/20"
                                                : "hover:bg-zinc-800/30"
                                        )}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                {d.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{d.name}</div>
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold",
                                                    d.type === 'actual' ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                                )}>
                                                    {d.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="text-sm font-mono text-zinc-300">
                                                ${d.amount.toFixed(0)}
                                            </div>
                                            {(d.type === 'projected' || ['Groceries', 'Food', 'Shopping', 'Transport', 'Coffee', 'Entertainment'].includes(d.name)) && (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions Section */}
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recommended Actions</h3>

                        <button
                            onClick={() => {
                                const category = insight.detailDrivers?.[0]?.name || insight.richDrivers?.merchants?.[0]?.name || insight.title;
                                setActiveSim({
                                    type: 'budget',
                                    category,
                                    suggestedBudget: 1000,
                                    year: 2026,
                                    month: 1
                                });
                            }}
                            className="w-full flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500/20">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-emerald-100">Set Monthly Budget</div>
                                    <div className="text-xs text-emerald-200/60">Cap this category to prevent future spikes</div>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                const category = insight.detailDrivers?.[0]?.name || insight.richDrivers?.merchants?.[0]?.name || insight.title;
                                const currentSpend = insight.detailDrivers?.reduce((sum: number, d: any) => sum + d.amount, 0) ||
                                    insight.richDrivers?.merchants?.reduce((sum: number, m: any) => sum + m.amount, 0) || 1000;
                                setActiveSim({
                                    type: 'reduction',
                                    category,
                                    currentSpend,
                                    totalBudget: 5000
                                });
                            }}
                            className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-all group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-zinc-700/50 rounded-lg text-white group-hover:bg-zinc-600">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-zinc-200">Simulate Reduction</div>
                                    <div className="text-xs text-zinc-500">See impact if you cut this by 10%</div>
                                </div>
                            </div>
                        </button>

                        <button className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl transition-all group">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-zinc-700/50 rounded-lg text-white group-hover:bg-zinc-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-semibold text-zinc-200">Mark as Expected</div>
                                    <div className="text-xs text-zinc-500">Teach the model to ignore this pattern</div>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
