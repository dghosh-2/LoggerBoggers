"use client";

import { motion } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GlassSliderProps {
  label?: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  className?: string;
}

export function GlassSlider({
  label,
  min = 0,
  max = 100,
  value,
  onChange,
  formatValue = (v) => v.toString(),
  className,
}: GlassSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMove = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const newPercentage = x / rect.width;
      const newValue = Math.round(min + newPercentage * (max - min));
      onChange(newValue);
    },
    [min, max, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-sm font-medium text-foreground-muted">{label}</span>
        )}
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-semibold text-primary"
        >
          {formatValue(value)}
        </motion.span>
      </div>
      <div
        ref={trackRef}
        className="relative h-2 bg-secondary rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* Filled track */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
          initial={false}
          animate={{ opacity: isDragging ? 1 : 0.7 }}
        />

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary shadow-md"
          style={{ left: `${percentage}%` }}
          animate={{ 
            scale: isDragging ? 1.15 : 1,
          }}
          transition={{ duration: 0.15 }}
        />
      </div>
    </div>
  );
}
