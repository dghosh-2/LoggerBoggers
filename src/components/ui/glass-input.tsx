"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassInputProps extends Omit<HTMLMotionProps<"input">, "onChange"> {
  label?: string;
  icon?: React.ReactNode;
  onChange?: (value: string) => void;
}

export function GlassInput({
  label,
  icon,
  className,
  onChange,
  ...props
}: GlassInputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-foreground-muted">
          {label}
        </label>
      )}
      <motion.div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {icon}
          </div>
        )}
        <motion.input
          className={cn(
            "w-full px-3 py-2 bg-input border border-border rounded-md",
            "text-sm text-foreground placeholder:text-foreground-muted",
            "focus:border-foreground focus:ring-1 focus:ring-foreground/10 focus:outline-none",
            "transition-all duration-100",
            icon && "pl-10",
            className
          )}
          onChange={(e) => onChange?.(e.target.value)}
          {...props}
        />
      </motion.div>
    </div>
  );
}
