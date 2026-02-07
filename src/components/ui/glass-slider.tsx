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
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-xs text-foreground-muted">{label}</span>
        )}
        <span className="text-xs font-medium font-mono tabular-nums text-foreground">
          {formatValue(value)}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative h-1 bg-border rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-foreground"
          style={{ width: `${percentage}%` }}
          initial={false}
        />
        <motion.div
          className="absolute top-1/2 w-3 h-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-foreground border-2 border-background"
          style={{ left: `${percentage}%` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
}
