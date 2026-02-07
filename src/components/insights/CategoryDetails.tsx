"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useInsightsStore } from '@/stores/insights-store';
import { useFinancialData } from '@/hooks/useFinancialData';

export function CategoryDetails() {
    const { selectedCategory, setSelectedCategory, selectedRange } = useInsightsStore();
    const { transactions: allTransactions, isConnected } = useFinancialData();

    // Calculate which categories are included in "Other"
    const otherCategories = useMemo(() => {
        if (selectedCategory !== 'Other' || !isConnected || allTransactions.length === 0) return [];

        const now = new Date();
        const rangeTransactions = allTransactions.filter(t => {
            const date = new Date(t.date);
            if (selectedRange === 'MTD') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            } else if (selectedRange === '3M') {
                const threeMonthsAgo = new Date(now);
                threeMonthsAgo.setMonth(now.getMonth() - 3);
                return date >= threeMonthsAgo;
            } else if (selectedRange === 'YR') {
                const twelveMonthsAgo = new Date(now);
                twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
                return date >= twelveMonthsAgo;
            }
            return true;
        });

        const categoryTotals: Record<string, number> = {};
        rangeTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        // Sort by value and get top 5
        const sortedCategories = Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const MAX_CATEGORIES = 5;
        const topCategories = sortedCategories.slice(0, MAX_CATEGORIES).map(c => c.name);
        const otherCategoryNames = sortedCategories.slice(MAX_CATEGORIES).map(c => c.name);

        return otherCategoryNames;
    }, [selectedCategory, allTransactions, isConnected, selectedRange]);

    const transactions = useMemo(() => {
        if (!isConnected || allTransactions.length === 0) return [];

        // Get date range based on selectedRange
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        let startDate: Date;

        if (selectedRange === 'MTD') {
            startDate = new Date(currentYear, currentMonth, 1);
        } else if (selectedRange === '3M') {
            startDate = new Date(currentYear, currentMonth - 3, 1);
        } else if (selectedRange === 'YR') {
            startDate = new Date(currentYear, 0, 1);
        } else {
            // 'All'
            startDate = new Date(0); // epoch
        }

        return allTransactions.filter((t) => {
            const txDate = new Date(t.date);

            // If "Other" is selected, show transactions from categories not in top 5
            if (selectedCategory === 'Other') {
                return otherCategories.includes(t.category) && txDate >= startDate;
            }

            return t.category === selectedCategory && txDate >= startDate;
        });
    }, [selectedCategory, allTransactions, isConnected, selectedRange, otherCategories]);

    const totalAmount = useMemo(() => {
        return transactions.reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-border">
                <motion.button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center text-xs text-foreground-muted hover:text-foreground mb-4 transition-colors group"
                    whileHover={{ x: -2 }}
                >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:text-primary transition-colors" />
                    Back to Overview
                </motion.button>
                <h2 className="text-xl font-semibold text-foreground">
                    {selectedCategory}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold font-mono text-foreground">
                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-foreground-muted px-2 py-0.5 rounded-full bg-secondary">
                        {selectedRange === 'MTD' ? 'This Month' : selectedRange === '3M' ? '3 Months' : 'Year'}
                    </span>
                </div>
                <p className="text-sm text-foreground-muted mt-1">
                    {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {transactions.length === 0 ? (
                    <div className="text-center text-foreground-muted py-10 text-sm">
                        No transactions found for this period.
                    </div>
                ) : (
                    transactions.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {t.merchant_name || t.name}
                                    </p>
                                    <p className="text-xs text-foreground-muted">{t.date}</p>
                                </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-foreground">
                                ${t.amount.toFixed(2)}
                            </span>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
