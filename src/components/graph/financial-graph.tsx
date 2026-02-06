"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/stores/graph-store";
import {
  drawBezierCurve,
  drawRoundedRect,
  createParticle,
  updateParticle,
  drawParticle,
  darkNodeStyles,
  Particle,
} from "@/lib/graph-engine";

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function FinancialGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map());
  
  const { nodes, edges } = useGraphStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const nodeStyles = darkNodeStyles;

  // Calculate node positions
  const calculatePositions = useCallback((width: number, height: number) => {
    const positions = new Map<string, NodePosition>();
    const nodeWidth = 140;
    const nodeHeight = 70;
    
    // Group nodes by type for layout
    const incomeNodes = nodes.filter((n) => n.type === "income");
    const accountNodes = nodes.filter((n) => n.type === "account");
    const expenseNodes = nodes.filter((n) => n.type === "expense");
    const savingsNodes = nodes.filter((n) => n.type === "savings");
    const investmentNodes = nodes.filter((n) => n.type === "investment");
    const goalNodes = nodes.filter((n) => n.type === "goal");

    // Position income nodes on the left
    incomeNodes.forEach((node, i) => {
      positions.set(node.id, {
        id: node.id,
        x: 50,
        y: 80 + i * (nodeHeight + 30),
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Position account nodes in the center-left
    accountNodes.forEach((node, i) => {
      positions.set(node.id, {
        id: node.id,
        x: width * 0.3,
        y: 120 + i * (nodeHeight + 50),
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Position expense nodes on the right
    expenseNodes.forEach((node, i) => {
      const cols = 2;
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(node.id, {
        id: node.id,
        x: width * 0.6 + col * (nodeWidth + 20),
        y: 50 + row * (nodeHeight + 20),
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Position savings nodes at bottom center-right
    savingsNodes.forEach((node, i) => {
      positions.set(node.id, {
        id: node.id,
        x: width * 0.55 + i * (nodeWidth + 20),
        y: height - 120,
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Position investment nodes at bottom
    investmentNodes.forEach((node, i) => {
      positions.set(node.id, {
        id: node.id,
        x: width * 0.35 + i * (nodeWidth + 20),
        y: height - 50,
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Position goal nodes at far right
    goalNodes.forEach((node, i) => {
      positions.set(node.id, {
        id: node.id,
        x: width - nodeWidth - 40,
        y: 100 + i * (nodeHeight + 30),
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    return positions;
  }, [nodes]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      
      nodePositionsRef.current = calculatePositions(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Spawn particles periodically
    const particleInterval = setInterval(() => {
      const nodePositions = nodePositionsRef.current;
      if (nodePositions.size === 0) return;
      
      edges.forEach((edge) => {
        if (Math.random() > 0.85) {
          const sourcePos = nodePositions.get(edge.source);
          const targetPos = nodePositions.get(edge.target);
          if (sourcePos && targetPos) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const particleColor = sourceNode?.type === "income"
              ? "rgba(52, 211, 153, 0.8)"
              : "rgba(180, 180, 180, 0.6)";
            
            particlesRef.current.push(
              createParticle(
                sourcePos.x + sourcePos.width,
                sourcePos.y + sourcePos.height / 2,
                targetPos.x,
                targetPos.y + targetPos.height / 2,
                particleColor
              )
            );
          }
        }
      });
    }, 200);

    // Animation loop
    const animate = () => {
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const nodePositions = nodePositionsRef.current;

      // Draw edges
      edges.forEach((edge) => {
        const sourcePos = nodePositions.get(edge.source);
        const targetPos = nodePositions.get(edge.target);
        if (sourcePos && targetPos) {
          drawBezierCurve(
            ctx,
            sourcePos.x + sourcePos.width,
            sourcePos.y + sourcePos.height / 2,
            targetPos.x,
            targetPos.y + targetPos.height / 2,
            "rgba(120, 120, 120, 0.15)"
          );
        }
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        const alive = updateParticle(particle);
        if (alive) {
          drawParticle(ctx, particle);
        }
        return alive;
      });

      // Draw nodes
      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const style = nodeStyles[node.type] || nodeStyles.account;
        const isHovered = hoveredNode === node.id;

        // Glow effect
        if (isHovered) {
          ctx.shadowColor = style.glow;
          ctx.shadowBlur = 20;
        }

        // Node background
        drawRoundedRect(ctx, pos.x, pos.y, pos.width, pos.height, 12);
        ctx.fillStyle = isHovered 
          ? style.fill.replace(/[\d.]+\)$/, "0.15)") 
          : style.fill;
        ctx.fill();
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Node text
        ctx.fillStyle = style.textColor;
        ctx.font = "600 13px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, pos.x + pos.width / 2, pos.y + pos.height / 2 - 8);

        // Amount
        ctx.font = "500 11px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "rgba(140, 140, 140, 0.8)";
        ctx.fillText(
          `$${node.amount.toLocaleString()}`,
          pos.x + pos.width / 2,
          pos.y + pos.height / 2 + 10
        );
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
      clearInterval(particleInterval);
    };
  }, [nodes, edges, hoveredNode, calculatePositions, nodeStyles]);

  // Handle mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const nodePositions = nodePositionsRef.current;
      let found = false;
      
      nodePositions.forEach((pos, id) => {
        if (
          x >= pos.x &&
          x <= pos.x + pos.width &&
          y >= pos.y &&
          y <= pos.y + pos.height
        ) {
          setHoveredNode(id);
          setTooltipPos({ x: pos.x + pos.width + 10, y: pos.y });
          found = true;
        }
      });
      
      if (!found) {
        setHoveredNode(null);
        setTooltipPos(null);
      }
    },
    []
  );

  const hoveredNodeData = hoveredNode ? nodes.find((n) => n.id === hoveredNode) : null;

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[400px]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredNode(null);
          setTooltipPos(null);
        }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNodeData && tooltipPos && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute pointer-events-none card-elevated p-3 min-w-[160px]"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
          >
            <p className="font-semibold text-sm">{hoveredNodeData.label}</p>
            <p className="text-xs text-foreground-muted capitalize mb-2">{hoveredNodeData.type}</p>
            <p className="text-lg font-semibold text-primary">
              ${hoveredNodeData.amount.toLocaleString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
