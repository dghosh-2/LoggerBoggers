// Graph rendering utilities for Canvas

export interface NodeStyle {
  fill: string;
  stroke: string;
  glow: string;
  textColor: string;
}

// Dark mode node styles
export const darkNodeStyles: Record<string, NodeStyle> = {
  income: {
    fill: "rgba(52, 211, 153, 0.08)",
    stroke: "rgba(52, 211, 153, 0.4)",
    glow: "rgba(52, 211, 153, 0.15)",
    textColor: "#34d399",
  },
  expense: {
    fill: "rgba(248, 113, 113, 0.08)",
    stroke: "rgba(248, 113, 113, 0.4)",
    glow: "rgba(248, 113, 113, 0.15)",
    textColor: "#f87171",
  },
  savings: {
    fill: "rgba(129, 140, 248, 0.08)",
    stroke: "rgba(129, 140, 248, 0.4)",
    glow: "rgba(129, 140, 248, 0.15)",
    textColor: "#818cf8",
  },
  investment: {
    fill: "rgba(212, 160, 23, 0.08)",
    stroke: "rgba(212, 160, 23, 0.4)",
    glow: "rgba(212, 160, 23, 0.15)",
    textColor: "#d4a017",
  },
  goal: {
    fill: "rgba(45, 212, 191, 0.08)",
    stroke: "rgba(45, 212, 191, 0.4)",
    glow: "rgba(45, 212, 191, 0.15)",
    textColor: "#2dd4bf",
  },
  account: {
    fill: "rgba(255, 255, 255, 0.04)",
    stroke: "rgba(255, 255, 255, 0.2)",
    glow: "rgba(255, 255, 255, 0.08)",
    textColor: "#fafafa",
  },
};

// Light mode node styles
export const lightNodeStyles: Record<string, NodeStyle> = {
  income: {
    fill: "rgba(5, 150, 105, 0.08)",
    stroke: "rgba(5, 150, 105, 0.5)",
    glow: "rgba(5, 150, 105, 0.1)",
    textColor: "#059669",
  },
  expense: {
    fill: "rgba(220, 38, 38, 0.08)",
    stroke: "rgba(220, 38, 38, 0.5)",
    glow: "rgba(220, 38, 38, 0.1)",
    textColor: "#dc2626",
  },
  savings: {
    fill: "rgba(99, 102, 241, 0.08)",
    stroke: "rgba(99, 102, 241, 0.5)",
    glow: "rgba(99, 102, 241, 0.1)",
    textColor: "#6366f1",
  },
  investment: {
    fill: "rgba(184, 134, 11, 0.08)",
    stroke: "rgba(184, 134, 11, 0.5)",
    glow: "rgba(184, 134, 11, 0.1)",
    textColor: "#b8860b",
  },
  goal: {
    fill: "rgba(13, 148, 136, 0.08)",
    stroke: "rgba(13, 148, 136, 0.5)",
    glow: "rgba(13, 148, 136, 0.1)",
    textColor: "#0d9488",
  },
  account: {
    fill: "rgba(0, 0, 0, 0.03)",
    stroke: "rgba(0, 0, 0, 0.15)",
    glow: "rgba(0, 0, 0, 0.05)",
    textColor: "#1a1915",
  },
};

export function getNodeStyles(theme: "light" | "dark"): Record<string, NodeStyle> {
  return theme === "dark" ? darkNodeStyles : lightNodeStyles;
}

// Draw a bezier curve between two points
export function drawBezierCurve(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string = "rgba(255, 255, 255, 0.06)"
) {
  const midX = (startX + endX) / 2;
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(midX, startY, midX, endY, endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Draw a rounded rectangle
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Create particle for money flow animation
export interface Particle {
  x: number;
  y: number;
  progress: number;
  speed: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
}

export function createParticle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string = "rgba(255, 255, 255, 0.6)"
): Particle {
  return {
    x: startX,
    y: startY,
    progress: 0,
    speed: 0.004 + Math.random() * 0.004,
    startX,
    startY,
    endX,
    endY,
    color,
    size: 2 + Math.random() * 1.5,
  };
}

// Update particle position along bezier curve
export function updateParticle(particle: Particle): boolean {
  particle.progress += particle.speed;
  
  if (particle.progress >= 1) {
    return false;
  }
  
  const t = particle.progress;
  const midX = (particle.startX + particle.endX) / 2;
  
  // Bezier curve interpolation
  const oneMinusT = 1 - t;
  particle.x = oneMinusT * oneMinusT * oneMinusT * particle.startX +
    3 * oneMinusT * oneMinusT * t * midX +
    3 * oneMinusT * t * t * midX +
    t * t * t * particle.endX;
  
  particle.y = oneMinusT * oneMinusT * oneMinusT * particle.startY +
    3 * oneMinusT * oneMinusT * t * particle.startY +
    3 * oneMinusT * t * t * particle.endY +
    t * t * t * particle.endY;
  
  return true;
}

// Draw particle with glow effect
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle
) {
  const opacity = Math.sin(particle.progress * Math.PI) * 0.8;
  
  // Subtle glow
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
  ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${opacity * 0.3})`);
  ctx.fill();
  
  // Core
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${opacity})`);
  ctx.fill();
}
