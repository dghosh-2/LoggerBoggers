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
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground-muted">
          {label}
        </label>
      )}
      <motion.div
        className="relative"
        whileFocus={{ scale: 1.01 }}
      >
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
            {icon}
          </div>
        )}
        <motion.input
          className={cn(
            "w-full px-4 py-3 bg-input border border-border rounded-xl",
            "text-foreground placeholder:text-foreground-muted",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            "transition-all duration-200",
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
