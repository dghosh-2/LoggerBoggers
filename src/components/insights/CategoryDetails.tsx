"use client";

import React from 'react';
import { ArrowLeft, Receipt } from 'lucide-react';
import { useInsightsStore } from '@/stores/insights-store';
import { MOCK_TRANSACTIONS } from '@/lib/mock-data';

export function CategoryDetails() {
    const { selectedCategory, setSelectedCategory } = useInsightsStore();

    const transactions = MOCK_TRANSACTIONS.filter(
        (t) => t.category === selectedCategory
    );

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border bg-background/50">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center text-xs text-foreground-muted hover:text-foreground mb-3 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back to Insights
                </button>
                <h2 className="text-lg font-bold text-foreground flex items-center">
                    {selectedCategory}
                </h2>
                <p className="text-xs text-foreground-muted">Recent Transactions</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {transactions.length === 0 ? (
                    <div className="text-center text-foreground-muted py-10 text-sm">
                        No transactions found for this period.
                    </div>
                ) : (
                    transactions.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-strong transition-colors shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground-muted">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t.merchant}</p>
                                    <p className="text-[10px] text-foreground-muted">{t.date}</p>
                                </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-foreground">
                                ${t.amount.toFixed(2)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
