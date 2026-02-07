'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
} from 'recharts';
import { useTimeMachineStore } from '@/stores/timemachine-store';
import { useThemeStore } from '@/stores/theme-store';

interface ChartDataPoint {
    month: string;
    baseline: number;
    branch?: number;
    isEditPoint?: boolean;
}

export function DivergingTimeline() {
    const { baseline, branch, editPoint, delta, highlightedMonth, setHighlightedMonth } = useTimeMachineStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const chartData = useMemo((): ChartDataPoint[] => {
        if (!baseline) return [];

        return baseline.months.map((month, index) => {
            const branchMonth = branch?.months[index];
            const isEditPoint = editPoint && month.month.includes(editPoint.substring(0, 7).replace('-', ' '));

            return {
                month: month.month,
                baseline: month.cumulativeBalance,
                branch: branchMonth?.cumulativeBalance,
                isEditPoint: !!isEditPoint,
            };
        });
    }, [baseline, branch, editPoint]);

    // Find the edit point index for the reference line
    const editPointIndex = useMemo(() => {
        if (!editPoint || !baseline) return null;
        const editMonth = editPoint.substring(0, 7);
        return baseline.months.findIndex(m => {
            const monthDate = m.month.toLowerCase();
            const [monthName, year] = monthDate.split(' ');
            const monthNum = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthName.toLowerCase());
            const formattedMonth = `${year}-${String(monthNum + 1).padStart(2, '0')}`;
            return formattedMonth >= editMonth;
        });
    }, [editPoint, baseline]);

    if (!baseline || baseline.months.length === 0) {
        return (
            <div className="h-[350px] flex items-center justify-center text-foreground-muted">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p>Loading timeline...</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
        return `$${value}`;
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;

        const baselineValue = payload.find((p: any) => p.dataKey === 'baseline')?.value;
        const branchValue = payload.find((p: any) => p.dataKey === 'branch')?.value;
        const difference = branchValue !== undefined ? branchValue - baselineValue : null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-card border border-border shadow-lg backdrop-blur-md"
            >
                <p className="font-semibold text-sm mb-2">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="text-xs text-foreground-muted">Actual:</span>
                        <span className="text-xs font-mono font-semibold">${baselineValue?.toLocaleString()}</span>
                    </div>
                    {branchValue !== undefined && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent" />
                                <span className="text-xs text-foreground-muted">What If:</span>
                                <span className="text-xs font-mono font-semibold">${branchValue?.toLocaleString()}</span>
                            </div>
                            {difference !== null && (
                                <div className="pt-1 mt-1 border-t border-border flex items-center gap-2">
                                    <span className="text-xs text-foreground-muted">Difference:</span>
                                    <span className={`text-xs font-mono font-bold ${difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                                        {difference >= 0 ? '+' : ''}${difference.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    onMouseMove={(state) => {
                        if (state?.activeLabel) {
                            setHighlightedMonth(state.activeLabel as string);
                        }
                    }}
                    onMouseLeave={() => setHighlightedMonth(null)}
                >
                    <defs>
                        {/* Baseline gradient (gray) */}
                        <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isDark ? '#71717a' : '#a1a1aa'} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={isDark ? '#71717a' : '#a1a1aa'} stopOpacity={0} />
                        </linearGradient>

                        {/* Branch gradient (purple - the "what if" reality) */}
                        <linearGradient id="branchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                        vertical={false}
                    />

                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                        tickMargin={8}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: isDark ? '#a1a1aa' : '#71717a' }}
                        tickFormatter={formatCurrency}
                        tickMargin={8}
                        width={50}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    {/* Reference line at edit point */}
                    {editPointIndex !== null && editPointIndex >= 0 && (
                        <ReferenceLine
                            x={chartData[editPointIndex]?.month}
                            stroke="#6366F1"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{
                                value: '↓ Edit',
                                position: 'top',
                                fill: '#6366F1',
                                fontSize: 10,
                                fontWeight: 600,
                            }}
                        />
                    )}

                    {/* Baseline area (actual history) */}
                    <Area
                        type="monotone"
                        dataKey="baseline"
                        stroke={isDark ? '#71717a' : '#a1a1aa'}
                        strokeWidth={2}
                        fill="url(#baselineGradient)"
                        name="Actual"
                        dot={false}
                        activeDot={{ r: 4, fill: isDark ? '#71717a' : '#a1a1aa' }}
                    />

                    {/* Branch area (what-if reality) - only if we have branch data */}
                    {branch && (
                        <Area
                            type="monotone"
                            dataKey="branch"
                            stroke="#6366F1"
                            strokeWidth={3}
                            fill="url(#branchGradient)"
                            name="What If"
                            dot={false}
                            activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    )}

                    <Legend
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value) => (
                            <span className="text-xs text-foreground-muted">{value}</span>
                        )}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
