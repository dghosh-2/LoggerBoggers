"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Receipt, Calendar } from 'lucide-react';
import { useInsightsStore } from '@/stores/insights-store';
import { useFinancialData } from '@/hooks/useFinancialData';

export function DayDetails() {
    const { selectedDate, setSelectedDate } = useInsightsStore();
    const { transactions: allTransactions, isConnected } = useFinancialData();

    const transactions = useMemo(() => {
        if (!isConnected || allTransactions.length === 0 || !selectedDate) return [];

        return allTransactions.filter((t) => t.date === selectedDate);
    }, [selectedDate, allTransactions, isConnected]);

    const totalAmount = useMemo(() => {
        return transactions.reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Parse YYYY-MM-DD format directly to avoid timezone issues
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        return date.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-border">
                <motion.button
                    onClick={() => setSelectedDate(null)}
                    className="flex items-center text-xs text-foreground-muted hover:text-foreground mb-4 transition-colors group"
                    whileHover={{ x: -2 }}
                >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:text-primary transition-colors" />
                    Back to Calendar
                </motion.button>
                <div className="flex items-center gap-2 text-foreground mb-1">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">
                        {selectedDate ? formatDate(selectedDate) : 'Select a date'}
                    </h2>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold font-mono text-foreground">
                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-foreground-muted px-2 py-0.5 rounded-full bg-secondary">
                        Daily Total
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
                        No transactions found for this day.
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
                                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center text-sm font-bold text-destructive">
                                    {(t.merchant_name || t.name)?.[0] || t.category[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {t.merchant_name || t.name}
                                    </p>
                                    <p className="text-xs text-foreground-muted">{t.category}</p>
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
