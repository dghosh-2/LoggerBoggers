"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
}

export function Confetti({ isActive, duration = 3000 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = ["#b8860b", "#d4a017", "#0d9488", "#2dd4bf", "#059669", "#34d399"];
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${piece.x}%`,
            top: -10,
            backgroundColor: piece.color,
          }}
          initial={{ 
            y: 0, 
            rotate: 0,
            opacity: 1,
            scale: 1
          }}
          animate={{ 
            y: "100vh", 
            rotate: piece.rotation + 720,
            opacity: 0,
            scale: 0.5
          }}
          transition={{
            duration: 2.5,
            delay: piece.delay,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
}
