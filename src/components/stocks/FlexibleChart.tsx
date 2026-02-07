'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ChartContainer } from './ChartContainer';
import { ChartConfig, CHART_PALETTES, CHART_HEIGHTS } from '@/lib/visualization-schema';
import { StockData } from '@/lib/schemas';

interface FlexibleChartProps {
    config: ChartConfig;
    stockData: StockData[];
    delay?: number;
    onExpand?: () => void;
}

/**
 * Flexible chart component that renders based on configuration
 */
export function FlexibleChart({ config, stockData, delay = 0, onExpand }: FlexibleChartProps) {
    // Prepare chart data
    const chartData = prepareChartData(stockData, config);
    const colors = CHART_PALETTES.default;
    const height = CHART_HEIGHTS[config.height || 'md'];

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="card-elevated px-4 py-3 rounded-xl shadow-lg">
                <p className="font-semibold text-sm mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-foreground-muted">{entry.name}:</span>
                        <span className="font-semibold">
                            {formatValue(entry.value, config.yAxis?.format || 'currency')}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    // Render chart based on type
    const renderChart = () => {
        const commonProps = {
            data: chartData,
            margin: { top: 10, right: 10, left: 0, bottom: 0 },
        };

        const axisProps = {
            xAxis: {
                dataKey: 'date',
                tick: { fill: 'var(--foreground-muted)', fontSize: 11 },
                tickLine: false,
                axisLine: { stroke: 'var(--border)' },
                tickFormatter: (value: string) => {
                    const d = new Date(value);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                },
            },
            yAxis: {
                tick: { fill: 'var(--foreground-muted)', fontSize: 11 },
                tickLine: false,
                axisLine: { stroke: 'var(--border)' },
                tickFormatter: (value: number) => formatValue(value, config.yAxis?.format || 'currency'),
                width: 60,
            },
        };

        switch (config.chartType) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            {config.series.map((series, idx) => (
                                <linearGradient key={series.symbol} id={`gradient-${series.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis {...axisProps.xAxis} />
                        <YAxis {...axisProps.yAxis} />
                        <Tooltip content={<CustomTooltip />} />
                        {config.showLegend && <Legend />}
                        {config.series.map((series, idx) => (
                            <Area
                                key={series.symbol}
                                type="monotone"
                                dataKey={series.symbol}
                                stroke={series.color || colors[idx % colors.length]}
                                fill={`url(#gradient-${series.symbol})`}
                                strokeWidth={series.lineWidth || 2}
                            />
                        ))}
                    </AreaChart>
                );

            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis {...axisProps.xAxis} />
                        <YAxis {...axisProps.yAxis} />
                        <Tooltip content={<CustomTooltip />} />
                        {config.showLegend && <Legend />}
                        {config.series.map((series, idx) => (
                            <Bar
                                key={series.symbol}
                                dataKey={series.symbol}
                                fill={series.color || colors[idx % colors.length]}
                            />
                        ))}
                    </BarChart>
                );

            case 'comparison':
                // Normalize to percentage change from start
                const normalizedData = normalizeData(chartData, config.series.map(s => s.symbol));
                return (
                    <LineChart data={normalizedData} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis {...axisProps.xAxis} />
                        <YAxis
                            {...axisProps.yAxis}
                            tickFormatter={(value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {config.showLegend && <Legend />}
                        <ReferenceLine y={0} stroke="var(--foreground-muted)" strokeDasharray="3 3" />
                        {config.series.map((series, idx) => (
                            <Line
                                key={series.symbol}
                                type="monotone"
                                dataKey={series.symbol}
                                stroke={series.color || colors[idx % colors.length]}
                                strokeWidth={series.lineWidth || 2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                );

            case 'line':
            default:
                return (
                    <LineChart {...commonProps}>
                        <defs>
                            {config.series.map((series, idx) => (
                                <linearGradient key={`line-${series.symbol}`} id={`line-gradient-${series.symbol}`} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={series.color || colors[idx % colors.length]} stopOpacity={0.8} />
                                    <stop offset="100%" stopColor={series.color || colors[idx % colors.length]} stopOpacity={1} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis {...axisProps.xAxis} />
                        <YAxis {...axisProps.yAxis} />
                        <Tooltip content={<CustomTooltip />} />
                        {config.showLegend && <Legend />}
                        {config.series.map((series, idx) => (
                            <Line
                                key={series.symbol}
                                type="monotone"
                                dataKey={series.symbol}
                                stroke={`url(#line-gradient-${series.symbol})`}
                                strokeWidth={series.lineWidth || 2.5}
                                dot={series.showDataPoints}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                                strokeDasharray={series.lineStyle === 'dashed' ? '5 5' : series.lineStyle === 'dotted' ? '2 2' : undefined}
                            />
                        ))}
                    </LineChart>
                );
        }
    };

    // Calculate returns for stock cards
    const stockReturns = config.series.map((series, idx) => {
        const stock = stockData.find(s => s.symbol === series.symbol);
        if (!stock || stock.data.length < 2) {
            return { symbol: series.symbol, price: 0, return: 0, color: colors[idx % colors.length] };
        }
        const first = stock.data[0].close;
        const last = stock.data[stock.data.length - 1].close;
        return {
            symbol: series.symbol,
            name: stock.name,
            price: last,
            return: ((last - first) / first) * 100,
            color: series.color || colors[idx % colors.length],
        };
    });

    return (
        <ChartContainer
            title={config.title}
            subtitle={config.subtitle}
            height={config.height}
            delay={delay}
            onExpand={onExpand}
        >
            <div className="h-full flex flex-col">
                {/* Chart */}
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>

                {/* Stock Cards */}
                <div className="mt-4 flex gap-3 flex-wrap">
                    {stockReturns.map((stock) => (
                        <motion.div
                            key={stock.symbol}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary border border-border"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: (delay + 200) / 1000 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                        >
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: stock.color }}
                            />
                            <div>
                                <p className="font-semibold text-sm">{stock.symbol}</p>
                                <p className="text-xs text-foreground-muted">
                                    ${stock.price.toFixed(2)}
                                </p>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
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
            </div>
        </ChartContainer>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function prepareChartData(stockData: StockData[], config: ChartConfig): any[] {
    const dateMap = new Map<string, any>();

    stockData.forEach((stock) => {
        // Only include series that are in the config
        if (!config.series.some(s => s.symbol === stock.symbol)) return;

        stock.data.forEach((point) => {
            if (!dateMap.has(point.date)) {
                dateMap.set(point.date, { date: point.date });
            }
            dateMap.get(point.date)![stock.symbol] = point.close;
        });
    });

    return Array.from(dateMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

function normalizeData(data: any[], symbols: string[]): any[] {
    if (data.length === 0) return data;

    const firstValues: Record<string, number> = {};
    symbols.forEach(symbol => {
        firstValues[symbol] = data[0][symbol] || 1;
    });

    return data.map(point => {
        const normalized: any = { date: point.date };
        symbols.forEach(symbol => {
            if (point[symbol] !== undefined) {
                normalized[symbol] = ((point[symbol] - firstValues[symbol]) / firstValues[symbol]) * 100;
            }
        });
        return normalized;
    });
}

function formatValue(value: number, format: string): string {
    switch (format) {
        case 'currency':
            return `$${value.toFixed(2)}`;
        case 'percent':
            return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
        case 'number':
        default:
            return value.toFixed(2);
    }
}

export default FlexibleChart;
