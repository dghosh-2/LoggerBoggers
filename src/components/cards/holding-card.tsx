"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface HoldingCardProps {
  symbol: string;
  name: string;
  value: number;
  change: number;
  percentage: number;
  delay?: number;
}

export function HoldingCard({
  symbol,
  name,
  value,
  change,
  percentage,
  delay = 0,
}: HoldingCardProps) {
  const isPositive = change >= 0;

  return (
    <GlassCard delay={delay} interactive>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{symbol.slice(0, 2)}</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold">{symbol}</h4>
            <p className="text-xs text-foreground-muted">{name}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            ${value.toLocaleString()}
          </p>
          <div className={`flex items-center justify-end gap-1 text-xs ${
            isPositive ? "text-success" : "text-destructive"
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="tabular-nums">{isPositive ? "+" : ""}{change}%</span>
          </div>
        </div>
      </div>

      {/* Portfolio percentage bar */}
      <div className="mt-3.5">
        <div className="flex justify-between text-[11px] text-foreground-muted mb-1">
          <span>Allocation</span>
          <span className="tabular-nums">{percentage}%</span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ delay: delay / 1000 + 0.2, duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </GlassCard>
  );
}
