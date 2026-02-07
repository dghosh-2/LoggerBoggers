"use client";

import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { calculateBudgetTracking, BudgetTracking } from '@/data/simulation_engine';
import { cn } from '@/lib/utils';

export function BudgetModal() {
    const { activeSim, setActiveSim, setBudget } = useInsightsStore();
    const [budgetAmount, setBudgetAmount] = useState(activeSim?.suggestedBudget || 1000);

    if (!activeSim || activeSim.type !== 'budget') return null;

    // Calculate tracking with current input
    const tracking: BudgetTracking = calculateBudgetTracking(
        activeSim.category,
        budgetAmount,
        activeSim.year || 2026,
        activeSim.month || 1
    );

    const getStatusIcon = () => {
        switch (tracking.status) {
            case 'safe': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'critical': return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case 'over': return <X className="w-5 h-5 text-red-500" />;
        }
    };

    const getStatusColor = () => {
        switch (tracking.status) {
            case 'safe': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
            case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-300';
            case 'over': return 'bg-red-500/20 border-red-500/30 text-red-200';
        }
    };

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
                                <DollarSign className="w-5 h-5 text-blue-400" />
                                <h2 className="text-xl font-bold text-white">Set Monthly Budget</h2>
                            </div>
                            <p className="text-sm text-zinc-400">{activeSim.category}</p>
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
                        {/* Budget Input */}
                        <div>
                            <label className="text-sm font-semibold text-zinc-300 mb-2 block">Budget Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xl font-mono">$</span>
                                <input
                                    type="number"
                                    value={budgetAmount}
                                    onChange={(e) => setBudgetAmount(parseInt(e.target.value) || 0)}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step="50"
                                />
                            </div>
                        </div>

                        {/* Current Status */}
                        <div className={cn("p-4 rounded-xl border", getStatusColor())}>
                            <div className="flex items-center space-x-2 mb-2">
                                {getStatusIcon()}
                                <span className="text-sm font-semibold uppercase tracking-wider">
                                    {tracking.status === 'safe' && 'On Track'}
                                    {tracking.status === 'warning' && 'Warning: Projected Over'}
                                    {tracking.status === 'critical' && 'Critical: High Overage'}
                                    {tracking.status === 'over' && 'Over Budget'}
                                </span>
                            </div>
                            <div className="text-sm opacity-90">
                                {tracking.status === 'safe' && `You're ${tracking.variancePercent.toFixed(0)}% under budget if trends continue.`}
                                {tracking.status === 'warning' && `Projected to exceed by $${Math.abs(tracking.variance).toFixed(0)}.`}
                                {tracking.status === 'critical' && `Projected to exceed by $${Math.abs(tracking.variance).toFixed(0)} (${Math.abs(tracking.variancePercent).toFixed(0)}%).`}
                                {tracking.status === 'over' && `Already over by $${Math.abs(tracking.remaining).toFixed(0)}.`}
                            </div>
                        </div>

                        {/* Tracking Details */}
                        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">This Month</h3>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Current Spend</span>
                                <span className="text-lg font-mono font-bold text-white">
                                    ${tracking.currentSpend.toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Remaining</span>
                                <span className={cn(
                                    "text-lg font-mono font-bold",
                                    tracking.remaining >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    ${Math.abs(tracking.remaining).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Daily Burn Rate</span>
                                <span className="text-sm font-mono font-bold text-white">
                                    ${tracking.dailyBurnRate.toLocaleString()}/day
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                                <span className="text-sm text-zinc-400">Projected End-of-Month</span>
                                <span className="text-lg font-mono font-bold text-white">
                                    ${tracking.projectedEndSpend.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                            <div className="flex justify-between text-xs text-zinc-500 mb-1">
                                <span>Day {tracking.daysElapsed} of {tracking.daysInMonth}</span>
                                <span>{((tracking.currentSpend / budgetAmount) * 100).toFixed(0)}% used</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all",
                                        tracking.currentSpend > budgetAmount ? "bg-red-500" :
                                            tracking.projectedEndSpend > budgetAmount ? "bg-amber-500" :
                                                "bg-emerald-500"
                                    )}
                                    style={{ width: `${Math.min((tracking.currentSpend / budgetAmount) * 100, 100)}%` }}
                                />
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
                                    setBudget(activeSim.category, budgetAmount);
                                    setActiveSim(null);
                                }}
                                className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                            >
                                Save Budget
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
