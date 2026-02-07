"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendCardProps {
  title: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  delay?: number;
}

export function TrendCard({
  title,
  value,
  change,
  prefix = "$",
  suffix = "",
  icon,
  delay = 0,
}: TrendCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return prefix + latest.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + suffix;
  });

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1,
      delay: delay / 1000,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return controls.stop;
  }, [count, value, delay]);

  const isPositive = change >= 0;

  return (
    <GlassCard delay={delay}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-foreground-muted">{title}</span>
        {icon}
      </div>
      
      <motion.div className="text-2xl font-semibold tracking-tight tabular-nums font-mono">
        {rounded}
      </motion.div>
      
      <div
        className={`flex items-center gap-1.5 mt-2 text-xs ${
          isPositive ? "text-success" : "text-destructive"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        <span className="font-medium tabular-nums">{isPositive ? "+" : ""}{change}%</span>
        <span className="text-foreground-muted">vs last month</span>
      </div>
    </GlassCard>
  );
}
