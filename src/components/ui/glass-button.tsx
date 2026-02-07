"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  success: "bg-success text-white hover:opacity-85",
  danger: "bg-destructive text-white hover:opacity-85",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: GlassButtonProps) {
  return (
    <motion.button
      whileHover={!disabled ? { 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      } : undefined}
      whileTap={!disabled ? { 
        scale: 0.97,
        transition: { duration: 0.1 }
      } : undefined}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 rounded-md cursor-pointer",
        "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
