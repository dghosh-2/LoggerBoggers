"use client";

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { MOCK_TRANSACTIONS } from '@/data/fake_data';
import { useInsightsStore } from '@/store/useInsightsStore';
import { useMemo } from 'react';


export function AnalysisView() {
    const { selectedRange } = useInsightsStore();

    // 1. Aggregate Transactions by Month
    const chartData = useMemo(() => {
        const dataMap = new Map<string, any>(); // Key: "YYYY-MM"

        MOCK_TRANSACTIONS.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

            // Filter based on range if needed (Though "Analysis" implies looking at patterns over time)
            if (selectedRange === '3M') {
                const cutoff = new Date('2025-11-01'); // Approximation for demo
                if (date < cutoff) return;
            }

            if (!dataMap.has(monthKey)) {
                dataMap.set(monthKey, {
                    monthKey,
                    month: monthLabel,
                    total: 0
                });
            }

            const entry = dataMap.get(monthKey);
            entry[t.category] = (entry[t.category] || 0) + t.amount;
            entry.total += t.amount;
        });

        // Convert Map to Array and Sort by MonthKey
        return Array.from(dataMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }, [selectedRange]);

    // 2. Define Categories and Colors
    const CATEGORY_COLORS: Record<string, string> = {
        'Rent': '#3b82f6', // blue-500
        'Groceries': '#22c55e', // green-500
        'Food': '#10b981', // emerald-500
        'Shopping': '#a855f7', // purple-500
        'Entertainment': '#f59e0b', // amber-500
        'Transport': '#ec4899', // pink-500
        'Bills': '#64748b', // slate-500
        'Subscriptions': '#ef4444', // red-500
        'Coffee': '#d97706', // amber-600
        'Insurance': '#06b6d4', // cyan-500
        'Education': '#8b5cf6', // violet-500
    };

    // Get all unique categories present in the data to create bars
    const categories = useMemo(() => {
        const cats = new Set<string>();
        MOCK_TRANSACTIONS.forEach(t => cats.add(t.category));
        return Array.from(cats);
    }, []);

    return (
        <div className="h-full w-full pt-16 p-8 flex flex-col bg-black/20">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Monthly Spending Breakdown</h2>
                <p className="text-zinc-400 text-sm">Analyze your spending trends over time by category.</p>
            </div>

            <div className="flex-1 min-h-0 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        stackOffset="sign"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                        <XAxis
                            dataKey="month"
                            stroke="#a1a1aa"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#a1a1aa"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    // Calculate total for this specific tooltip
                                    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

                                    return (
                                        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl">
                                            <p className="text-zinc-300 font-bold mb-2">{label}</p>
                                            <div className="space-y-1 mb-2">
                                                {payload.map((p: any, idx: number) => (
                                                    p.value > 0 && (
                                                        <div key={idx} className="flex items-center justify-between text-xs w-48">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="text-zinc-400">{p.name}</span>
                                                            </div>
                                                            <span className="font-mono text-zinc-200">${p.value.toLocaleString()}</span>
                                                        </div>
                                                    )
                                                )).reverse()}
                                            </div>
                                            <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold text-white">
                                                <span>Total</span>
                                                <span>${total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {categories.map((cat) => (
                            <Bar
                                key={cat}
                                dataKey={cat}
                                stackId="a"
                                fill={CATEGORY_COLORS[cat] || '#71717a'}
                                radius={[0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
