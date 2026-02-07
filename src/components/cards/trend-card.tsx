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
      duration: 1.5,
      delay: delay / 1000,
      ease: [0.22, 1, 0.36, 1],
    });
    return controls.stop;
  }, [count, value, delay]);

  const isPositive = change >= 0;

  return (
    <GlassCard delay={delay} className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-foreground-muted">{title}</span>
        {icon && (
          <div className="p-2 rounded-lg bg-secondary">
            {icon}
          </div>
        )}
      </div>
      
      <motion.div className="text-3xl font-semibold tracking-tight">
        {rounded}
      </motion.div>
      
      <motion.div
        className={`flex items-center gap-1 mt-2 text-sm font-medium ${
          isPositive ? "text-success" : "text-destructive"
        }`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay / 1000 + 0.3, duration: 0.4 }}
      >
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span>{isPositive ? "+" : ""}{change}%</span>
        <span className="text-foreground-muted font-normal">vs last month</span>
      </motion.div>
    </GlassCard>
  );
}
