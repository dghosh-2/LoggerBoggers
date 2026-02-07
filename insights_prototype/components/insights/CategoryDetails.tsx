"use client";

import React from 'react';
import { ArrowLeft, Receipt, DollarSign } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { MOCK_TRANSACTIONS } from '@/data/fake_data';
import { cn } from '@/lib/utils';

export function CategoryDetails() {
    const { selectedCategory, setSelectedCategory } = useInsightsStore();

    const transactions = MOCK_TRANSACTIONS.filter(
        (t) => t.category === selectedCategory
    );

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center text-xs text-zinc-400 hover:text-white mb-3 transition-colors"
                >
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    Back to Insights
                </button>
                <h2 className="text-lg font-bold text-white flex items-center">
                    {selectedCategory}
                </h2>
                <p className="text-xs text-zinc-500">Recent Transactions</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {transactions.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10 text-sm">
                        No transactions found for this period.
                    </div>
                ) : (
                    transactions.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-800/60 transition-colors">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Merchant Name</p>
                                    <p className="text-[10px] text-white dark:text-zinc-500">{t.date}</p>
                                </div>
                            </div>
                            <span className="font-mono text-sm font-semibold text-white">
                                ${t.amount.toFixed(2)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
