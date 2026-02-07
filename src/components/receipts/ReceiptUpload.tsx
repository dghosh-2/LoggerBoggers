"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, UploadCloud, Wand2 } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { cn } from "@/lib/utils";
import { supabase } from "@repo/core";
import { preprocessReceiptImage } from "@/lib/imagePreprocess";
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from "@/lib/storage";

export default function ReceiptUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setSelectedFile = (next: File | null) => {
    setError(null);
    setFile(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  };

  const onBrowse = () => inputRef.current?.click();

  const onDrop = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setSelectedFile(f);
  };

  const onScan = async () => {
    if (!file) return;
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
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);

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
    </div>
  );
}
