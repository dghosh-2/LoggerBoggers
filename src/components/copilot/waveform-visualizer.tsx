"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface WaveformVisualizerProps {
  isActive: boolean;
}

interface Bar {
  id: number;
  height: number;
}

export function WaveformVisualizer({ isActive }: WaveformVisualizerProps) {
  const [bars, setBars] = useState<Bar[]>([]);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setBars(
          Array.from({ length: 24 }, (_, i) => ({
            id: i,
            height: 15 + Math.random() * 35,
          }))
        );
      }, 80);
      return () => clearInterval(interval);
    } else {
      setBars(
        Array.from({ length: 24 }, (_, i) => ({
          id: i,
          height: 8,
        }))
      );
    }
  }, [isActive]);

  return (
    <div className="flex items-center justify-center gap-0.5 h-12">
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className="w-1 rounded-full bg-primary"
          initial={{ height: 8 }}
          animate={{ 
            height: bar.height,
            opacity: isActive ? 0.7 : 0.3,
          }}
          transition={{ 
            duration: 0.08, 
            ease: "easeOut" 
          }}
        />
      ))}
    </div>
  );
}
