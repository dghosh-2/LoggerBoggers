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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Cash Flow</h3>
          <p className="text-sm text-foreground-muted">Income vs Savings over time</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-foreground-muted">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-foreground-muted">Savings</span>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--foreground-muted)", fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="card-elevated p-3 min-w-[140px]">
                    <p className="text-sm font-medium mb-2">{label}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-foreground-muted capitalize">{entry.name}</span>
                        <span className="font-medium">${entry.value?.toLocaleString()}</span>
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
              strokeWidth={2}
              fill="url(#incomeGradient)"
              animationDuration={1500}
              animationBegin={delay}
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#savingsGradient)"
              animationDuration={1500}
              animationBegin={delay + 200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
