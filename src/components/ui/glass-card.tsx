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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: delay / 1000, 
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={interactive ? { 
        y: -2,
        transition: { duration: 0.2 }
      } : undefined}
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
