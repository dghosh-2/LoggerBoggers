'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StockData } from '@/lib/schemas';

interface StockChartProps {
    stocks: StockData[];
    showAnnotations?: boolean;
    onDataPointClick?: (date: string, symbol: string, priceData: any) => void;
    chartMode?: 'combined' | 'separate';
}

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
const CHART_COLORS_RAW = ['#18181B', '#6366F1', '#16A34A', '#CA8A04', '#DC2626'];

export default function StockChart({ stocks, onDataPointClick, chartMode = 'combined' }: StockChartProps) {
    if (!stocks || stocks.length === 0) {
        return (
            <div className="card-elevated p-6 h-64 flex items-center justify-center">
                <p className="text-foreground-muted font-medium">No data to display</p>
            </div>
        );
    }

    // Prepare data
    const dateMap = new Map<string, any>();
    stocks.forEach((stock) => {
        stock.data.forEach((point) => {
            if (!dateMap.has(point.date)) {
                dateMap.set(point.date, { date: point.date });
            }
            dateMap.get(point.date)![stock.symbol] = point.close;
        });
    });

    const chartData = Array.from(dateMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const tickInterval = Math.ceil(chartData.length / 8);

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="card-elevated px-4 py-3 rounded-xl">
                <p className="font-semibold text-foreground mb-1.5 text-sm">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
                        {entry.name}: ${entry.value?.toFixed(2)}
                    </p>
                ))}
            </div>
        );
    };

    // Calculate returns
    const stockReturns = stocks.map((stock) => {
        const first = stock.data[0]?.close || 1;
        const last = stock.data[stock.data.length - 1]?.close || first;
        return {
            symbol: stock.symbol,
            name: stock.name,
            price: last,
            return: ((last - first) / first) * 100,
        };
    });

    return (
        <motion.div 
            className="card-elevated p-6 rounded-2xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold">Stock Performance</h2>
                <p className="text-sm text-foreground-muted mt-1">Interactive comparison chart</p>
            </div>

            {/* Chart */}
            <div className="relative">
                <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData}>
                        <defs>
                            {stocks.map((stock, idx) => (
                                <linearGradient key={`gradient-${stock.symbol}`} id={`line-gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={CHART_COLORS_RAW[idx % CHART_COLORS_RAW.length]} stopOpacity={0.85} />
                                    <stop offset="100%" stopColor={CHART_COLORS_RAW[idx % CHART_COLORS_RAW.length]} stopOpacity={1} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            interval={tickInterval}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
                            }}
                        />
                        <YAxis
                            tick={{ fill: 'var(--foreground-muted)', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            tickFormatter={(value) => `$${value}`}
                            width={55}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ paddingTop: '15px' }}
                            iconType="plainline"
                        />
                        {stocks.map((stock, idx) => (
                            <Line
                                key={stock.symbol}
                                type="monotone"
                                dataKey={stock.symbol}
                                stroke={`url(#line-gradient-${idx})`}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stock cards */}
            <div className="mt-6 flex gap-3 flex-wrap">
                {stockReturns.map((stock, idx) => (
                    <motion.div
                        key={stock.symbol}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border cursor-pointer"
                        whileHover={{ scale: 1.02, y: -2 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                                backgroundColor: CHART_COLORS_RAW[idx % CHART_COLORS_RAW.length],
                                boxShadow: `0 0 10px ${CHART_COLORS_RAW[idx % CHART_COLORS_RAW.length]}60`
                            }}
                        />
                        <div>
                            <p className="font-semibold text-sm">{stock.symbol}</p>
                            <p className="text-xs text-foreground-muted">${stock.price.toFixed(2)}</p>
                        </div>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ml-2 ${
                            stock.return >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>
                            {stock.return >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                            ) : (
                                <TrendingDown className="w-3 h-3" />
                            )}
                            <span className="text-xs font-bold">
                                {stock.return >= 0 ? '+' : ''}{stock.return.toFixed(1)}%
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
