'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StockData } from '@/lib/schemas';

interface StockChartProps {
    stocks: StockData[];
    showAnnotations?: boolean;
    onDataPointClick?: (date: string, symbol: string, priceData: any) => void;
    chartMode?: 'combined' | 'separate';
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StockChart({ stocks, onDataPointClick, chartMode = 'combined' }: StockChartProps) {
    if (!stocks || stocks.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center rounded-3xl relative overflow-hidden">
                {/* iOS gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300" />
                {/* Glass overlay */}
                <div className="absolute inset-0 ios-glass" />
                <p className="relative text-white/70 font-medium">No data to display</p>
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

    // iOS-style glass tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="ios-glass-tooltip px-4 py-3 rounded-2xl">
                <p className="font-semibold text-gray-800 mb-1.5 text-sm">{label}</p>
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
        <>
            {/* iOS-style glassmorphism - only for chart */}
            <style jsx global>{`
                .ios-glass {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: saturate(180%) blur(30px);
                    -webkit-backdrop-filter: saturate(180%) blur(30px);
                    border: 0.5px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 
                        0 8px 32px rgba(31, 38, 135, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.4);
                }
                
                .ios-glass-card {
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: saturate(180%) blur(20px);
                    -webkit-backdrop-filter: saturate(180%) blur(20px);
                    border: 0.5px solid rgba(255, 255, 255, 0.35);
                    box-shadow: 
                        0 4px 24px rgba(31, 38, 135, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.5);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .ios-glass-card:hover {
                    background: rgba(255, 255, 255, 0.25);
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 
                        0 12px 40px rgba(31, 38, 135, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.6);
                }
                
                .ios-glass-tooltip {
                    background: rgba(255, 255, 255, 0.75);
                    backdrop-filter: saturate(180%) blur(20px);
                    -webkit-backdrop-filter: saturate(180%) blur(20px);
                    border: 0.5px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 
                        0 8px 32px rgba(31, 38, 135, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.8);
                }
                
                .ios-badge {
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: saturate(180%) blur(12px);
                    -webkit-backdrop-filter: saturate(180%) blur(12px);
                    border: 0.5px solid rgba(255, 255, 255, 0.4);
                }
            `}</style>

            {/* Chart container with its own gradient background */}
            <div className="relative rounded-[28px] overflow-hidden shadow-xl">
                {/* iOS-style gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300" />

                {/* Glass layer */}
                <div className="ios-glass rounded-[28px] p-7 relative">
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 pointer-events-none rounded-[28px]" />

                    {/* Content */}
                    <div className="relative">
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-white drop-shadow">Stock Performance</h2>
                            <p className="text-sm text-white/80 mt-1">Interactive comparison chart</p>
                        </div>

                        {/* Chart */}
                        <div className="relative">
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={chartData}>
                                    <defs>
                                        {stocks.map((stock, idx) => (
                                            <linearGradient key={`gradient-${stock.symbol}`} id={`line-gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.85} />
                                                <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}
                                        tickLine={false}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                                        interval={tickInterval}
                                        tickFormatter={(value) => {
                                            const d = new Date(value);
                                            return `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
                                        }}
                                    />
                                    <YAxis
                                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 500 }}
                                        tickLine={false}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
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
                                            activeDot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* iOS-style stock cards */}
                        <div className="mt-6 flex gap-3 flex-wrap">
                            {stockReturns.map((stock, idx) => (
                                <div
                                    key={stock.symbol}
                                    className="ios-glass-card flex items-center gap-3 px-4 py-3.5 rounded-[20px] cursor-pointer"
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{
                                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                            boxShadow: `0 0 10px ${CHART_COLORS[idx % CHART_COLORS.length]}60`
                                        }}
                                    />
                                    <div>
                                        <p className="font-semibold text-white text-sm">{stock.symbol}</p>
                                        <p className="text-xs text-white/70">${stock.price.toFixed(2)}</p>
                                    </div>
                                    <div className={`ios-badge px-2.5 py-1 rounded-full ml-2 ${stock.return >= 0 ? 'text-white' : 'text-red-200'}`}>
                                        <span className="text-xs font-bold">
                                            {stock.return >= 0 ? '+' : ''}{stock.return.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
