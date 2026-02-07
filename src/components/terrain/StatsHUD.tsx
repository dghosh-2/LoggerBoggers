"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useTerrainStore } from "@/stores/terrain-store";
import { useFinancialData } from "@/hooks/useFinancialData";

export function StatsHUD() {
    const { currentDate, activeCategories } = useTerrainStore();
    const { transactions, summary, isConnected } = useFinancialData();
    const monthlyIncome = isConnected ? (summary?.monthly_income || 0) : 0;

    // Calculate stats based on current time position
    const stats = useMemo(() => {
        const relevantTransactions = (!isConnected || transactions.length === 0) ? [] : transactions.filter(t => {
            const date = new Date(t.date);
            return date <= currentDate && activeCategories.has(t.category);
        });

        const totalExpenses = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Estimate income (simplified)
        const monthsElapsed = Math.max(1, Math.ceil(
            (currentDate.getTime() - new Date("2025-01-01").getTime()) /
            (30 * 24 * 60 * 60 * 1000)
        ));
        const totalIncome = monthlyIncome * monthsElapsed;

        const balance = 5000 + totalIncome - totalExpenses;

        // Calculate trends (compare to last month)
        const lastMonth = new Date(currentDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const lastMonthExpenses = (!isConnected || transactions.length === 0) ? 0 : transactions
            .filter(t => {
                const date = new Date(t.date);
                return date <= lastMonth && activeCategories.has(t.category);
            })
            .reduce((sum, t) => sum + t.amount, 0);

        const expenseDelta = totalExpenses - lastMonthExpenses;
        const expensePercent = lastMonthExpenses > 0
            ? Math.round((expenseDelta / lastMonthExpenses) * 100)
            : 0;

        return {
            balance: Math.round(balance),
            income: Math.round(totalIncome),
            expenses: Math.round(totalExpenses),
            expensePercent,
        };
    }, [currentDate, activeCategories, transactions, isConnected, monthlyIncome]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute top-4 left-4 z-20 space-y-2"
        >
            {/* Balance Card */}
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-lg p-4 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                        <Wallet className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[11px] text-foreground-muted">Balance</span>
                </div>
                <motion.p
                    key={stats.balance}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl font-bold font-mono tabular-nums"
                >
                    ${stats.balance.toLocaleString()}
                </motion.p>
            </div>

            {/* Income Card */}
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-lg p-3 min-w-[180px]">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-foreground-muted">Total Income</span>
                    <div className="p-1 rounded bg-success-soft">
                        <TrendingUp className="w-3 h-3 text-success" />
                    </div>
                </div>
                <motion.p
                    key={stats.income}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-semibold font-mono tabular-nums text-success"
                >
                    ${stats.income.toLocaleString()}
                </motion.p>
            </div>

            {/* Expenses Card */}
            <div className="bg-card/80 backdrop-blur-xl border border-border rounded-lg p-3 min-w-[180px]">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-foreground-muted">Total Expenses</span>
                    <div className="p-1 rounded bg-destructive-soft">
                        <TrendingDown className="w-3 h-3 text-destructive" />
                    </div>
                </div>
                <motion.p
                    key={stats.expenses}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-semibold font-mono tabular-nums text-destructive"
                >
                    ${stats.expenses.toLocaleString()}
                </motion.p>
                {stats.expensePercent !== 0 && (
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                        {stats.expensePercent > 0 ? "+" : ""}{stats.expensePercent}% vs last month
                    </p>
                )}
            </div>
        </motion.div>
    );
}
