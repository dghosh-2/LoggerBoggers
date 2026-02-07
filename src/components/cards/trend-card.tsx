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
    <GlassCard delay={delay} className="group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-foreground-muted group-hover:text-foreground transition-colors duration-200">{title}</span>
        <motion.div
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      </div>
      
      <motion.div 
        className="text-2xl font-semibold tracking-tight tabular-nums font-mono"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: (delay / 1000) + 0.2, duration: 0.3 }}
      >
        {rounded}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: (delay / 1000) + 0.4, duration: 0.3 }}
        className={`flex items-center gap-1.5 mt-2 text-xs ${
          isPositive ? "text-success" : "text-destructive"
        }`}
      >
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
        </motion.div>
        <span className="font-medium tabular-nums">{isPositive ? "+" : ""}{change}%</span>
        <span className="text-foreground-muted">vs last month</span>
      </motion.div>
    </GlassCard>
  );
}
