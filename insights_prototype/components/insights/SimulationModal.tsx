"use client";

import React, { useState } from 'react';
import { X, TrendingDown, DollarSign } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { simulateReduction, ReductionSimulation } from '@/data/simulation_engine';
import { cn } from '@/lib/utils';

export function SimulationModal() {
    const { activeSim, setActiveSim, setReductionGoal } = useInsightsStore();
    const [reductionPercent, setReductionPercent] = useState(10);

    if (!activeSim || activeSim.type !== 'reduction') return null;

    // Recalculate simulation with current slider value
    const sim: ReductionSimulation = simulateReduction(
        activeSim.category,
        activeSim.currentSpend,
        reductionPercent,
        activeSim.totalBudget || 5000
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
                onClick={() => setActiveSim(null)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <TrendingDown className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-xl font-bold text-white">Spending Reduction</h2>
                            </div>
                            <p className="text-sm text-zinc-400">{sim.category}</p>
                        </div>
                        <button
                            onClick={() => setActiveSim(null)}
                            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Reduction Slider */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-semibold text-zinc-300">Reduction Target</label>
                                <span className="text-2xl font-mono font-bold text-emerald-400">{reductionPercent}%</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={reductionPercent}
                                onChange={(e) => setReductionPercent(parseInt(e.target.value))}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-500 mt-1">
                                <span>5%</span>
                                <span>50%</span>
                            </div>
                        </div>

                        {/* Before/After Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                                <div className="text-xs text-red-300 uppercase tracking-wider mb-1">Current</div>
                                <div className="text-2xl font-mono font-bold text-white">
                                    ${sim.currentSpend.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <div className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Target</div>
                                <div className="text-2xl font-mono font-bold text-white">
                                    ${sim.newSpend.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Savings Impact */}
                        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Impact</h3>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Monthly Savings</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                    +${sim.monthlySavings.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Annual Projection</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                    +${sim.annualSavings.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                                <span className="text-sm text-zinc-400">% of Total Budget</span>
                                <span className="text-sm font-mono font-bold text-white">
                                    {sim.percentOfTotalBudget.toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setActiveSim(null)}
                                className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    console.log('Setting reduction goal:', sim.category, reductionPercent);
                                    setReductionGoal(sim.category, reductionPercent);
                                    console.log('Goal set, closing modal');
                                    setActiveSim(null);
                                }}
                                className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors"
                            >
                                Set as Goal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
