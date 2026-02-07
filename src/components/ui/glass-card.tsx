"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  delay?: number;
}

export function GlassCard({ 
  children, 
  className, 
  interactive = false,
  delay = 0,
  ...props 
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.25, 
        delay: delay / 1000, 
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className={cn(
        "card-elevated p-6",
        interactive && "card-interactive cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
