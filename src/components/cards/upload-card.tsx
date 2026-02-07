"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { useState, useCallback, useRef } from "react";

interface UploadCardProps {
  title: string;
  description: string;
  acceptedFormats: string[];
  onUpload?: (file: File) => void;
  delay?: number;
}

type UploadState = "idle" | "hovering" | "uploading" | "success" | "error";

export function UploadCard({
  title,
  description,
  acceptedFormats,
  onUpload,
}: UploadCardProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState("hovering");
  }, []);

  const handleDragLeave = useCallback(() => {
    setState("idle");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file);
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const simulateUpload = (file: File) => {
    setState("uploading");
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setState("success");
          onUpload?.(file);
          setTimeout(() => {
            setState("idle");
            setProgress(0);
          }, 2000);
          return 100;
        }
        return p + 10;
      });
    }, 100);
  };

  const stateConfig = {
    idle: { icon: Upload, color: "text-foreground-muted" },
    hovering: { icon: Upload, color: "text-primary" },
    uploading: { icon: FileText, color: "text-primary" },
    success: { icon: Check, color: "text-success" },
    error: { icon: AlertCircle, color: "text-destructive" },
  };

  const { icon: Icon, color } = stateConfig[state];

  return (
    <GlassCard>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-foreground-muted mb-4">{description}</p>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedFormats.map(f => `.${f.toLowerCase()}`).join(",")}
        onChange={handleFileSelect}
      />
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          state === "hovering" 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-border-strong"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <Icon className={`w-10 h-10 mx-auto mb-3 ${color}`} />
        
        {state === "uploading" ? (
          <div>
            <p className="text-sm mb-3">Uploading...</p>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : state === "success" ? (
          <p className="text-sm text-success font-medium">Upload complete!</p>
        ) : (
          <>
            <p className="text-sm mb-1">
              Drag and drop your file here, or{" "}
              <span className="text-primary font-medium hover:underline">
                browse
              </span>
            </p>
            <p className="text-xs text-foreground-muted">
              Supports: {acceptedFormats.join(", ")}
            </p>
          </>
        )}
      </div>
    </GlassCard>
  );
}
