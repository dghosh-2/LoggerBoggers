"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crop, Image as ImageIcon, UploadCloud, Wand2, X } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils";
import { supabase } from "@repo/core";
import { preprocessReceiptImage } from "@/lib/imagePreprocess";
import {
  detectReceiptCorners,
  flattenReceiptFromCorners,
  type NormalizedPoint,
  type NormalizedQuad,
} from "@/lib/receiptAutoCrop";
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from "@/lib/storage";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function orderNormalizedQuad(points: NormalizedPoint[]): NormalizedQuad {
  const mapped = points.map((p) => ({ x: p.x, y: p.y }));
  const sums = mapped.map((p) => p.x + p.y);
  const diffs = mapped.map((p) => p.x - p.y);
  const tl = mapped[sums.indexOf(Math.min(...sums))];
  const br = mapped[sums.indexOf(Math.max(...sums))];
  const tr = mapped[diffs.indexOf(Math.max(...diffs))];
  const bl = mapped[diffs.indexOf(Math.min(...diffs))];
  return [tl, tr, br, bl];
}

type CropGeom = {
  containerW: number;
  containerH: number;
  imageW: number;
  imageH: number;
  offsetX: number;
  offsetY: number;
};

function computeContainGeom(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number
): CropGeom {
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const imageW = naturalW * scale;
  const imageH = naturalH * scale;
  const offsetX = (containerW - imageW) / 2;
  const offsetY = (containerH - imageH) / 2;
  return { containerW, containerH, imageW, imageH, offsetX, offsetY };
}

export default function ReceiptUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropQuad, setCropQuad] = useState<NormalizedQuad | null>(null);
  const [cropDragIndex, setCropDragIndex] = useState<number | null>(null);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const [cropGeom, setCropGeom] = useState<CropGeom | null>(null);
  const [cropStepDone, setCropStepDone] = useState(false);
  const cropMaskIdRaw = useId();
  const cropMaskId = useMemo(() => `cropmask_${cropMaskIdRaw.replaceAll(":", "")}`, [cropMaskIdRaw]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setSelectedFile = (next: File | null, opts?: { resetCropStep?: boolean }) => {
    setError(null);
    setFile(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setCropError(null);
    setCropQuad(null);
    if (opts?.resetCropStep ?? true) setCropStepDone(false);
  };

  const onBrowse = () => inputRef.current?.click();

  const onDrop = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setSelectedFile(f);
  };

  const openCropper = async (opts?: { reuseExisting?: boolean }) => {
    if (!file) return;
    if (opts?.reuseExisting && cropQuad) {
      setCropOpen(true);
      return;
    }
    setCropOpen(true);
    setCropBusy(true);
    setCropError(null);
    setCropQuad(null);
    try {
      const corners = await detectReceiptCorners(file);
      const fallback: NormalizedQuad = [
        { x: 0.06, y: 0.06 },
        { x: 0.94, y: 0.06 },
        { x: 0.94, y: 0.94 },
        { x: 0.06, y: 0.94 },
      ];
      setCropQuad(corners ?? fallback);
    } catch (e: unknown) {
      setCropError(e instanceof Error ? e.message : "Could not detect receipt corners");
      setCropQuad([
        { x: 0.06, y: 0.06 },
        { x: 0.94, y: 0.06 },
        { x: 0.94, y: 0.94 },
        { x: 0.06, y: 0.94 },
      ]);
    } finally {
      setCropBusy(false);
    }
  };

  const refreshCropGeom = () => {
    const stage = cropStageRef.current;
    const img = cropImgRef.current;
    if (!stage || !img) return;
    const rect = stage.getBoundingClientRect();
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!rect.width || !rect.height || !naturalW || !naturalH) return;
    setCropGeom(computeContainGeom(rect.width, rect.height, naturalW, naturalH));
  };

  const applyCrop = async () => {
    if (!file || !cropQuad) return;
    setCropBusy(true);
    setCropError(null);
    try {
      const flattened = await flattenReceiptFromCorners(file, cropQuad);
      if (!flattened) throw new Error("Could not crop with selected corners");
      setSelectedFile(flattened, { resetCropStep: false });
      setCropOpen(false);
      setCropStepDone(true);
    } catch (e: unknown) {
      setCropError(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setCropBusy(false);
    }
  };

  // Prompt crop/adjust right after selecting an image, and gate scanning until user confirms.
  useEffect(() => {
    if (!file) return;
    if (cropStepDone) return;
    void openCropper();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (!cropOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCropOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cropOpen]);

  useEffect(() => {
    if (!cropOpen) return;
    refreshCropGeom();

    const viewport = cropViewportRef.current;
    if (!viewport) return;

    const ro = new ResizeObserver(() => refreshCropGeom());
    ro.observe(viewport);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropOpen]);

  const onScan = async () => {
    if (!file) return;
    if (!cropStepDone) {
      await openCropper({ reuseExisting: true });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Resize/compress for faster OCR + upload; avoids huge camera images.
      const optimized = await preprocessReceiptImage(file, {
        maxLongEdge: 2000,
        initialQuality: 0.82,
        maxBytes: 3.5 * 1024 * 1024,
      });

      const fileForUpload = optimized.file;
      const objectKey = buildSafeReceiptObjectKey(fileForUpload.name);

      const { error: uploadError } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(objectKey, fileForUpload, { upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(objectKey);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL for uploaded receipt");

      const res = await fetch("/api/receipts/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: publicUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to upload receipts.");
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }

      const receiptId = json?.receipt_id;
      if (!receiptId) throw new Error("Upload did not return a receipt_id");

      window.location.href = `/receipts/review/${receiptId}`;
    } catch (e: unknown) {
      setError(formatStorageError(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setSelectedFile(null);

  if (!previewUrl) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) onDrop(f);
          }}
        />

        <div
          className={cn(
            "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragOver
              ? "border-accent bg-accent/5"
              : "border-border bg-secondary/30 hover:bg-secondary/50"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0] ?? null;
            if (f) onDrop(f);
          }}
          onClick={onBrowse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onBrowse();
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border">
            <UploadCloud className="h-5 w-5 text-foreground-muted" />
          </div>
          <div className="mt-3 text-sm font-semibold">Drop a receipt image</div>
          <div className="mt-1 text-[11px] text-foreground-muted">
            or click to browse. JPG, PNG, HEIC are fine.
          </div>
        </div>

        {error && <div className="mt-2 text-xs font-medium text-destructive">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background-secondary p-2">
        <div className="relative w-full overflow-hidden rounded-md bg-background">
          <div className="aspect-[4/5] w-full">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-foreground-muted">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="truncate">{file?.name}</span>
        </div>
      </div>

      <div className="grid gap-2">
        <GlassButton
          variant="secondary"
          size="lg"
          onClick={openCropper}
          disabled={loading}
          className="w-full"
        >
          <Crop className="h-4 w-4" />
          Adjust Crop
        </GlassButton>

        <GlassButton
          variant="primary"
          size="lg"
          onClick={onScan}
          disabled={loading}
          className="w-full"
        >
          <Wand2 className="h-4 w-4" />
          {loading ? "Scanning..." : "Scan Receipt"}
        </GlassButton>

        <GlassButton
          variant="secondary"
          size="lg"
          onClick={reset}
          disabled={loading}
          className="w-full"
        >
          Choose Different Image
        </GlassButton>
      </div>

      {error && <div className="text-xs font-medium text-destructive">{error}</div>}

      <AnimatePresence>
        {cropOpen && previewUrl && (
          <motion.div
            className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCropOpen(false)}
          >
            <motion.div
              className="w-full max-w-4xl"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="card-elevated p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold tracking-tight">Adjust Crop</div>
                    <div className="text-sm text-foreground-muted mt-1">
                      {cropQuad ? "AI detected corners. Drag to adjust." : "Detecting receipt corners..."}
                    </div>
                  </div>
                  <GlassButton variant="ghost" size="sm" onClick={() => setCropOpen(false)}>
                    <X className="w-4 h-4" />
                    Close
                  </GlassButton>
                </div>

                {cropError ? (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                    {cropError}
                  </div>
                ) : null}

                <div
                  ref={cropViewportRef}
                  className={cn(
                    "relative mt-4 rounded-lg border border-border bg-background-secondary overflow-hidden",
                    "h-[min(62vh,640px)]"
                  )}
                  onPointerMove={(e) => {
                    if (cropDragIndex == null) return;
                    if (!cropGeom) return;
                    const stage = cropStageRef.current;
                    if (!stage) return;
                    const rect = stage.getBoundingClientRect();
                    const localX = e.clientX - rect.left;
                    const localY = e.clientY - rect.top;
                    const nx = clamp01((localX - cropGeom.offsetX) / Math.max(1, cropGeom.imageW));
                    const ny = clamp01((localY - cropGeom.offsetY) / Math.max(1, cropGeom.imageH));
                    setCropQuad((prev) => {
                      if (!prev) return prev;
                      const pts = prev.map((p, idx) => (idx === cropDragIndex ? { x: nx, y: ny } : p));
                      return orderNormalizedQuad(pts);
                    });
                  }}
                  onPointerUp={() => setCropDragIndex(null)}
                  onPointerCancel={() => setCropDragIndex(null)}
                >
                  <div ref={cropStageRef} className="absolute inset-4 sm:inset-6">
                    <div className="relative w-full h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={cropImgRef}
                        src={previewUrl}
                        alt="Crop preview"
                        className="absolute inset-0 w-full h-full object-contain select-none"
                        draggable={false}
                        onLoad={() => refreshCropGeom()}
                      />

                      {cropQuad ? (
                        <>
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox={
                              cropGeom ? `0 0 ${cropGeom.containerW} ${cropGeom.containerH}` : undefined
                            }
                            preserveAspectRatio="none"
                          >
                            <defs>
                              <mask id={cropMaskId}>
                                <rect
                                  x="0"
                                  y="0"
                                  width={cropGeom?.containerW ?? "100%"}
                                  height={cropGeom?.containerH ?? "100%"}
                                  fill="white"
                                />
                                <polygon
                                  points={
                                    cropGeom
                                      ? cropQuad
                                          .map(
                                            (p) =>
                                              `${cropGeom.offsetX + p.x * cropGeom.imageW},${
                                                cropGeom.offsetY + p.y * cropGeom.imageH
                                              }`
                                          )
                                          .join(" ")
                                      : ""
                                  }
                                  fill="black"
                                />
                              </mask>
                            </defs>

                            {/* Dim everything outside the selected quad */}
                            <rect
                              x="0"
                              y="0"
                              width={cropGeom?.containerW ?? "100%"}
                              height={cropGeom?.containerH ?? "100%"}
                              fill="rgba(0,0,0,0.45)"
                              mask={`url(#${cropMaskId})`}
                            />

                            <polygon
                              points={
                                cropGeom
                                  ? cropQuad
                                      .map(
                                        (p) =>
                                          `${cropGeom.offsetX + p.x * cropGeom.imageW},${
                                            cropGeom.offsetY + p.y * cropGeom.imageH
                                          }`
                                      )
                                      .join(" ")
                                  : ""
                              }
                              fill="rgba(99,102,241,0.10)"
                              stroke="rgba(99,102,241,0.95)"
                              strokeWidth="0.5"
                              vectorEffect="non-scaling-stroke"
                            />
                          </svg>

                          {cropQuad.map((p, idx) => {
                            const isTop = idx === 0 || idx === 1;
                            const isLeft = idx === 0 || idx === 3;
                            const anchor = cn(
                              isTop ? "top-3" : "bottom-3",
                              isLeft ? "left-3" : "right-3"
                            );

                            return (
                              <button
                                key={idx}
                                type="button"
                                className={cn(
                                  "absolute -translate-x-1/2 -translate-y-1/2",
                                  "h-12 w-12 bg-transparent",
                                  "cursor-grab active:cursor-grabbing"
                                )}
                                style={
                                  cropGeom
                                    ? {
                                        left: `${cropGeom.offsetX + p.x * cropGeom.imageW}px`,
                                        top: `${cropGeom.offsetY + p.y * cropGeom.imageH}px`,
                                      }
                                    : undefined
                                }
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
                                  setCropDragIndex(idx);
                                }}
                                aria-label={`Corner ${idx + 1}`}
                              >
                                <span
                                  className={cn(
                                    "absolute inset-0 rounded-md",
                                    "ring-1 ring-accent/30 bg-background/10 backdrop-blur-[1px]"
                                  )}
                                />
                                <span
                                  className={cn(
                                    "absolute h-[3px] w-5 rounded-sm bg-accent shadow-sm",
                                    anchor
                                  )}
                                />
                                <span
                                  className={cn(
                                    "absolute w-[3px] h-5 rounded-sm bg-accent shadow-sm",
                                    anchor
                                  )}
                                />
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground-muted backdrop-blur-sm">
                            Detecting corners...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      setCropOpen(false);
                      setCropStepDone(true);
                    }}
                    disabled={cropBusy}
                  >
                    Use As-Is
                  </GlassButton>
                  <GlassButton variant="primary" onClick={applyCrop} disabled={cropBusy || !cropQuad}>
                    {cropBusy ? "Applying..." : "Apply Crop"}
                  </GlassButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
