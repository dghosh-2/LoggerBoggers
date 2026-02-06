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
          <motion.div 
            className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
          >
            <span className="text-sm font-bold text-primary">{symbol.slice(0, 2)}</span>
          </motion.div>
          <div>
            <h4 className="font-semibold">{symbol}</h4>
            <p className="text-sm text-foreground-muted">{name}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-semibold">
            ${value.toLocaleString()}
          </p>
          <div className={`flex items-center justify-end gap-1 text-sm ${
            isPositive ? "text-success" : "text-destructive"
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{isPositive ? "+" : ""}{change}%</span>
          </div>
        </div>
      </div>

      {/* Portfolio percentage bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-foreground-muted mb-1.5">
          <span>Portfolio allocation</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ delay: delay / 1000 + 0.2, duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </GlassCard>
  );
}
