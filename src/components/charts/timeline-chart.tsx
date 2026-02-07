"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";

interface TimelineChartProps {
  data: Array<{
    month: string;
    spending: number;
    budget: number;
  }>;
  onBarClick?: (month: string) => void;
  delay?: number;
}

export function TimelineChart({ data, onBarClick, delay = 0 }: TimelineChartProps) {
  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold">Monthly Spending</h3>
          <p className="text-xs text-foreground-muted">Budget vs actual spending</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-success/60" />
            <span className="text-foreground-muted">Under budget</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-destructive/60" />
            <span className="text-foreground-muted">Over budget</span>
          </div>
        </div>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                const spending = payload[0].value as number;
                const budget = data.find((d) => d.month === label)?.budget || 0;
                const isOver = spending > budget;
                return (
                  <div className="bg-card border border-border rounded-lg shadow-md p-2.5">
                    <p className="text-xs font-medium mb-1.5">{label}</p>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex justify-between gap-4">
                        <span className="text-foreground-muted">Spent</span>
                        <span className="font-medium tabular-nums">${spending.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-foreground-muted">Budget</span>
                        <span className="font-medium tabular-nums">${budget.toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between gap-4 pt-1 border-t border-border ${isOver ? "text-destructive" : "text-success"}`}>
                        <span>{isOver ? "Over" : "Under"}</span>
                        <span className="font-medium tabular-nums">${Math.abs(spending - budget).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="spending"
              radius={[3, 3, 0, 0]}
              animationDuration={1200}
              animationBegin={delay}
              cursor="pointer"
              onClick={(data) => {
                const payload = data as unknown as { month: string };
                if (payload.month) onBarClick?.(payload.month);
              }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.spending > entry.budget ? "var(--destructive)" : "var(--success)"}
                  fillOpacity={0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
