"use client";

import { motion } from "framer-motion";
import { Eye, Edit3, Layers, Activity } from "lucide-react";

interface GraphControlsProps {
  mode: "view" | "edit";
  onModeChange: (mode: "view" | "edit") => void;
  overlay: "sandbox" | "actual";
  onOverlayChange: (overlay: "sandbox" | "actual") => void;
}

export function GraphControls({
  mode,
  onModeChange,
  overlay,
  onOverlayChange,
}: GraphControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary">
        <button
          onClick={() => onModeChange("view")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === "view"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Eye className="w-4 h-4" />
          View
        </button>
        <button
          onClick={() => onModeChange("edit")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            mode === "edit"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Overlay Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary">
        <button
          onClick={() => onOverlayChange("actual")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            overlay === "actual"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Activity className="w-4 h-4" />
          Actual
        </button>
        <button
          onClick={() => onOverlayChange("sandbox")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            overlay === "sandbox"
              ? "bg-card text-foreground shadow-sm"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          Sandbox
        </button>
      </div>
    </div>
  );
}
