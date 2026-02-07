'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles, TrendingUp, Clock, Send, Loader2 } from 'lucide-react';
import { useTimeMachineStore } from '@/stores/timemachine-store';
import { cn } from '@/lib/utils';

export function RegretLeaderboard() {
    const { regretCandidates, applyRegret, selectedOps, events, baseline } = useTimeMachineStore();
    const [aiQuery, setAiQuery] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Check if an operation is already applied
    const isApplied = (eventId: string) => {
        return selectedOps.some(op =>
            (op.type === 'REMOVE' && op.eventId === eventId) ||
            (op.type === 'REMOVE_SERIES' && op.seriesId === eventId) ||
            (op.type === 'SCALE_CATEGORY' && (op as any).category === eventId.replace('cat-', ''))
        );
    };

    const handleAiSimulation = async () => {
        if (!aiQuery.trim() || !baseline) return;

        setIsAiLoading(true);
        try {
            // Call the simulation API with AI query
            const response = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    incomeChangePercent: 0,
                    expenseChangePercent: 0,
                    savingsRatePercent: 30,
                    months: baseline.months.length,
                    customEvents: [],
                    newsImpacts: [],
                    aiQuery: aiQuery,
                }),
            });

            if (response.ok) {
                const data = await response.json();

                // Parse AI response to extract counterfactual operations
                // This is a simplified version - the AI response would contain structured suggestions
                if (data.aiResponse) {
                    // For now, we'll show a toast or notification
                    // In a full implementation, we'd parse the AI response and create operations
                    console.log('AI Response:', data.aiResponse);
                }
            }
        } catch (error) {
            console.error('AI simulation error:', error);
        } finally {
            setIsAiLoading(false);
            setAiQuery('');
        }
    };

    if (regretCandidates.length === 0) {
        return (
            <div className="space-y-4">
                {/* AI Query Input */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <p className="text-xs font-medium text-purple-400">Ask AI</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAiSimulation()}
                            placeholder="e.g., What if I cancel subscriptions?"
                            className="flex-1 px-3 py-2 text-sm rounded-lg bg-background/50 border border-border focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-colors"
                            disabled={isAiLoading}
                        />
                        <button
                            onClick={handleAiSimulation}
                            disabled={isAiLoading || !aiQuery.trim()}
                            className="px-3 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isAiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="py-8 text-center text-foreground-muted">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No regrets found</p>
                    <p className="text-xs opacity-60">You're doing great!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* AI Query Input */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20"
            >
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-medium text-purple-400">Ask AI for suggestions</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAiSimulation()}
                        placeholder="e.g., What if I cancel subscriptions?"
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-background/50 border border-border focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-colors"
                        disabled={isAiLoading}
                    />
                    <button
                        onClick={handleAiSimulation}
                        disabled={isAiLoading || !aiQuery.trim()}
                        className="px-3 py-2 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isAiLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </motion.div>

            {/* Leaderboard List */}
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                {regretCandidates.slice(0, 7).map((regret, index) => {
                    const applied = isApplied(regret.eventId);

                    return (
                        <motion.button
                            key={regret.eventId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => !applied && applyRegret(regret)}
                            disabled={applied}
                            className={cn(
                                "w-full relative p-4 rounded-xl border transition-all text-left",
                                "hover:shadow-md active:scale-[0.99]",
                                applied
                                    ? "bg-purple-500/20 border-purple-500/40 cursor-default"
                                    : "bg-card border-border hover:border-purple-500/40 hover:bg-purple-500/5 cursor-pointer"
                            )}
                        >
                            <div>
                                {/* Description */}
                                <p className={cn(
                                    "text-sm font-semibold mb-2",
                                    applied && "text-foreground-muted"
                                )}>
                                    {regret.description}
                                </p>

                                {/* Metrics */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="p-1 rounded-md bg-success/10">
                                            <TrendingUp className="w-3.5 h-3.5 text-success" />
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-success">
                                            +${regret.potentialSavings.toLocaleString()}
                                        </span>
                                    </div>

                                    {regret.goalTimeReduction > 0.1 && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1 rounded-md bg-purple-500/10">
                                                <Clock className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                            <span className="text-xs font-medium text-purple-400">
                                                {regret.goalTimeReduction.toFixed(1)}mo sooner
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <AnimatePresence>
                                {applied && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="absolute right-3 top-3"
                                    >
                                        <div className="px-2.5 py-1 rounded-full bg-purple-500 text-[10px] text-white font-bold shadow-md">
                                            ✓ Applied
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
