"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Calendar,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Search
} from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';
import { cn } from '@/lib/utils';

interface SubscriptionItem {
    id: string;
    name: string;
    amount: number;
    frequency: 'Monthly' | 'Yearly';
    nextDate: string;
    category: string;
    status: 'active' | 'review';
    icon?: React.ReactNode;
}

export function SubscriptionsView() {
    const { transactions, loading } = useFinancialData();
    const [searchTerm, setSearchTerm] = React.useState('');

    // Logic to detect subscriptions from transactions
    const subscriptions = useMemo(() => {
        console.log('[SubscriptionsView] Total transactions:', transactions.length);

        if (!transactions.length) {
            console.log('[SubscriptionsView] No transactions, returning empty');
            return [];
        }


        // Consider ONLY 'Subscriptions' and 'Entertainment' (for things like Netflix/Spotify that might be miscategorized)
        // We will filter out non-subscription entertainment (like simple movie tickets) via strict interval checks
        const ALLOWED_CATEGORIES = [
            'Subscriptions',
            'Entertainment',
            'Software'
        ];

        // Group transactions by merchant name
        const merchantGroups = new Map<string, typeof transactions>();
        let filteredByCategory = 0;
        let filteredByAmount = 0;

        transactions.forEach(t => {
            // Filter by allowed categories
            if (!ALLOWED_CATEGORIES.includes(t.category)) {
                filteredByCategory++;
                return;
            }

            // Skip if amount is >= $500 (rent, large purchases)
            if (t.amount >= 500) {
                filteredByAmount++;
                return;
            }

            // Robust merchant name resolution
            const merchantKey = (t.merchant_name || (t as any).merchant || t.name || 'Unknown').toLowerCase().trim();

            if (!merchantGroups.has(merchantKey)) {
                merchantGroups.set(merchantKey, []);
            }
            merchantGroups.get(merchantKey)!.push(t);
        });

        console.log('[SubscriptionsView] Filtered by category:', filteredByCategory);
        console.log('[SubscriptionsView] Filtered by amount >= $500:', filteredByAmount);
        console.log('[SubscriptionsView] Merchant groups:', merchantGroups.size);

        const detectedSubs: SubscriptionItem[] = [];

        // Analyze each merchant for recurring patterns
        let multiTxnAnalyzed = 0;
        let passedVariance = 0;
        let passedInterval = 0;

        merchantGroups.forEach((txns, merchantKey) => {
            // REQUIRE at least 2 transactions to prove it's recurring
            if (txns.length < 2) {
                return; // Skip - not enough data to prove recurrence
            }

            multiTxnAnalyzed++;

            // Sort by date
            const sortedTxns = [...txns].sort((a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Calculate average amount
            const avgAmount = sortedTxns.reduce((sum, t) => sum + t.amount, 0) / sortedTxns.length;

            // Skip if average amount is >= $500
            if (avgAmount >= 500) {
                return;
            }

            // Check if amounts are consistent (within 25% variance for more flexibility)
            const maxVariance = 0.25; // 25% tolerance instead of 15%
            const amountVariance = sortedTxns.every(t =>
                Math.abs(t.amount - avgAmount) / avgAmount < maxVariance
            );

            if (!amountVariance) {
                return; // Amounts vary too much
            }
            passedVariance++;

            // Calculate intervals between transactions (in days)
            const intervals: number[] = [];
            for (let i = 1; i < sortedTxns.length; i++) {
                const daysDiff = Math.abs(
                    (new Date(sortedTxns[i].date).getTime() - new Date(sortedTxns[i - 1].date).getTime())
                    / (1000 * 60 * 60 * 24)
                );
                intervals.push(daysDiff);
            }

            // Check if intervals are regular - STRICT monthly interval (25-35 days)
            const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
            const isMonthly = avgInterval >= 25 && avgInterval <= 35;  // Strict monthly range
            const isYearly = avgInterval >= 350 && avgInterval <= 380;

            if (!isMonthly && !isYearly) {
                return; // Intervals aren't regular enough
            }
            passedInterval++;

            // If we get here, it passed both variance and interval checks
            const lastTxn = sortedTxns[sortedTxns.length - 1];
            const nextDate = new Date(lastTxn.date);
            nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));

            detectedSubs.push({
                id: `sub-${merchantKey}`,
                name: lastTxn.merchant_name || lastTxn.name,
                amount: Math.round(avgAmount * 100) / 100,
                frequency: isMonthly ? 'Monthly' : 'Yearly',
                nextDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                category: lastTxn.category,
                status: 'active'
            });
        });



        // If no subscriptions detected, return empty
        if (detectedSubs.length === 0) {
            return [];
        }

        return detectedSubs;
    }, [transactions]);

    const filteredSubs = subscriptions.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalMonthly = subscriptions.reduce((sum, s) => {
        return sum + (s.frequency === 'Monthly' ? s.amount : s.amount / 12);
    }, 0);

    const activeCount = subscriptions.length;

    return (
        <div className="h-full flex flex-col p-6 max-w-5xl mx-auto w-full pt-20">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between"
                >
                    <div className="flex items-center gap-2 text-foreground-muted mb-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-sm font-medium">Monthly Cost</span>
                    </div>
                    <div className="text-3xl font-bold font-mono">
                        ${totalMonthly.toFixed(2)}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                        Est. annual: ${(totalMonthly * 12).toLocaleString()}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between"
                >
                    <div className="flex items-center gap-2 text-foreground-muted mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">Active Subs</span>
                    </div>
                    <div className="text-3xl font-bold font-mono">
                        {activeCount}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                        3 up for renewal soon
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between"
                >
                    <div className="flex items-center gap-2 text-foreground-muted mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Largest Expense</span>
                    </div>
                    <div className="text-2xl font-bold font-mono truncate">
                        {subscriptions.sort((a, b) => b.amount - a.amount)[0]?.name || 'None'}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">
                        ${subscriptions.sort((a, b) => b.amount - a.amount)[0]?.amount || 0}/mo
                    </div>
                </motion.div>
            </div>

            {/* List Header & Search */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    Your Subscriptions
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-foreground-muted">
                        {subscriptions.length}
                    </span>
                </h2>
                <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                    <input
                        type="text"
                        placeholder="Search subscriptions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary/50 border border-transparent focus:border-primary/50 focus:bg-secondary transition-all text-sm outline-none"
                    />
                </div>
            </div>

            {/* List */}
            <div className="space-y-3 pb-10">
                {filteredSubs.map((sub, i) => (
                    <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all hover:shadow-md"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-foreground-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                {sub.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{sub.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                                    <span>{sub.category}</span>
                                    <span>•</span>
                                    <span>Due {sub.nextDate}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <div className="font-mono font-bold text-foreground">
                                    ${sub.amount.toFixed(2)}
                                </div>
                                <div className="text-xs text-foreground-muted">
                                    /{sub.frequency === 'Monthly' ? 'mo' : 'yr'}
                                </div>
                            </div>

                            <div className="w-24 flex justify-end">
                                {sub.status === 'review' ? (
                                    <div className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs font-medium flex items-center gap-1.5">
                                        <AlertCircle className="w-3 h-3" />
                                        Review
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-xs font-medium flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Active
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {filteredSubs.length === 0 && (
                    <div className="text-center py-12 text-foreground-muted">
                        No subscriptions found matching "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
}
