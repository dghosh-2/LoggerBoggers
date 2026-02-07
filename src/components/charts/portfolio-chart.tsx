"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";

interface PortfolioChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  delay?: number;
}

export function PortfolioChart({ data, delay = 0 }: PortfolioChartProps) {
  const startValue = data[0]?.value || 0;
  const endValue = data[data.length - 1]?.value || 0;
  const isPositive = endValue >= startValue;

  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold">Portfolio Performance</h3>
          <p className="text-xs text-foreground-muted">Last 12 months</p>
        </div>
        <div className={`text-xs font-medium px-2.5 py-1 rounded-md ${
          isPositive 
            ? "text-success bg-success-soft" 
            : "text-destructive bg-destructive-soft"
        }`}>
          {isPositive ? "+" : ""}
          {(((endValue - startValue) / startValue) * 100).toFixed(1)}%
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "var(--success)" : "var(--destructive)"} stopOpacity={0.1} />
                <stop offset="95%" stopColor={isPositive ? "var(--success)" : "var(--destructive)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              domain={["dataMin - 5000", "dataMax + 5000"]}
            />
            <ReferenceLine y={startValue} stroke="var(--border)" strokeDasharray="4 4" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0].value as number;
                const changeFromStart = ((value - startValue) / startValue) * 100;
                return (
                  <div className="bg-card border border-border rounded-lg shadow-md p-2.5">
                    <p className="text-xs font-medium mb-1">{label}</p>
                    <p className="text-base font-semibold tabular-nums">${value.toLocaleString()}</p>
                    <p className={`text-[11px] tabular-nums ${changeFromStart >= 0 ? "text-success" : "text-destructive"}`}>
                      {changeFromStart >= 0 ? "+" : ""}{changeFromStart.toFixed(1)}% from start
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "var(--success)" : "var(--destructive)"}
              strokeWidth={1.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: isPositive ? "var(--success)" : "var(--destructive)",
                strokeWidth: 2,
                stroke: "var(--background)",
              }}
              animationDuration={1200}
              animationBegin={delay}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
