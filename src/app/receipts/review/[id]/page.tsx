'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@repo/core';
import { autoCropReceiptFile } from '@/lib/receiptAutoCrop';
import {
    detectReceiptCorners,
    flattenReceiptFromCorners,
    type NormalizedQuad,
    type NormalizedPoint,
} from '@/lib/receiptAutoCrop';
import { DogLoadingAnimation } from '@/components/ui/DogLoadingAnimation';
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { refreshGlobalFinancialData } from "@/hooks/useFinancialData";
import { cn } from "@/lib/utils";
import { STANDARD_CATEGORIES, normalizeCategory } from "@/lib/categories";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    ChevronDown,
    Loader2,
    Plus,
    Trash2,
    Crop,
    X,
} from "lucide-react";

interface BBox {
    value: unknown;
    bbox: [number, number, number, number];
    confidence: number;
}

type ReceiptCorrections = Partial<{
    merchant: string;
    address: string;
    date: string;
    total: number;
    subtotal: number;
    tax: number;
}>;

interface ReceiptState {
    id: string;
    image_original_path: string;
    status: string;
    merchant_name?: string | null;
    transaction_date?: string | null;
    total_amount?: number | null;
    subtotal_amount?: number | null;
    tax_amount?: number | null;
    currency?: string | null;
    receipt_extractions: Array<{
        extracted_json: {
            raw_text?: string;
            summary?: string;
            is_partial?: boolean;
            amount_breakdown?: {
                subtotal?: number | null;
                tax?: number | null;
                discount?: number | null;
                tip?: number | null;
                fees?: number | null;
            };
            extractions: {
                merchant: BBox;
                address?: BBox;
                date: BBox;
                total: BBox;
                subtotal: BBox;
                tax: BBox;
                currency: { value: string; confidence: number };
            };
            items: Array<{
                name: string;
                price: number;
                quantity?: number | null;
                unit_price?: number | null;
                unitPrice?: number | null;
                category_prediction?: string | null;
                bbox: [number, number, number, number];
            }>;
            quality: { blur: number; glare: number; readability: number; is_low_quality: boolean };
        };
    }>;
    receipt_items?: Array<{
        id: string;
        line_index: number;
        item_name: string;
        item_amount: number;
        quantity: number | null;
        unit_price: number | null;
        item_category: string | null;
        bbox?: [number, number, number, number] | null;
    }>;
    receipt_amount_breakdowns?: Array<{
        subtotal: number | null;
        tax: number | null;
        discount: number | null;
        tip: number | null;
        fees: number | null;
    }>;
}

interface EditableItem {
    lineIndex: number;
    name: string;
    quantity: number;
    unitPrice: number;
    unitPriceInput: string;
    category: string;
    bbox?: [number, number, number, number] | null;
}

const CATEGORY_OPTIONS = [...STANDARD_CATEGORIES];

type BboxTransformMode = 'none' | 'flipY' | 'rotate180' | 'rotate90cw' | 'rotate90ccw';
type BboxModeOverride = 'auto' | BboxTransformMode;

type ReceiptLineItem = {
    lineIndex: number;
    name: string;
    price: number; // line total
    quantity: number | null;
    unitPrice: number | null;
    category: string | null;
    bbox: [number, number, number, number] | null;
};

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return fallback;
}

function parseBboxModeOverride(value: string): BboxModeOverride {
    if (
        value === 'auto'
        || value === 'none'
        || value === 'flipY'
        || value === 'rotate180'
        || value === 'rotate90cw'
        || value === 'rotate90ccw'
    ) {
        return value;
    }
    return 'auto';
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

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

function SkeletonLine({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "h-3 w-full rounded bg-foreground/10 dark:bg-foreground/15",
                "animate-pulse-soft",
                className
            )}
        />
    );
}

function Stepper({ active }: { active: 1 | 2 | 3 }) {
    const steps: Array<{ label: string }> = [
        { label: "Upload" },
        { label: "Extract" },
        { label: "Review" },
    ];

    return (
        <div className="mt-4 rounded-lg border border-border bg-background-secondary px-3 py-2">
            <div className="flex items-center justify-between gap-3">
                {steps.map((s, idx) => {
                    const step = (idx + 1) as 1 | 2 | 3;
                    const isActive = step === active;
                    const isDone = step < active;
                    return (
                        <div key={s.label} className="flex items-center gap-2 min-w-0">
                            <div
                                className={cn(
                                    "h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-semibold",
                                    isDone && "border-success/30 bg-success-soft text-success",
                                    isActive && "border-accent/30 bg-accent/10 text-foreground",
                                    !isDone && !isActive && "border-border bg-background text-foreground-muted"
                                )}
                            >
                                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step}
                            </div>
                            <div className="min-w-0">
                                <div
                                    className={cn(
                                        "text-[11px] font-semibold uppercase tracking-wide",
                                        isActive ? "text-foreground" : "text-foreground-muted"
                                    )}
                                >
                                    {s.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AnimatedNumber({
    valueKey,
    children,
    className,
}: {
    valueKey: string | number;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
                key={String(valueKey)}
                initial={{ opacity: 0, y: 4, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                className={className}
            >
                {children}
            </motion.span>
        </AnimatePresence>
    );
}

export default function ReceiptReviewPage() {
    const { id } = useParams();
    const receiptId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();

    const [data, setData] = useState<ReceiptState | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [corrections, setCorrections] = useState<ReceiptCorrections>({});
    const [loadingStage, setLoadingStage] = useState<'active' | 'exiting' | 'hidden'>('active');
    const [displayImagePath, setDisplayImagePath] = useState<string | null>(null);
    const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
    const [hasManualItemEdits, setHasManualItemEdits] = useState(false);
    const [activeItemEdit, setActiveItemEdit] = useState<number | null>(null);
    const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
    const [bboxModeOverride, setBboxModeOverride] = useState<BboxModeOverride>('auto');
    const [lineFlashKeys, setLineFlashKeys] = useState<Record<number, number>>({});
    const [debugRerunStatus, setDebugRerunStatus] = useState<string | null>(null);
    const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);
    const [confirmSuccessSummary, setConfirmSuccessSummary] = useState<{
        merchant: string;
        date: string | null;
        items: number;
        total: number;
        categoryTotals: Array<{ category: string; total: number }>;
    } | null>(null);
    const firstResultsRenderedRef = useRef(false);
    const pageLoadStartedAtRef = useRef<number>(Date.now());

    const receiptStageRef = useRef<HTMLDivElement | null>(null);
    const receiptWrapRef = useRef<HTMLDivElement | null>(null);
    const receiptImgRef = useRef<HTMLImageElement | null>(null);
    const baseReceiptSizeRef = useRef<{ w: number; h: number } | null>(null);
    const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

    const [cropOpen, setCropOpen] = useState(false);
    const [cropBusy, setCropBusy] = useState(false);
    const [cropError, setCropError] = useState<string | null>(null);
    const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
    const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
    const [cropQuad, setCropQuad] = useState<NormalizedQuad | null>(null);
    const cropViewportRef = useRef<HTMLDivElement | null>(null);
    const [cropDragIndex, setCropDragIndex] = useState<number | null>(null);
    const [disableBboxOverlay, setDisableBboxOverlay] = useState(false);

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const zoomRef = useRef(1);
    const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    useEffect(() => {
        return () => {
            if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
        };
    }, [cropPreviewUrl]);

    const clampPan = useCallback((next: { x: number; y: number }, z: number) => {
        const stage = receiptStageRef.current;
        const base = baseReceiptSizeRef.current;
        if (!stage || !base) return next;

        const stageRect = stage.getBoundingClientRect();
        const w = base.w * z;
        const h = base.h * z;
        // Allow panning even when the receipt is smaller than the viewport (move it around in whitespace).
        const maxX = Math.abs(w - stageRect.width) / 2;
        const maxY = Math.abs(h - stageRect.height) / 2;

        return {
            x: Math.max(-maxX, Math.min(maxX, next.x)),
            y: Math.max(-maxY, Math.min(maxY, next.y)),
        };
    }, []);

    const setZoomClamped = useCallback((nextZoom: number) => {
        const z = Math.max(1, Math.min(4, nextZoom));
        setZoom(z);
        setPan((prev) => clampPan(prev, z));
    }, [clampPan]);

    // Native wheel handler with `{ passive: false }` to reliably prevent default scrolling on trackpads.
    // React's synthetic onWheel can be passive in some browsers, causing zoom to "not work" (page scrolls instead).
    useEffect(() => {
        const stage = receiptStageRef.current;
        // The receipt viewport isn't mounted during the initial loading screen render.
        // Re-run this effect when the receipt image source is available so we can bind.
        if (!stage) return;

        const onWheel = (e: WheelEvent) => {
            let base = baseReceiptSizeRef.current;
            if (!base) {
                // Best-effort lazy measurement so zoom works even if the image load/measure effect
                // hasn't run yet.
                const img = receiptImgRef.current;
                if (img) {
                    const rect = img.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        base = { w: rect.width / (zoomRef.current || 1), h: rect.height / (zoomRef.current || 1) };
                        baseReceiptSizeRef.current = base;
                    }
                }
            }
            if (!base) return;

            e.preventDefault();

            const stageRect = stage.getBoundingClientRect();
            const cx = e.clientX - (stageRect.left + stageRect.width / 2);
            const cy = e.clientY - (stageRect.top + stageRect.height / 2);

            const currentZoom = zoomRef.current;
            const currentPan = panRef.current;

            const factor = Math.exp(-e.deltaY * 0.0015);
            const nextZoom = Math.max(1, Math.min(4, currentZoom * factor));
            const scale = nextZoom / currentZoom;
            const nextPan = {
                x: currentPan.x * scale + cx * (1 - scale),
                y: currentPan.y * scale + cy * (1 - scale),
            };

            setZoom(nextZoom);
            setPan(clampPan(nextPan, nextZoom));
        };

        stage.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            stage.removeEventListener('wheel', onWheel);
        };
    }, [clampPan, displayImagePath, data?.image_original_path, loading]);

    const fetchReceiptData = useCallback(async () => {
        if (!receiptId) return;

        try {
            const res = await fetch(`/api/receipts/${receiptId}`);
            const json = (await res.json()) as ReceiptState | { error?: string };
            if ("error" in json && json.error) throw new Error(json.error);
            setData(json as ReceiptState);
            setError(null);

            const ext = (json as ReceiptState).receipt_extractions?.[0]?.extracted_json?.extractions;
            if (ext) {
                setCorrections((prev) => {
                    if (Object.keys(prev || {}).length > 0) return prev;
                    return {
                        merchant: typeof ext.merchant?.value === 'string' ? ext.merchant.value : undefined,
                        date: typeof ext.date?.value === 'string' ? ext.date.value : undefined,
                        total: typeof ext.total?.value === 'number' ? ext.total.value : undefined,
                        subtotal: typeof ext.subtotal?.value === 'number' ? ext.subtotal.value : undefined,
                        tax: typeof ext.tax?.value === 'number' ? ext.tax.value : undefined,
                    };
                });
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to fetch receipt'));
        } finally {
            setLoading(false);
        }
    }, [receiptId]);

    useEffect(() => {
        if (!receiptId) return;
        pageLoadStartedAtRef.current = Date.now();
        firstResultsRenderedRef.current = false;
        setLoading(true);
        setHasManualItemEdits(false);
        setEditableItems([]);
        setActiveItemEdit(null);
        setHoveredItemIndex(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setLineFlashKeys({});
        fetchReceiptData();
    }, [receiptId, fetchReceiptData]);

    const hasAnyItemBbox = useMemo(() => {
        const persisted = (data?.receipt_items ?? []).some((it) => Array.isArray(it?.bbox) && it.bbox.length === 4);
        const extracted = (data?.receipt_extractions?.[0]?.extracted_json?.items ?? []).some((it) => Array.isArray(it?.bbox) && it.bbox.length === 4);
        return persisted || extracted;
    }, [data]);

    useEffect(() => {
        if (!receiptId) return;

        // Realtime subscriptions replace interval polling.
        const channel = supabase
            .channel(`receipt-live-${receiptId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'receipts', filter: `id=eq.${receiptId}` },
                () => fetchReceiptData(),
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'receipt_extractions', filter: `receipt_id=eq.${receiptId}` },
                () => fetchReceiptData(),
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'receipt_items', filter: `receipt_id=eq.${receiptId}` },
                () => fetchReceiptData(),
            )
            .subscribe((status) => {
                // Close race where OCR finishes between initial fetch and channel readiness.
                if (status === 'SUBSCRIBED') fetchReceiptData();
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [receiptId, fetchReceiptData]);

    useEffect(() => {
        let cancelled = false;
        let objectUrlToRevoke: string | null = null;

        const sourceUrl = data?.image_original_path;
        if (!sourceUrl) {
            setDisplayImagePath(null);
            return;
        }
        const resolvedSourceUrl = sourceUrl;

        // Default immediately to server image; replace with cropped object URL if successful.
        setDisplayImagePath(resolvedSourceUrl);

        async function prepareDisplayImage() {
            // Bounding boxes are relative to the original image. Cropping would make overlays inaccurate.
            if (hasAnyItemBbox) return;
            try {
                const res = await fetch(resolvedSourceUrl);
                if (!res.ok) return;

                const blob = await res.blob();
                if (!blob.type.startsWith('image/')) return;

                const input = new File([blob], 'receipt-source', {
                    type: blob.type,
                    lastModified: Date.now(),
                });

                const { file: croppedFile, didCrop } = await autoCropReceiptFile(input);
                if (!didCrop || cancelled) return;

                objectUrlToRevoke = URL.createObjectURL(croppedFile);
                setDisplayImagePath(objectUrlToRevoke);
            } catch {
                // Keep source image as fallback.
            }
        }

        prepareDisplayImage();

        return () => {
            cancelled = true;
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        };
    }, [data?.image_original_path, hasAnyItemBbox]);

    const openCropper = useCallback(async () => {
        const sourceUrl = data?.image_original_path;
        if (!sourceUrl) return;

        setCropOpen(true);
        setCropBusy(true);
        setCropError(null);

        try {
            const res = await fetch(sourceUrl);
            if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
            const blob = await res.blob();
            if (!blob.type.startsWith('image/')) throw new Error('Source is not an image');

            const file = new File([blob], 'receipt-source', { type: blob.type, lastModified: Date.now() });
            setCropSourceFile(file);

            const preview = URL.createObjectURL(file);
            setCropPreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return preview;
            });

            const corners = await detectReceiptCorners(file);
            const fallback: NormalizedQuad = [
                { x: 0.06, y: 0.06 },
                { x: 0.94, y: 0.06 },
                { x: 0.94, y: 0.94 },
                { x: 0.06, y: 0.94 },
            ];
            setCropQuad(corners ?? fallback);
        } catch (e: unknown) {
            setCropError(getErrorMessage(e, 'Could not open cropper'));
        } finally {
            setCropBusy(false);
        }
    }, [data?.image_original_path]);

    const applyCrop = useCallback(async () => {
        if (!cropSourceFile || !cropQuad) return;
        setCropBusy(true);
        setCropError(null);
        try {
            const flattened = await flattenReceiptFromCorners(cropSourceFile, cropQuad);
            if (!flattened) throw new Error('Could not crop with selected corners');
            const url = URL.createObjectURL(flattened);
            setDisplayImagePath((prev) => {
                // Avoid revoking server URLs; only revoke object URLs we created.
                if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return url;
            });
            if (hasAnyItemBbox) setDisableBboxOverlay(true);
            setCropOpen(false);
        } catch (e: unknown) {
            setCropError(getErrorMessage(e, 'Crop failed'));
        } finally {
            setCropBusy(false);
        }
    }, [cropSourceFile, cropQuad, hasAnyItemBbox]);

    useEffect(() => {
        if (!cropOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setCropOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [cropOpen]);

    useEffect(() => {
        const img = receiptImgRef.current;
        if (!img) return;

        // Capture the base size (zoom=1) to allow clamping pan in a stable way.
        const measure = () => {
            const rect = img.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                baseReceiptSizeRef.current = { w: rect.width / zoom, h: rect.height / zoom };
                setPan((prev) => clampPan(prev, zoom));
            }
        };

        // Measure after image has layout.
        const id = window.requestAnimationFrame(measure);
        window.addEventListener('resize', measure);
        return () => {
            window.cancelAnimationFrame(id);
            window.removeEventListener('resize', measure);
        };
    }, [displayImagePath, data?.image_original_path, clampPan, zoom]);

    const handleConfirm = async () => {
        if (!receiptId) return;

        setConfirmError(null);
        const badIndex = editableItems.findIndex((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0);
        if (badIndex !== -1) {
            const badItem = editableItems[badIndex];
            setConfirmError(`Unit price must be greater than $0.00. Fix "${badItem?.name || `Item ${badIndex + 1}`}".`);
            return;
        }

        setSubmitting(true);
        try {
            const correctedForSubmit = {
                ...corrections,
                // Ensure totals reflect any manual edits before persisting.
                total: Number(finalTotalValue || 0),
                subtotal: Number(lineSubtotal || 0),
                tax: Number(lineTax || 0),
            };

            const res = await fetch(`/api/receipts/${receiptId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    corrected_json: correctedForSubmit,
                    items: editableItems,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to confirm');
            }

            const dateValue =
                (corrections?.date ?? extractions?.date?.value ?? data?.transaction_date ?? null) as string | null;

            const categorySums = new Map<string, number>();
            for (const it of editableItems) {
                const categoryRaw = (it?.category ?? '').toString().trim();
                const category = categoryRaw || 'Uncategorized';
                const qty = Number(it?.quantity || 0);
                const unit = Number(it?.unitPrice || 0);
                const line = qty * unit;
                if (!Number.isFinite(line) || line <= 0) continue;
                categorySums.set(category, (categorySums.get(category) ?? 0) + line);
            }
            const categoryTotals = Array.from(categorySums.entries())
                .map(([category, total]) => ({ category, total }))
                .sort((a, b) => b.total - a.total);

            setConfirmSuccessSummary({
                merchant: merchantName,
                date: dateValue ? String(dateValue) : null,
                items: editableItems.length,
                total: Number(finalTotalValue || 0),
                categoryTotals,
            });
            setShowConfirmSuccess(true);
            void refreshGlobalFinancialData();
            setSubmitting(false);

            // Stay on the success popup until the user chooses an action.
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to confirm receipt'));
            setSubmitting(false);
        }
    };

    // (intentionally no-op)

    const extraction = data?.receipt_extractions?.[0]?.extracted_json;
    const extractionReady = Boolean(extraction?.extractions);
    const hasItems = (data?.receipt_items?.length ?? 0) > 0 || (extraction?.items?.length ?? 0) > 0;
    const statusIsDone = data?.status === 'ready' || data?.status === 'confirmed';
    const statusIsFailed = data?.status === 'failed';
    const waitingForResult = !loading && !statusIsFailed && !statusIsDone && !hasItems && !extractionReady;
    const showOcrLoading = loading || waitingForResult;
    const showLoadingLayer = showOcrLoading || loadingStage === 'exiting';
    const showFailureNotice = statusIsFailed && !extractionReady && !hasItems;
    const receiptDisplaySrc = displayImagePath || data?.image_original_path || '';
    const extractions = data?.receipt_extractions?.[0]?.extracted_json?.extractions;
    const extractedItems = useMemo<ReceiptLineItem[]>(() => {
        if (!data) return [];

        // If we have persisted receipt_items but missing bbox for some rows, try to fill it from
        // the latest extraction payload (which often has better geometry).
        const extractionItems = data.receipt_extractions?.[0]?.extracted_json?.items ?? [];
        const bboxByLineIndex = new Map<number, [number, number, number, number] | null>();
        for (let i = 0; i < extractionItems.length; i += 1) {
            const it = extractionItems[i];
            const idxRaw = (it as unknown as { line_index?: number; lineIndex?: number })?.line_index
                ?? (it as unknown as { lineIndex?: number })?.lineIndex
                ?? i;
            const idx = Number(idxRaw);
            if (!Number.isFinite(idx)) continue;
            const bbox = (it as unknown as { bbox?: unknown })?.bbox ?? null;
            if (Array.isArray(bbox) && bbox.length === 4) {
                const [x0, y0, x1, y1] = bbox.map((n) => Number(n));
                const normalized: [number, number, number, number] = [x0, y0, x1, y1];
                bboxByLineIndex.set(idx, normalized.every((n) => Number.isFinite(n)) ? normalized : null);
            } else {
                bboxByLineIndex.set(idx, null);
            }
        }

        if (data.receipt_items?.length) {
            return data.receipt_items.map((item) => ({
                lineIndex: item.line_index,
                name: item.item_name,
                price: Number(item.item_amount || 0),
                quantity: item.quantity != null ? Number(item.quantity) : null,
                unitPrice: item.unit_price != null ? Number(item.unit_price) : null,
	                category: item.item_category ? normalizeCategory(item.item_category) : 'Other',
                bbox: item.bbox ?? (bboxByLineIndex.get(item.line_index) ?? null),
            }));
        }

        return extractionItems.map((item, index) => ({
            lineIndex: index,
            name: item.name,
            price: Number(item.price || 0),
            quantity: item.quantity != null ? Number(item.quantity) : null,
            unitPrice: item.unit_price != null
                ? Number(item.unit_price)
                : (item.unitPrice != null ? Number(item.unitPrice) : null),
	            category: item.category_prediction ? normalizeCategory(item.category_prediction) : null,
            bbox: item.bbox ?? null,
        }));
    }, [data]);

    useEffect(() => {
        if (showOcrLoading) {
            setLoadingStage('active');
            return;
        }

        setLoadingStage((prev) => {
            if (prev !== 'active') return prev;
            return 'exiting';
        });

        const timeoutId = setTimeout(() => {
            setLoadingStage('hidden');
        }, 520);

        return () => clearTimeout(timeoutId);
    }, [showOcrLoading]);

    useEffect(() => {
        if (!data) return;
        if (hasManualItemEdits) return;

        const normalizedItems: EditableItem[] = extractedItems.map((item, index) => {
            const derivedQuantity = Number(item.quantity ?? 1);
            const normalizedQuantity = Number.isFinite(derivedQuantity) && derivedQuantity > 0 ? derivedQuantity : 1;
            const lineTotal = Number(item.price ?? 0);

            // `price` in our items is the line total, so if we don't have an explicit unit price,
            // derive it as `lineTotal / quantity` to avoid showing the line total as the unit price.
            const explicitUnitPrice = Number(item.unitPrice);
            const derivedUnitPrice = (
                Number.isFinite(explicitUnitPrice) && explicitUnitPrice > 0
                    ? explicitUnitPrice
                    : (Number.isFinite(lineTotal) && lineTotal > 0 ? (lineTotal / normalizedQuantity) : 0)
            );
            const normalizedUnitPrice = Number.isFinite(derivedUnitPrice) ? derivedUnitPrice : 0;
            return {
                lineIndex: item.lineIndex ?? index,
                name: item.name || `Item ${index + 1}`,
                quantity: normalizedQuantity,
                unitPrice: normalizedUnitPrice,
                unitPriceInput: normalizedUnitPrice === 0 ? '0' : normalizedUnitPrice.toFixed(2),
                category: item.category || 'Other',
                bbox: item.bbox ?? null,
            };
        });
        setEditableItems(normalizedItems);
    }, [data, extractedItems, hasManualItemEdits]);

    useEffect(() => {
        if (showOcrLoading || firstResultsRenderedRef.current) return;
        firstResultsRenderedRef.current = true;
        console.log('[timing] receipt UI first render of results', {
            receipt_id: receiptId,
            ms_since_page_open: Date.now() - pageLoadStartedAtRef.current,
            rendered_at_ms: Date.now(),
        });
    }, [showOcrLoading, receiptId]);

    const loadingHeading = waitingForResult ? "Extracting your receipt…" : "Loading receipt…";
    const loadingSubheading = waitingForResult
        ? "Waiting for extraction updates. This page will update automatically."
        : "Fetching receipt data and preparing the review screen.";

    const loadingScreen = (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500",
                "bg-background/70 backdrop-blur-sm",
                showOcrLoading ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={!showLoadingLayer}
        >
            <div className="w-full max-w-xl">
                <div className="card-elevated p-6 animate-slide-up">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-semibold tracking-tight">{loadingHeading}</h2>
                            <p className="text-sm text-foreground-muted mt-1">{loadingSubheading}</p>
                        </div>
                        <div className="text-[11px] text-foreground-muted whitespace-nowrap">
                            {data?.status ? `Status: ${data.status}` : "Status: starting"}
                        </div>
                    </div>

                    <Stepper active={waitingForResult || loading ? 2 : 3} />

                    {receiptDisplaySrc ? (
                        <div className="mt-4 rounded-lg border border-border bg-background-secondary p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={receiptDisplaySrc}
                                alt="Receipt preview"
                                className="w-full max-h-64 object-contain rounded-md bg-background"
                            />
                        </div>
                    ) : null}

                    <div className="mt-5">
                        <DogLoadingAnimation size="md" showMessage={false} className="opacity-90" />
                        <div className="mt-3 flex items-center justify-between text-[11px] text-foreground-muted">
                            <span className="animate-pulse-soft">Working…</span>
                            <span>Keep this tab open</span>
                        </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-border bg-background-secondary p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                            Preparing items
                        </div>
                        <div className="mt-3 space-y-2">
                            <SkeletonLine className="w-2/3" />
                            <SkeletonLine className="w-5/6" />
                            <SkeletonLine className="w-3/5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (error) {
        return (
            <PageTransition>
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Receipt Review</h1>
                        <p className="text-foreground-muted text-sm mt-1">Something went wrong loading this receipt.</p>
                    </div>
                    <GlassCard className="p-5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                            <div>
                                <div className="text-sm font-semibold">Error</div>
                                <div className="text-sm text-foreground-muted mt-1">{error}</div>
                                <div className="mt-4 flex gap-2">
                                    <GlassButton variant="secondary" onClick={() => router.back()}>
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </GlassButton>
                                    <GlassButton variant="primary" onClick={() => window.location.reload()}>
                                        Reload
                                    </GlassButton>
                                </div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </PageTransition>
        );
    }

    if (!data) {
        if (showLoadingLayer) return loadingScreen;
        return (
            <PageTransition>
                <div className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Receipt Review</h1>
                        <p className="text-foreground-muted text-sm mt-1">No receipt data found.</p>
                    </div>
                    <GlassButton variant="secondary" onClick={() => router.push("/receipts")}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to Receipts
                    </GlassButton>
                </div>
            </PageTransition>
        );
    }

    const extractedBreakdown = data.receipt_extractions?.[0]?.extracted_json?.amount_breakdown || null;
    const persistedBreakdown = data.receipt_amount_breakdowns?.[0] || null;
    const breakdown = {
        subtotal: persistedBreakdown?.subtotal ?? extractedBreakdown?.subtotal ?? extractions?.subtotal?.value ?? null,
        tax: persistedBreakdown?.tax ?? extractedBreakdown?.tax ?? extractions?.tax?.value ?? null,
        discount: persistedBreakdown?.discount ?? extractedBreakdown?.discount ?? null,
        tip: persistedBreakdown?.tip ?? extractedBreakdown?.tip ?? null,
        fees: persistedBreakdown?.fees ?? extractedBreakdown?.fees ?? null,
    };
    const rawText = data.receipt_extractions?.[0]?.extracted_json?.raw_text || '';

    const extractedTotal = Number(corrections?.total ?? extractions?.total?.value ?? data.total_amount ?? 0);
    const items = editableItems;
    const itemSubtotal = items.reduce((sum: number, item: EditableItem) => {
        return sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0));
    }, 0);
    const lineSubtotal = itemSubtotal;
    const lineTax = breakdown.tax ?? 0;
    const lineDiscount = breakdown.discount ?? 0;
    const lineTip = breakdown.tip ?? 0;
    const lineFees = breakdown.fees ?? 0;
    const computedFinalTotal = lineSubtotal + lineTax + lineTip + lineFees - lineDiscount;
    const hasExplicitFinalTotal =
        corrections?.total !== undefined
        || extractions?.total?.value !== undefined
        || data.total_amount !== undefined;
    const finalTotalValue = hasManualItemEdits ? computedFinalTotal : (hasExplicitFinalTotal ? extractedTotal : computedFinalTotal);
    const merchantName = (corrections?.merchant ?? extractions?.merchant?.value ?? 'Unknown Merchant').toString().trim();
    let addressLinesForDisplay: string[] = [];
    const extractedAddressValue = (corrections?.address ?? extractions?.address?.value ?? '').toString().trim();
    if (extractedAddressValue) {
        const addressLines = extractedAddressValue.split('\n').map((line: string) => line.trim()).filter(Boolean);
        if (addressLines.length) {
            const first = addressLines[0];
            const rest = addressLines.slice(1).join(', ');
            addressLinesForDisplay = rest ? [first, rest] : [first];
        }
    } else {
        const rawLines = rawText.split('\n').map((line: string) => line.trim()).filter(Boolean);
        const merchantLower = merchantName.toLowerCase();
        const addressStartIndex = rawLines.findIndex((line: string) => {
            const lower = line.toLowerCase();
            if (!line || lower === merchantLower || lower.includes(merchantLower)) return false;
            const hasNumber = /\d/.test(line);
            const hasStreetToken = /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|hwy|highway|pl|place|ct|court|suite|ste|unit)\b/i.test(line);
            const looksLikePoBox = /\bp\.?\s*o\.?\s*box\b/i.test(line);
            return (hasNumber && hasStreetToken) || looksLikePoBox;
        });
        if (addressStartIndex >= 0) {
            const addressLines: string[] = [];
            for (let i = addressStartIndex; i < rawLines.length && addressLines.length < 3; i += 1) {
                let line = rawLines[i];
                const lower = line.toLowerCase();
                if (!line || lower.includes(merchantLower)) continue;
                if (/(tel|phone|fax|www\.|http|receipt|invoice|order|subtotal|total|tax|cashier|server|date)/i.test(line)) break;
                if (/\b(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(line)) continue;
                // Skip common OCR divider/separator lines.
                if (/^[-_=*#.\s]{6,}$/.test(line) || /-{6,}/.test(line)) continue;
                // Trim trailing punctuation that OCR often appends.
                line = line.replace(/[ ,;]*[-_]{4,}\s*$/g, '').replace(/[,;]+$/g, '').trim();
                addressLines.push(line);
                if (/\b[A-Z]{2}\b.*\b\d{5}(?:-\d{4})?\b/.test(line) || /\b\d{5}(?:-\d{4})?\b/.test(line)) break;
            }
            if (addressLines.length) {
                const first = addressLines[0];
                const rest = addressLines.slice(1).join(', ');
                addressLinesForDisplay = rest ? [first, rest] : [first];
            }
        }
    }

    const money = (value: number | null | undefined) => `$${Number(value || 0).toFixed(2)}`;

    const sanitizeMoneyInput = (raw: string) => {
        let cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
        const dotIndex = cleaned.indexOf('.');
        if (dotIndex !== -1) {
            const before = cleaned.slice(0, dotIndex + 1);
            const after = cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
            cleaned = before + after;
        }
        return cleaned;
    };

    const parseMoneyInputOrZero = (raw: string) => {
        if (!raw) return 0;
        const value = Number(raw);
        if (!Number.isFinite(value)) return 0;
        return value;
    };

    const updateItem = (index: number, patch: Partial<EditableItem>) => {
        setHasManualItemEdits(true);
        setConfirmError(null);
        setEditableItems((prev) => prev.map((entry, i) => (
            i === index ? { ...entry, ...patch } : entry
        )));
        setLineFlashKeys((prev) => ({ ...prev, [index]: (prev[index] ?? 0) + 1 }));
    };

    const removeItem = (index: number) => {
        setHasManualItemEdits(true);
        setConfirmError(null);
        setEditableItems((prev) => prev.filter((_, i) => i !== index));
        setActiveItemEdit(null);
        setHoveredItemIndex(null);
    };

    const addItem = () => {
        setHasManualItemEdits(true);
        setConfirmError(null);
        setEditableItems((prev) => {
            const newIndex = prev.length;
            const nextLineIndex = (prev.reduce((m, it) => Math.max(m, Number(it?.lineIndex ?? -1)), -1) + 1) || 0;
            const next: EditableItem = {
                lineIndex: nextLineIndex,
                name: "New item",
                quantity: 1,
                unitPrice: 0,
                unitPriceInput: "0.00",
                category: "Other",
                bbox: null,
            };
            // Select the new row immediately.
            setActiveItemEdit(newIndex);
            return [...prev, next];
        });
        setHoveredItemIndex(null);
    };

    const debugMode =
        typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('debug');

    const bboxTransform = (() => {
        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
        const transformPoint = (x: number, y: number, mode: BboxTransformMode) => {
            switch (mode) {
                case 'flipY':
                    return { x, y: 1 - y };
                case 'rotate180':
                    return { x: 1 - x, y: 1 - y };
                case 'rotate90cw':
                    // (x,y) -> (1-y, x)
                    return { x: 1 - y, y: x };
                case 'rotate90ccw':
                    // (x,y) -> (y, 1-x)
                    return { x: y, y: 1 - x };
                case 'none':
                default:
                    return { x, y };
            }
        };

        const transformBbox = (bbox: [number, number, number, number], mode: BboxTransformMode): [number, number, number, number] | null => {
            const [x0, y0, x1, y1] = bbox;
            const corners = [
                transformPoint(x0, y0, mode),
                transformPoint(x1, y0, mode),
                transformPoint(x1, y1, mode),
                transformPoint(x0, y1, mode),
            ];
            const xs = corners.map((p) => p.x);
            const ys = corners.map((p) => p.y);
            const nx0 = clamp01(Math.min(...xs));
            const ny0 = clamp01(Math.min(...ys));
            const nx1 = clamp01(Math.max(...xs));
            const ny1 = clamp01(Math.max(...ys));
            if (nx0 >= nx1 || ny0 >= ny1) return null;
            return [nx0, ny0, nx1, ny1];
        };

        const corrForMode = (mode: BboxTransformMode) => {
            const pts: Array<{ idx: number; y: number }> = [];
            for (let i = 0; i < (editableItems?.length ?? 0); i += 1) {
                const bboxAny = editableItems?.[i]?.bbox ?? null;
                if (!Array.isArray(bboxAny) || bboxAny.length !== 4) continue;
                const raw = bboxAny.map((n) => Number(n));
                if (!raw.every((n) => Number.isFinite(n))) continue;
                const tb = transformBbox(raw as [number, number, number, number], mode);
                if (!tb) continue;
                pts.push({ idx: i, y: (tb[1] + tb[3]) / 2 });
            }
            if (pts.length < 4) return -Infinity;

            const meanX = pts.reduce((s, p) => s + p.idx, 0) / pts.length;
            const meanY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            let num = 0;
            let denX = 0;
            let denY = 0;
            for (const p of pts) {
                const dx = p.idx - meanX;
                const dy = p.y - meanY;
                num += dx * dy;
                denX += dx * dx;
                denY += dy * dy;
            }
            const denom = Math.sqrt(denX * denY);
            if (!Number.isFinite(denom) || denom === 0) return -Infinity;
            return num / denom;
        };

        const modes: BboxTransformMode[] = ['none', 'flipY', 'rotate180', 'rotate90cw', 'rotate90ccw'];
        let best: BboxTransformMode = 'none';
        let bestCorr = -Infinity;
        for (const m of modes) {
            const c = corrForMode(m);
            if (c > bestCorr) {
                bestCorr = c;
                best = m;
            }
        }

        return { mode: best, transformBbox };
    })();

    const activeBbox: [number, number, number, number] | null = (() => {
        const bboxIndex = hoveredItemIndex ?? activeItemEdit;
        if (bboxIndex == null) return null;
        const bbox = editableItems?.[bboxIndex]?.bbox ?? null;
        if (!Array.isArray(bbox) || bbox.length !== 4) return null;
        const [x0, y0, x1, y1] = bbox.map((n) => Number(n));
        if (![x0, y0, x1, y1].every((n) => Number.isFinite(n))) return null;
        if (x0 < 0 || y0 < 0 || x1 > 1 || y1 > 1) return null;
        if (x0 >= x1 || y0 >= y1) return null;
        const modeUsed: BboxTransformMode = bboxModeOverride === 'auto' ? bboxTransform.mode : bboxModeOverride;
        const transformed = bboxTransform.transformBbox([x0, y0, x1, y1], modeUsed);
        return transformed ?? [x0, y0, x1, y1];
    })();

    const activeBboxPadded: [number, number, number, number] | null = (() => {
        if (!activeBbox) return null;
        const [x0, y0, x1, y1] = activeBbox;
        // Slightly increase vertical padding so the highlight feels less "tight" than OCR.
        const padY = 0.01;
        const ny0 = Math.max(0, y0 - padY);
        const ny1 = Math.min(1, y1 + padY);
        if (ny0 >= ny1) return activeBbox;
        return [x0, ny0, x1, ny1];
    })();

    return (
        <PageTransition>
            {/* Layout contract: keep everything within the viewport, no page-level scroll.
               Scroll is allowed only inside the Items list. */}
            <div className="flex flex-col min-h-0 h-[calc(100svh-170px)] md:h-[calc(100svh-120px)]">
                <div className="shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                            <GlassButton variant="secondary" size="sm" onClick={() => router.back()}>
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </GlassButton>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
                    <div className="flex flex-col min-h-0 gap-4">
                        <GlassCard className="p-4 shrink-0" delay={0}>
                            <div className="flex items-stretch justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="text-[11px] text-foreground-muted uppercase tracking-wide">
                                        Receipt Review
                                    </div>
                                    <div className="mt-1 text-base font-semibold leading-tight break-words">
                                        {merchantName}
                                    </div>
                                    {addressLinesForDisplay.length > 0 ? (
                                        <div className="mt-1 text-[12px] text-foreground-muted leading-snug break-words">
                                            {addressLinesForDisplay.map((line, idx) => (
                                                <div key={`${line}-${idx}`}>{line}</div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex items-stretch gap-2 shrink-0">
                                    <div className="min-w-[110px] rounded-lg border border-border bg-background-secondary px-3 py-2 flex flex-col justify-between">
                                        <div className="text-[10px] text-foreground-muted uppercase tracking-wide">Items</div>
                                        <div className="text-xl font-semibold leading-tight tabular-nums">
                                            <AnimatedNumber valueKey={items.length}>{items.length}</AnimatedNumber>
                                        </div>
                                    </div>
                                    <div className="min-w-[140px] rounded-lg border border-border bg-background-secondary px-3 py-2 flex flex-col justify-between">
                                        <div className="text-[10px] text-foreground-muted uppercase tracking-wide">Grand Total</div>
                                        <div className="text-xl font-semibold leading-tight tabular-nums">
                                            <AnimatedNumber valueKey={Math.round(Number(finalTotalValue || 0) * 100)}>
                                                {money(finalTotalValue)}
                                            </AnimatedNumber>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Fill remaining column height so the LHS bottom aligns with the RHS bottom. */}
                        <GlassCard className="p-4 overflow-hidden flex flex-col min-h-0 flex-1" delay={80}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold">Receipt</div>
                                <div className="text-[11px] text-foreground-muted">
                                    Zoom: {Math.round(zoom * 100)}%{isPanning ? " (panning)" : ""}
                                </div>
                            </div>

                            <div
                                ref={receiptStageRef}
                                className={cn(
                                    "relative mt-3 rounded-lg border border-border bg-background-secondary",
                                    // Fill remaining column height; keeps LHS/RHS aligned vertically.
                                    "flex-1 min-h-0 overflow-hidden flex items-center justify-center",
                                    isPanning ? "cursor-grabbing" : "cursor-grab"
                                )}
                                onPointerDown={(e) => {
                                    if (e.button !== 0) return;
                                    const target = e.target as HTMLElement | null;
                                    if (target?.closest?.("[data-zoom-controls]")) return;
                                    const stage = receiptStageRef.current;
                                    if (!stage) return;
                                    e.preventDefault();
                                    stage.setPointerCapture?.(e.pointerId);
                                    setIsPanning(true);
                                    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
                                }}
                                onPointerMove={(e) => {
                                    if (!panStartRef.current) return;
                                    const start = panStartRef.current;
                                    e.preventDefault();
                                    const next = {
                                        x: start.panX + (e.clientX - start.x),
                                        y: start.panY + (e.clientY - start.y),
                                    };
                                    setPan(clampPan(next, zoom));
                                }}
                                onPointerUp={(e) => {
                                    if (!panStartRef.current) return;
                                    const stage = receiptStageRef.current;
                                    e.preventDefault();
                                    stage?.releasePointerCapture?.(e.pointerId);
                                    setIsPanning(false);
                                    panStartRef.current = null;
                                }}
                                onPointerCancel={() => {
                                    setIsPanning(false);
                                    panStartRef.current = null;
                                }}
                            >
                                <div
                                    data-zoom-controls
                                    className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-2 py-1.5 shadow-sm"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onPointerMove={(e) => e.stopPropagation()}
                                    onPointerUp={(e) => e.stopPropagation()}
                                    onWheel={(e) => e.stopPropagation()}
                                >
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setZoomClamped(zoom - 0.2)}
                                        aria-label="Zoom out"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </GlassButton>
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setZoomClamped(zoom + 0.2)}
                                        aria-label="Zoom in"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </GlassButton>
                                    <GlassButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setZoom(1);
                                            setPan({ x: 0, y: 0 });
                                        }}
                                        aria-label="Reset zoom"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Reset
                                    </GlassButton>
                                    <GlassButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={openCropper}
                                        aria-label="Adjust crop"
                                        title={hasAnyItemBbox ? "Cropping may disable highlights" : "Adjust crop"}
                                    >
                                        <Crop className="w-4 h-4" />
                                        Crop
                                    </GlassButton>
                                </div>

                                <div className="absolute inset-0 pointer-events-none">
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background:
                                                "radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.07), transparent 55%), radial-gradient(ellipse at 30% 80%, rgba(24,24,27,0.06), transparent 55%)",
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            backgroundImage:
                                                "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
                                            backgroundSize: "36px 36px",
                                            maskImage: "radial-gradient(circle at center, black 42%, transparent 78%)",
                                            opacity: 0.35,
                                        }}
                                    />
                                </div>

                                <div
                                    ref={receiptWrapRef}
                                    className="relative"
                                    style={{
                                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                                        transformOrigin: "center center",
                                        willChange: "transform",
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    ref={receiptImgRef}
                                    src={receiptDisplaySrc}
                                    alt="Receipt"
                                    className="block max-w-[min(96%,980px)] max-h-full rounded-xl border border-border bg-card shadow-lg select-none"
                                    draggable={false}
                                    onLoad={() => {
                                        const img = receiptImgRef.current;
                                        if (!img) return;
                                        const rect = img.getBoundingClientRect();
                                            if (rect.width > 0 && rect.height > 0) {
                                                baseReceiptSizeRef.current = { w: rect.width / zoom, h: rect.height / zoom };
                                            }
                                        }}
                                    />
                                    <AnimatePresence>
                                        {activeBboxPadded && !disableBboxOverlay && (
                                            <motion.div
                                                key="bbox"
                                                className="pointer-events-none absolute rounded-xl ring-2 ring-accent/70 bg-accent/10"
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: 1,
                                                    left: `${activeBboxPadded[0] * 100}%`,
                                                    top: `${activeBboxPadded[1] * 100}%`,
                                                    width: `${(activeBboxPadded[2] - activeBboxPadded[0]) * 100}%`,
                                                    height: `${(activeBboxPadded[3] - activeBboxPadded[1]) * 100}%`,
                                                }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    <div className="flex flex-col min-h-0 gap-4">
                        {showFailureNotice && (
                            <GlassCard className="p-4 border border-destructive/30 bg-destructive-soft">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                                    <div>
                                        <div className="text-sm font-semibold text-destructive">Extraction failed</div>
                                        <div className="text-sm text-foreground-muted mt-1">
                                            OCR failed for this upload. Try re-uploading a clearer photo.
                                        </div>
                                        <div className="mt-3">
                                            <GlassButton variant="secondary" onClick={() => router.push("/receipts")}>
                                                Back to Receipts
                                            </GlassButton>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* Fixed-height scroll region for items so the page doesn't grow indefinitely */}
                        {/* Fill remaining column height; list inside scrolls. */}
                        <GlassCard className="p-5 flex flex-col min-h-0 flex-1" delay={80}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold">Items</div>
                                    <div className="flex items-center gap-2">
                                        <GlassButton variant="secondary" size="sm" onClick={addItem}>
                                            <Plus className="w-4 h-4" />
                                            Add Item
                                        </GlassButton>
                                    </div>
                                </div>

                            <div className="mt-3 flex-1 min-h-0 overflow-y-auto px-1 pb-2">
                                <div className="space-y-2">
                                    {items.length ? (
                                        items.map((item, index) => {
                                            const lineSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                                            const isEditing = activeItemEdit === index;
                                            const lineFlashKey = lineFlashKeys[index] ?? 0;

                                            return (
                                                <motion.div
                                                    key={`item-${item.lineIndex}-${index}`}
                                                    className={cn(
                                                        "rounded-lg border border-border bg-card p-3 cursor-pointer",
                                                        "transition-colors hover:bg-secondary/40",
                                                        // Use inset ring so it doesn't get clipped by the scroll container overflow.
                                                        isEditing && "ring-1 ring-inset ring-accent border-accent/40",
                                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
                                                    )}
                                                    onClick={() => setActiveItemEdit((prev) => (prev === index ? null : index))}
                                                    onMouseEnter={() => setHoveredItemIndex(index)}
                                                    onMouseLeave={() => setHoveredItemIndex(null)}
                                                    onFocus={() => setHoveredItemIndex(index)}
                                                    onBlur={(e) => {
                                                        const next = e.relatedTarget as Node | null;
                                                        if (next && e.currentTarget.contains(next)) return;
                                                        setHoveredItemIndex(null);
                                                    }}
                                                    tabIndex={0}
                                                    role="button"
                                                    // Avoid translate-on-hover here; the list lives in an overflow container
                                                    // and subtle lifts can get clipped at the edges.
                                                    whileHover={{}}
                                                    whileTap={{ scale: 0.99 }}
                                                    transition={{ duration: 0.15 }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="text-sm font-semibold truncate">
                                                                    {item.name || `Item ${index + 1}`}
                                                                </div>
                                                                <ChevronDown
                                                                    className={cn(
                                                                        "h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-200",
                                                                        isEditing && "rotate-180"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-foreground-muted">
                                                                <span>Qty {item.quantity}</span>
                                                                <span>Unit {money(item.unitPrice)}</span>
                                                                <span>{item.category || "Other"}</span>
                                                            </div>
                                                        </div>
                                                        <div
                                                            key={`line-subtotal-${index}-${lineFlashKey}`}
                                                            className={cn(
                                                                "text-sm font-semibold whitespace-nowrap",
                                                                lineFlashKey > 0 && "animate-pulse-soft"
                                                            )}
                                                        >
                                                            {money(lineSubtotal)}
                                                        </div>
                                                    </div>

                                                    <AnimatePresence initial={false}>
                                                        {isEditing && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                                                                // Height animation needs overflow clipping; add a small padding
                                                                // so focus outlines/rings don't get cut off at the edges.
                                                                className="overflow-hidden px-1 pb-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <label className="grid gap-1">
                                                                        <span className="text-[11px] text-foreground-muted">Name</span>
                                                                        <input
                                                                            className="input-elegant px-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:outline-offset-0"
                                                                            type="text"
                                                                            value={item.name}
                                                                            onChange={(e) => updateItem(index, { name: e.target.value })}
                                                                        />
                                                                    </label>
                                                                    <label className="grid gap-1">
                                                                        <span className="text-[11px] text-foreground-muted">Qty</span>
                                                                        <input
                                                                            className="input-elegant px-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:outline-offset-0"
                                                                            type="number"
                                                                            min="0"
                                                                            step="1"
                                                                            value={item.quantity}
                                                                            onChange={(e) => updateItem(index, { quantity: Number(e.target.value || 0) })}
                                                                        />
                                                                    </label>
                                                                    <label className="grid gap-1">
                                                                        <span className="text-[11px] text-foreground-muted">Unit Price</span>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">
                                                                                $
                                                                            </span>
                                                                            <input
                                                                                className="input-elegant w-full pl-7 pr-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:outline-offset-0"
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                placeholder="0.00"
                                                                                value={item.unitPriceInput}
                                                                                onChange={(e) => {
                                                                                    const next = sanitizeMoneyInput(e.target.value);
                                                                                    updateItem(index, {
                                                                                        unitPriceInput: next,
                                                                                        unitPrice: parseMoneyInputOrZero(next),
                                                                                    });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </label>
                                                                    <label className="grid gap-1">
                                                                        <span className="text-[11px] text-foreground-muted">Category</span>
                                                                        <select
                                                                            className="input-elegant px-3 py-2 text-sm outline-none focus:outline-none focus-visible:outline-none focus-visible:outline-offset-0"
                                                                            value={item.category}
                                                                            onChange={(e) => updateItem(index, { category: e.target.value })}
                                                                        >
                                                                            {CATEGORY_OPTIONS.map((option) => (
                                                                                <option key={option} value={option}>
                                                                                    {option}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </label>
                                                                    <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
                                                                        <GlassButton
                                                                            variant="danger"
                                                                            size="sm"
                                                                            onClick={() => removeItem(index)}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                            Remove Item
                                                                        </GlassButton>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground-muted">
                                            No items found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5 shrink-0" delay={140}>
                            <div className="text-sm font-semibold">Total</div>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Subtotal</span>
                                    <span className="font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={Math.round(Number(lineSubtotal || 0) * 100)}>
                                            {money(lineSubtotal)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Tax</span>
                                    <span className="font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={`tax-${Math.round(Number(lineTax || 0) * 100)}`}>
                                            + {money(lineTax)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Tip</span>
                                    <span className="font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={`tip-${Math.round(Number(lineTip || 0) * 100)}`}>
                                            + {money(lineTip)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Fees</span>
                                    <span className="font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={`fees-${Math.round(Number(lineFees || 0) * 100)}`}>
                                            + {money(lineFees)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-foreground-muted">Discount</span>
                                    <span className="font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={`disc-${Math.round(Number(lineDiscount || 0) * 100)}`}>
                                            - {money(lineDiscount)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                                <div className="h-px bg-border my-2" />
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">Grand Total</span>
                                    <span className="text-sm font-semibold tabular-nums">
                                        <AnimatedNumber valueKey={`grand-${Math.round(Number(finalTotalValue || 0) * 100)}`}>
                                            {money(finalTotalValue)}
                                        </AnimatedNumber>
                                    </span>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-5 shrink-0" delay={200}>
                            {confirmError ? (
                                <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
                                    {confirmError}
                                </div>
                            ) : null}

                            <GlassButton
                                variant="primary"
                                size="lg"
                                className="w-full"
                                onClick={handleConfirm}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirm
                                    </>
                                )}
                            </GlassButton>

                            <div className="mt-2 text-[11px] text-foreground-muted">
                                This will save the receipt and create transactions based on your item categories.
                            </div>
                        </GlassCard>

                        {debugMode && (
                            <GlassCard className="p-5">
                                <div className="text-sm font-semibold">Debug</div>
                                <div className="mt-3 flex items-center gap-2">
                                    <GlassButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={async () => {
                                            if (!receiptId) return;
                                            const imageUrl = data?.image_original_path;
                                            if (!imageUrl) {
                                                setDebugRerunStatus("Missing image_original_path on receipt");
                                                return;
                                            }
                                            setDebugRerunStatus("Re-running extraction...");
                                            try {
                                                const res = await fetch("/api/receipts/extract", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ receipt_id: receiptId, image_url: imageUrl }),
                                                });
                                                const json = await res.json().catch(() => ({}));
                                                if (!res.ok) throw new Error(json?.error || `extract failed (${res.status})`);
                                                setDebugRerunStatus("Extraction finished. Waiting for live updates...");
                                            } catch (e: unknown) {
                                                setDebugRerunStatus(`Extraction failed: ${getErrorMessage(e, "unknown error")}`);
                                            }
                                        }}
                                    >
                                        Re-run Extraction
                                    </GlassButton>
                                    {debugRerunStatus ? (
                                        <span className="text-[11px] text-foreground-muted">{debugRerunStatus}</span>
                                    ) : null}
                                </div>

                                <details className="mt-3">
                                    <summary className="text-sm cursor-pointer">Show raw extraction + items</summary>
                                    <div className="mt-3 grid gap-2">
                                        <label className="grid gap-1">
                                            <span className="text-[11px] text-foreground-muted">
                                                BBox Transform (auto={bboxTransform.mode})
                                            </span>
                                            <select
                                                className="input-elegant px-3 py-2 text-sm"
                                                value={bboxModeOverride}
                                                onChange={(e) => setBboxModeOverride(parseBboxModeOverride(e.target.value))}
                                            >
                                                <option value="auto">auto</option>
                                                <option value="none">none</option>
                                                <option value="flipY">flipY</option>
                                                <option value="rotate180">rotate180</option>
                                                <option value="rotate90cw">rotate90cw</option>
                                                <option value="rotate90ccw">rotate90ccw</option>
                                            </select>
                                        </label>
                                        <div className="text-[11px] text-foreground-muted">Active bbox: {JSON.stringify(activeBbox)}</div>
                                    </div>
                                    <pre className="mt-3 whitespace-pre-wrap text-[12px] leading-[1.35] text-foreground-muted">
                                        {JSON.stringify(
                                            {
                                                receipt_id: data.id,
                                                status: data.status,
                                                merchant: extractions?.merchant?.value ?? null,
                                                extracted_items: extraction?.items ?? null,
                                                persisted_items: data.receipt_items ?? null,
                                                raw_text: rawText,
                                            },
                                            null,
                                            2
                                        )}
                                    </pre>
                                </details>
                            </GlassCard>
                        )}
                    </div>
                </div>

                {showLoadingLayer && loadingScreen}

                {/* Manual crop modal */}
                <AnimatePresence>
                    {cropOpen && cropPreviewUrl && cropQuad && (
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
                                                Drag the corners to fit the receipt. Press Escape to close.
                                                {hasAnyItemBbox ? " Cropping will disable item highlights." : ""}
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
                                            const el = cropViewportRef.current;
                                            if (!el) return;
                                            const rect = el.getBoundingClientRect();
                                            const nx = clamp01((e.clientX - rect.left) / rect.width);
                                            const ny = clamp01((e.clientY - rect.top) / rect.height);
                                            setCropQuad((prev) => {
                                                if (!prev) return prev;
                                                const pts = prev.map((p, idx) => (idx === cropDragIndex ? { x: nx, y: ny } : p));
                                                return orderNormalizedQuad(pts);
                                            });
                                        }}
                                        onPointerUp={() => setCropDragIndex(null)}
                                        onPointerCancel={() => setCropDragIndex(null)}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={cropPreviewUrl}
                                            alt="Crop preview"
                                            className="absolute inset-0 w-full h-full object-contain select-none"
                                            draggable={false}
                                        />

                                        {/* Overlay quad */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                            <polygon
                                                points={cropQuad.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                                                fill="rgba(99,102,241,0.10)"
                                                stroke="rgba(99,102,241,0.9)"
                                                strokeWidth="0.4"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        </svg>

                                        {cropQuad.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={cn(
                                                    "absolute -translate-x-1/2 -translate-y-1/2",
                                                    "h-4 w-4 rounded-full bg-background border border-border shadow-sm",
                                                    "ring-2 ring-accent/60"
                                                )}
                                                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                                                onPointerDown={(e) => {
                                                    e.preventDefault();
                                                    (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
                                                    setCropDragIndex(idx);
                                                }}
                                                aria-label={`Corner ${idx + 1}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-4 flex items-center justify-end gap-2">
                                        <GlassButton variant="secondary" onClick={() => setCropOpen(false)} disabled={cropBusy}>
                                            Cancel
                                        </GlassButton>
                                        <GlassButton variant="primary" onClick={applyCrop} disabled={cropBusy}>
                                            {cropBusy ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Applying…
                                                </>
                                            ) : (
                                                "Apply Crop"
                                            )}
                                        </GlassButton>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {showConfirmSuccess && confirmSuccessSummary && (
                    <div
                        className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Receipt confirmed"
                        onClick={() => {
                            setShowConfirmSuccess(false);
                            router.push("/receipts");
                        }}
                    >
                        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl">
                            <div className="card-elevated p-6 animate-slide-up">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-success-soft border border-success/30 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-success" />
                                    </div>
                                    <div>
                                        <div className="text-base font-semibold tracking-tight">Receipt Saved</div>
                                        <div className="text-sm text-foreground-muted mt-1">
                                            Added to your graph.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-border bg-background-secondary p-3">
                                        <div className="text-[11px] text-foreground-muted uppercase tracking-wide">Merchant</div>
                                        <div className="text-sm font-semibold mt-1 truncate">{confirmSuccessSummary.merchant}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background-secondary p-3">
                                        <div className="text-[11px] text-foreground-muted uppercase tracking-wide">Items</div>
                                        <div className="text-sm font-semibold mt-1">{confirmSuccessSummary.items}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background-secondary p-3">
                                        <div className="text-[11px] text-foreground-muted uppercase tracking-wide">Total</div>
                                        <div className="text-sm font-semibold mt-1">{money(confirmSuccessSummary.total)}</div>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background-secondary p-3">
                                        <div className="text-[11px] text-foreground-muted uppercase tracking-wide">Date</div>
                                        <div className="text-sm font-semibold mt-1">{confirmSuccessSummary.date || "Unknown"}</div>
                                    </div>
                                </div>

                                {confirmSuccessSummary.categoryTotals.length > 0 && (
                                    <div className="mt-5">
                                        <div className="flex items-center justify-between text-[11px] text-foreground-muted uppercase tracking-wide">
                                            <span>Category totals</span>
                                            <span className="normal-case tracking-normal">Added to your graph</span>
                                        </div>
                                        <div className="mt-2 rounded-lg border border-border bg-background-secondary divide-y divide-border overflow-hidden">
                                            {confirmSuccessSummary.categoryTotals.slice(0, 6).map((row) => (
                                                <div key={row.category} className="flex items-center justify-between px-3 py-2 text-sm">
                                                    <span className="text-foreground-muted">{row.category}</span>
                                                    <span className="font-semibold">{money(row.total)}</span>
                                                </div>
                                            ))}
                                            {confirmSuccessSummary.categoryTotals.length > 6 && (
                                                <div className="px-3 py-2 text-[12px] text-foreground-muted">
                                                    + {confirmSuccessSummary.categoryTotals.length - 6} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <GlassButton variant="primary" size="lg" onClick={() => router.push("/receipts")}>
                                        Back to Receipts
                                    </GlassButton>
                                    <GlassButton variant="secondary" size="lg" onClick={() => setShowConfirmSuccess(false)}>
                                        Keep Reviewing
                                    </GlassButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
