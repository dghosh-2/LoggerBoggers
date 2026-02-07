"use client";

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line
} from 'recharts';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/stores/theme-store';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SimulationOutput } from '@/lib/simulation-engine';

interface SimulationChartProps {
  baseIncome: number;
  baseExpenses: number;
  incomeChange: number;
  expenseChange: number;
  months: number;
  simulationResult?: SimulationOutput | null;
}

// Seeded random for consistent but varied results
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

// Seasonal spending multipliers (Dec high, Jan recovery, summer vacation, etc.)
const SEASONAL_EXPENSE_FACTORS: Record<number, number> = {
  0: 0.92,  // Jan - post-holiday recovery
  1: 0.95,  // Feb - low spending
  2: 0.98,  // Mar - spring
  3: 1.02,  // Apr - spring activities
  4: 1.05,  // May - pre-summer
  5: 1.12,  // Jun - summer starts, vacations
  6: 1.15,  // Jul - peak summer
  7: 1.10,  // Aug - back to school
  8: 1.02,  // Sep - normalizing
  9: 1.00,  // Oct - stable
  10: 1.08, // Nov - holiday prep, Black Friday
  11: 1.25, // Dec - holidays peak
};

// Income variability (bonuses, etc.)
const INCOME_EVENTS: Record<number, number> = {
  2: 1.05,  // Mar - Q1 bonus potential
  5: 1.03,  // Jun - mid-year review
  11: 1.15, // Dec - year-end bonus
};

export function SimulationChart({
  baseIncome,
  baseExpenses,
  incomeChange,
  expenseChange,
  months,
  simulationResult
}: SimulationChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Generate projection data with realistic patterns
  const chartData = useMemo(() => {
    const data = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Target values (what we're transitioning to)
    const targetIncome = baseIncome * (1 + incomeChange / 100);
    const targetExpenses = baseExpenses * (1 + expenseChange / 100);

    // Add current month as baseline
    data.push({
      month: 'Now',
      income: baseIncome,
      expenses: baseExpenses,
      savings: baseIncome - baseExpenses,
      cumulative: 0,
      cumulativeHigh: 0,
      cumulativeLow: 0,
      simulationCumulative: null,
      isBaseline: true
    });

    let cumulativeSavings = 0;
    let cumulativeHigh = 0;
    let cumulativeLow = 0;
    let simulationCumulativeBalance = 0;

    for (let i = 1; i <= months; i++) {
      const monthIndex = (currentMonth + i) % 12;

      // Gradual transition to target (ease-out curve over ~6 months)
      const transitionProgress = Math.min(1, i / 6);
      const easeOut = 1 - Math.pow(1 - transitionProgress, 3);

      // Current targets based on transition
      const currentTargetIncome = baseIncome + (targetIncome - baseIncome) * easeOut;
      const currentTargetExpenses = baseExpenses + (targetExpenses - baseExpenses) * easeOut;

      // Apply seasonal factors
      const seasonalExpenseFactor = SEASONAL_EXPENSE_FACTORS[monthIndex] || 1;
      const incomeEvent = INCOME_EVENTS[monthIndex] || 1;

      // Add organic randomness (seeded for consistency)
      const randomSeed = i * 137 + incomeChange * 13 + expenseChange * 7;
      const incomeNoise = 1 + (seededRandom(randomSeed) - 0.5) * 0.06;
      const expenseNoise = 1 + (seededRandom(randomSeed + 1) - 0.5) * 0.08;

      // Calculate final values
      const monthIncome = Math.round(currentTargetIncome * incomeEvent * incomeNoise);
      const monthExpenses = Math.round(currentTargetExpenses * seasonalExpenseFactor * expenseNoise);
      const monthSavings = monthIncome - monthExpenses;

      // Optimistic/pessimistic scenarios for confidence band
      const optimisticSavings = monthSavings * 1.15;
      const pessimisticSavings = monthSavings * 0.85;

      cumulativeSavings += monthSavings;
      cumulativeHigh += optimisticSavings;
      cumulativeLow += pessimisticSavings;

      // Get simulation data if available
      let simulationCumulative = null;
      if (simulationResult?.projections && i <= simulationResult.projections.length) {
        const simProjection = simulationResult.projections[i - 1];
        simulationCumulativeBalance = simProjection.balance - 5000; // Subtract starting balance to show net change
        simulationCumulative = simulationCumulativeBalance;
      }

      data.push({
        month: monthNames[monthIndex],
        income: monthIncome,
        expenses: monthExpenses,
        savings: monthSavings,
        cumulative: Math.round(cumulativeSavings),
        cumulativeHigh: Math.round(cumulativeHigh),
        cumulativeLow: Math.round(cumulativeLow),
        simulationCumulative,
        isBaseline: false,
        hasBonus: incomeEvent > 1,
        isHighSpend: seasonalExpenseFactor > 1.1
      });
    }

    return data;
  }, [baseIncome, baseExpenses, incomeChange, expenseChange, months, simulationResult]);

  // Calculate summary stats
  const finalCumulative = chartData[chartData.length - 1]?.cumulative || 0;
  const avgMonthlySavings = months > 0 ? Math.round(finalCumulative / months) : 0;
  const isPositive = finalCumulative >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-foreground">{label}</p>
            {data.hasBonus && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success">Bonus</span>
            )}
            {data.isHighSpend && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">High Spend</span>
            )}
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-6">
              <span className="text-foreground-muted">Income</span>
              <span className="font-mono text-success">${data.income?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="text-foreground-muted">Expenses</span>
              <span className="font-mono text-destructive">${data.expenses?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-6 pt-1.5 border-t border-border">
              <span className="text-foreground-muted">Monthly Savings</span>
              <span className={`font-mono font-medium ${data.savings >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${data.savings?.toLocaleString()}
              </span>
            </div>
            {!data.isBaseline && (
              <>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-foreground-muted">Cumulative</span>
                  <span className={`font-mono font-semibold ${data.cumulative >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ${data.cumulative?.toLocaleString()}
                  </span>
                </div>
                {data.simulationCumulative !== null && (
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-foreground-muted">Simulation</span>
                    <span className={`font-mono font-semibold ${data.simulationCumulative >= 0 ? 'text-purple-500' : 'text-destructive'}`}>
                      ${data.simulationCumulative?.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-6 text-[10px] opacity-70">
                  <span className="text-foreground-muted">Range</span>
                  <span className="font-mono">
                    ${data.cumulativeLow?.toLocaleString()} - ${data.cumulativeHigh?.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Projection Timeline</h3>
          <p className="text-xs text-foreground-muted">{months} month simulation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs text-foreground-muted">Cumulative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isDark ? '#34d399' : '#059669' }} />
            <span className="text-xs text-foreground-muted">Monthly</span>
          </div>
          {simulationResult && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-xs text-foreground-muted">Simulation</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-sm bg-primary/20 border border-dashed border-primary/40" />
            <span className="text-xs text-foreground-muted">Range</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#d4a017' : '#b8860b'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isDark ? '#d4a017' : '#b8860b'} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isDark ? '#34d399' : '#059669'} stopOpacity={0.2} />
                <stop offset="95%" stopColor={isDark ? '#34d399' : '#059669'} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#d4a017' : '#b8860b'} stopOpacity={0.1} />
                <stop offset="100%" stopColor={isDark ? '#d4a017' : '#b8860b'} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke={isDark ? '#8a8780' : '#6b6860'}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <YAxis
              stroke={isDark ? '#8a8780' : '#6b6860'}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={isDark ? '#6b6860' : '#9ca3af'} strokeDasharray="3 3" />
            {/* Confidence band - high range */}
            <Area
              type="monotone"
              dataKey="cumulativeHigh"
              stroke="transparent"
              fill="url(#confidenceGradient)"
              dot={false}
              activeDot={false}
            />
            {/* Confidence band - low range (will create visual band effect) */}
            <Area
              type="monotone"
              dataKey="cumulativeLow"
              stroke={isDark ? 'rgba(212, 160, 23, 0.2)' : 'rgba(184, 134, 11, 0.2)'}
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              activeDot={false}
            />
            {/* Main cumulative line */}
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={isDark ? '#d4a017' : '#b8860b'}
              strokeWidth={2.5}
              fill="url(#cumulativeGradient)"
              dot={false}
              activeDot={{ r: 5, fill: isDark ? '#d4a017' : '#b8860b', strokeWidth: 0 }}
            />
            {/* Monthly savings */}
            <Area
              type="monotone"
              dataKey="savings"
              stroke={isDark ? '#34d399' : '#059669'}
              strokeWidth={1.5}
              fill="url(#savingsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: isDark ? '#34d399' : '#059669', strokeWidth: 0 }}
            />
            {/* Simulation line - only show if simulation data exists */}
            {simulationResult && (
              <Line
                type="monotone"
                dataKey="simulationCumulative"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }}
                connectNulls={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-xs text-foreground-muted mb-1">End Balance</p>
          <p className={`text-lg font-semibold font-mono ${isPositive ? 'text-primary' : 'text-destructive'}`}>
            ${Math.abs(finalCumulative).toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-center"
        >
          <p className="text-xs text-foreground-muted mb-1">Avg Monthly</p>
          <p className={`text-lg font-semibold font-mono ${avgMonthlySavings >= 0 ? 'text-success' : 'text-destructive'}`}>
            ${Math.abs(avgMonthlySavings).toLocaleString()}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <p className="text-xs text-foreground-muted mb-1">Trend</p>
          <div className="flex items-center justify-center gap-1">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? 'Growing' : 'Declining'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
