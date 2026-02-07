"use client";

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { MOCK_SPEND_TREND, MOCK_TRANSACTIONS } from '@/data/fake_data';
import { useInsightsStore } from '@/store/useInsightsStore';
import { useMemo } from 'react';

// Note: In real app, MOCK_SPEND_TREND needs to have keys for each category: { date: 'Jan 1', Rent: 0, Groceries: 50, ... }
// For this quick prototype, I'll stick to a single trend line but style it beautifully, 
// OR I can quickly mock a stacked structure if I had data for it. 
// Let's stick to the single "Total Spend" trend for now to ensure reliability, but improve the tooltip.

export function InsightsTimeline() {
    const { selectedRange } = useInsightsStore();

    const chartData = useMemo(() => {
        if (selectedRange === 'MTD') return MOCK_SPEND_TREND;

        // For 3M, 12M, All - aggregate by month
        const monthlyData: Record<string, { actual: number, forecast?: number }> = {};

        MOCK_TRANSACTIONS.forEach(t => {
            const date = new Date(t.date);
            const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' }).replace('2025', "'25").replace('2026', "'26");
            // Simple mapping: 2025-12-01 -> Dec '25
            const m = date.getMonth();
            const y = date.getFullYear();
            const label = `${date.toLocaleString('default', { month: 'short' })} '${y.toString().slice(-2)}`;

            if (!monthlyData[label]) monthlyData[label] = { actual: 0 };
            monthlyData[label].actual += t.amount;
        });

        // Convert to array and sort
        return Object.entries(monthlyData)
            .map(([date, values]) => ({ date, amount: values.actual }))
            .sort((a, b) => {
                // Crude sort for prototype
                const months = ['Oct', 'Nov', 'Dec', 'Jan'];
                return months.indexOf(a.date.split(' ')[0]) - months.indexOf(b.date.split(' ')[0]);
            });
    }, [selectedRange]);

    const title = useMemo(() => {
        switch (selectedRange) {
            case 'MTD': return 'Daily Spending (Jan 2026)';
            case '3M': return 'Monthly Spending (Last 3 Months)';
            case 'YR': return 'Monthly Spending (Last Year)';
            default: return 'Spending History (All Time)';
        }
    }, [selectedRange]);
    return (
        <div className="w-full h-full px-6 py-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{title}</h3>
                <div className="flex space-x-2">
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-zinc-400">Actual</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-700" />
                        <span className="text-[10px] text-zinc-400">Predicted</span>
                    </div>
                </div>
            </div>

            <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#71717a' }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={20}
                            dy={10}
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#18181b',
                                borderRadius: '8px',
                                border: '1px solid #27272a',
                                color: '#f4f4f5',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: '#22c55e' }}
                            cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAmount)"
                        />
                        <Area
                            type="monotone"
                            dataKey="forecast"
                            stroke="#71717a" // zinc-500
                            strokeDasharray="5 5"
                            fill="url(#colorAmount)" // Using colorAmount as colorIncome is not defined
                            fillOpacity={0.1}
                            strokeWidth={2}
                            connectNulls
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
