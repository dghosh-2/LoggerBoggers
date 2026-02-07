"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";

interface CashflowChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  delay?: number;
}

export function CashflowChart({ data, delay = 0 }: CashflowChartProps) {
  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold">Cash Flow</h3>
          <p className="text-xs text-foreground-muted">Income vs Savings over time</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-foreground-muted">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-foreground-muted">Savings</span>
          </div>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-card border border-border rounded-lg shadow-md p-2.5 min-w-[120px]">
                    <p className="text-xs font-medium mb-1.5">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-[11px] gap-3">
                        <span className="text-foreground-muted capitalize">{entry.name}</span>
                        <span className="font-medium tabular-nums">${entry.value?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--primary)"
              strokeWidth={1.5}
              fill="url(#incomeGradient)"
              animationDuration={1200}
              animationBegin={delay}
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill="url(#savingsGradient)"
              animationDuration={1200}
              animationBegin={delay + 150}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
