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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Monthly Spending</h3>
          <p className="text-sm text-foreground-muted">Budget vs actual spending</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-success/60" />
            <span className="text-foreground-muted">Under budget</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-destructive/60" />
            <span className="text-foreground-muted">Over budget</span>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                const spending = payload[0].value as number;
                const budget = data.find((d) => d.month === label)?.budget || 0;
                const isOver = spending > budget;
                return (
                  <div className="card-elevated p-3">
                    <p className="text-sm font-medium mb-2">{label}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-foreground-muted">Spent</span>
                        <span className="font-medium">${spending.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-foreground-muted">Budget</span>
                        <span className="font-medium">${budget.toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between gap-4 pt-1 border-t border-border ${isOver ? "text-destructive" : "text-success"}`}>
                        <span>{isOver ? "Over" : "Under"}</span>
                        <span className="font-medium">${Math.abs(spending - budget).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="spending"
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
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
                  fillOpacity={0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
