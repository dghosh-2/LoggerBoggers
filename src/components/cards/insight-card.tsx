"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { AlertTriangle, Info, AlertCircle, ChevronRight } from "lucide-react";

type Severity = "info" | "warning" | "alert";

interface InsightCardProps {
  title: string;
  description: string;
  severity: Severity;
  action?: string;
  onAction?: () => void;
  delay?: number;
}

const severityConfig = {
  info: {
    icon: Info,
    colors: "text-accent bg-accent/10 border-accent/20",
    iconClass: "text-accent",
  },
  warning: {
    icon: AlertTriangle,
    colors: "text-warning bg-warning/10 border-warning/20",
    iconClass: "text-warning",
  },
  alert: {
    icon: AlertCircle,
    colors: "text-destructive bg-destructive/10 border-destructive/20",
    iconClass: "text-destructive",
  },
};

export function InsightCard({
  title,
  description,
  severity,
  action,
  onAction,
  delay = 0,
}: InsightCardProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <GlassCard delay={delay} interactive className="group">
      <div className="flex items-start gap-4">
        <motion.div
          className={`p-2.5 rounded-xl ${config.colors} border`}
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className={`w-5 h-5 ${config.iconClass}`} />
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm text-foreground-muted leading-relaxed">
            {description}
          </p>
          
          {action && (
            <motion.button
              onClick={onAction}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              whileHover={{ x: 3 }}
            >
              {action}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
