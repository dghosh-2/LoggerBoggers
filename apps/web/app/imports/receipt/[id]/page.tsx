'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@repo/core';
import { autoCropReceiptFile } from '@/lib/receiptAutoCrop';
import styles from './page.module.css';

interface BBox {
    value: any;
    bbox: [number, number, number, number];
    confidence: number;
}

interface ReceiptState {
    id: string;
    image_original_path: string;
    status: string;
    total_amount?: number | null;
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

const CATEGORY_OPTIONS = ['Groceries', 'Dining', 'Transport', 'Household', 'Health', 'Tech', 'Other'];

export default function ReceiptReviewPage() {
    const { id } = useParams();
    const receiptId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();

    const [data, setData] = useState<ReceiptState | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [isLiveUpdating, setIsLiveUpdating] = useState(false);
    const [corrections, setCorrections] = useState<any>({});
    const [loadingStage, setLoadingStage] = useState<'active' | 'exiting' | 'hidden'>('active');
    const [displayImagePath, setDisplayImagePath] = useState<string | null>(null);
    const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
    const [hasManualItemEdits, setHasManualItemEdits] = useState(false);
    const [activeItemEdit, setActiveItemEdit] = useState<number | null>(null);
    const [hoveredItemIndex, setHoveredItemIndex] = useState<number | null>(null);
    const [bboxModeOverride, setBboxModeOverride] = useState<'auto' | 'none' | 'flipY' | 'rotate180' | 'rotate90cw' | 'rotate90ccw'>('auto');
    const [totalsFlashKey, setTotalsFlashKey] = useState(0);
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
    const totalsSnapshotRef = useRef<{
        itemSubtotal: number;
        lineTax: number;
        lineDiscount: number;
        lineTip: number;
        lineFees: number;
        finalTotalValue: number;
    } | null>(null);

    const receiptStageRef = useRef<HTMLDivElement | null>(null);
    const receiptWrapRef = useRef<HTMLDivElement | null>(null);
    const receiptImgRef = useRef<HTMLImageElement | null>(null);
    const baseReceiptSizeRef = useRef<{ w: number; h: number } | null>(null);
    const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

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
            stage.removeEventListener('wheel', onWheel as any);
        };
    }, [clampPan, displayImagePath, data?.image_original_path, loading]);

    const fetchReceiptData = useCallback(async () => {
        if (!receiptId) return;

        try {
            const res = await fetch(`/api/receipts/${receiptId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
            setError(null);

            const ext = json.receipt_extractions?.[0]?.extracted_json?.extractions;
            if (ext) {
                setCorrections((prev: any) => {
                    if (Object.keys(prev || {}).length > 0) return prev;
                    return {
                        merchant: ext.merchant?.value,
                        date: ext.date?.value,
                        total: ext.total?.value,
                        subtotal: ext.subtotal?.value,
                        tax: ext.tax?.value,
                    };
                });
            }
        } catch (err: any) {
            setError(err.message);
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
        setTotalsFlashKey(0);
        setLineFlashKeys({});
        fetchReceiptData();
    }, [receiptId, fetchReceiptData]);

    const hasAnyItemBbox = useMemo(() => {
        const persisted = (data?.receipt_items ?? []).some((it) => Array.isArray(it?.bbox) && it.bbox.length === 4);
        const extracted = (data?.receipt_extractions?.[0]?.extracted_json?.items ?? []).some((it: any) => Array.isArray(it?.bbox) && it.bbox.length === 4);
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
                setIsLiveUpdating(status === 'SUBSCRIBED');
                // Close race where OCR finishes between initial fetch and channel readiness.
                if (status === 'SUBSCRIBED') {
                    fetchReceiptData();
                }
            });

        return () => {
            supabase.removeChannel(channel);
            setIsLiveUpdating(false);
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
            const res = await fetch(`/api/receipts/${receiptId}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ corrected_json: corrections }),
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
            setSubmitting(false);

            // Stay on the success popup until the user chooses an action.
        } catch (err: any) {
            setError(err.message);
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
    const extractedItems = useMemo(() => {
        if (!data) return [];
        return data.receipt_items?.length
            ? data.receipt_items.map((item) => ({
                lineIndex: item.line_index,
                name: item.item_name,
                price: Number(item.item_amount || 0),
                quantity: item.quantity != null ? Number(item.quantity) : null,
                unitPrice: item.unit_price != null ? Number(item.unit_price) : null,
                category: item.item_category,
                bbox: item.bbox ?? null,
            }))
            : (data.receipt_extractions?.[0]?.extracted_json?.items || []).map((item: any, index: number) => ({
                lineIndex: index,
                name: item.name,
                price: Number(item.price || 0),
                quantity: item.quantity != null ? Number(item.quantity) : null,
                unitPrice: item.unit_price != null
                    ? Number(item.unit_price)
                    : (item.unitPrice != null ? Number(item.unitPrice) : null),
                category: item.category_prediction ?? null,
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

        const normalizedItems: EditableItem[] = extractedItems.map((item: any, index: number) => {
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

    useEffect(() => {
        if (!data) return;

        const extractedBreakdown = data.receipt_extractions?.[0]?.extracted_json?.amount_breakdown || null;
        const persistedBreakdown = data.receipt_amount_breakdowns?.[0] || null;
        const tax = Number(persistedBreakdown?.tax ?? extractedBreakdown?.tax ?? extractions?.tax?.value ?? 0);
        const discount = Number(persistedBreakdown?.discount ?? extractedBreakdown?.discount ?? 0);
        const tip = Number(persistedBreakdown?.tip ?? extractedBreakdown?.tip ?? 0);
        const fees = Number(persistedBreakdown?.fees ?? extractedBreakdown?.fees ?? 0);
        const subtotal = editableItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
        const computedFinal = subtotal + tax + tip + fees - discount;
        const extractedTotal = Number(corrections?.total ?? extractions?.total?.value ?? data.total_amount ?? 0);
        const hasExplicitFinalTotal =
            corrections?.total !== undefined
            || extractions?.total?.value !== undefined
            || data.total_amount !== undefined;
        const finalTotal = hasManualItemEdits ? computedFinal : (hasExplicitFinalTotal ? extractedTotal : computedFinal);

        const snapshot = {
            itemSubtotal: subtotal,
            lineTax: tax,
            lineDiscount: discount,
            lineTip: tip,
            lineFees: fees,
            finalTotalValue: finalTotal,
        };

        if (!totalsSnapshotRef.current) {
            totalsSnapshotRef.current = snapshot;
            return;
        }

        const prev = totalsSnapshotRef.current;
        const changed = (
            prev.itemSubtotal !== snapshot.itemSubtotal
            || prev.lineTax !== snapshot.lineTax
            || prev.lineDiscount !== snapshot.lineDiscount
            || prev.lineTip !== snapshot.lineTip
            || prev.lineFees !== snapshot.lineFees
            || prev.finalTotalValue !== snapshot.finalTotalValue
        );

        if (changed && hasManualItemEdits) {
            setTotalsFlashKey((k) => k + 1);
        }

        totalsSnapshotRef.current = snapshot;
    }, [data, editableItems, hasManualItemEdits, corrections, extractions]);

    const loadingScreen = (
        <div
            className={`${styles.loadingLayer} ${showOcrLoading ? styles.loadingLayerActive : styles.loadingLayerExit}`}
            aria-hidden={!showLoadingLayer}
        >
            <div className={styles.loading}>
                <div className={styles.loadingShell}>
                    <div className={styles.gridBackdrop} aria-hidden="true" />
                    <div className={styles.receiptScanner}>
                        <div className={styles.receiptPaper}>
                            {data?.image_original_path ? (
                                <img
                                    src={receiptDisplaySrc}
                                    alt="Receipt being scanned"
                                    className={styles.scanReceiptImage}
                                />
                            ) : (
                                <div className={styles.receiptPaperMock}>
                                    <div className={styles.receiptMetaRow}>
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                    <div className={styles.receiptLine} />
                                    <div className={styles.receiptLine} />
                                    <div className={styles.receiptLine} />
                                    <div className={styles.receiptLine} />
                                    <div className={styles.receiptLine} />
                                    <div className={styles.receiptLineShort} />
                                </div>
                            )}
                            <div className={styles.scanBeam} />
                            <div className={styles.scanGlow} />
                            <div className={styles.scanFrame} />
                        </div>
                    </div>
                    <div className={styles.loadingText}>
                        <h2>Scanning receipt for OCR summary</h2>
                        <p>Parsing lines, totals, and structured fields. This updates automatically when extraction is ready.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (error) return <div className={styles.error}>Error: {error}</div>;
    if (!data) {
        if (showLoadingLayer) return loadingScreen;
        return <div>No data found.</div>;
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
    const ocrSummary = data.receipt_extractions?.[0]?.extracted_json?.summary || '';
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

    const debugMode =
        typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('debug');

    const bboxTransform = (() => {
        type Mode = 'none' | 'flipY' | 'rotate180' | 'rotate90cw' | 'rotate90ccw';

        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
        const transformPoint = (x: number, y: number, mode: Mode) => {
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

        const transformBbox = (bbox: [number, number, number, number], mode: Mode): [number, number, number, number] | null => {
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

        const corrForMode = (mode: Mode) => {
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

        const modes: Mode[] = ['none', 'flipY', 'rotate180', 'rotate90cw', 'rotate90ccw'];
        let best: Mode = 'none';
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
        const modeUsed = bboxModeOverride === 'auto' ? bboxTransform.mode : bboxModeOverride;
        const transformed = bboxTransform.transformBbox([x0, y0, x1, y1], modeUsed as any);
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
        <div className={styles.transitionRoot}>
            <div className={`${styles.summaryRoot} ${showOcrLoading ? styles.summaryRootEntering : styles.summaryRootVisible}`}>
                <div className={styles.container}>
                    <header className={styles.header}>
                        <button onClick={() => router.back()} className={styles.backBtn}>Back</button>
                        <h1>Receipt Review</h1>
                        <div className={styles.statusBadge} data-status={data.status}>{data.status}</div>
                    </header>

                    <div className={styles.mainLayout}>
                        <div className={styles.imageContainer}>
                            <div className={styles.receiptStage}>
                                <div
                                    ref={receiptStageRef}
                                    className={styles.receiptViewport}
                                    onPointerDown={(e) => {
                                        if (e.button !== 0) return;
                                        const target = e.target as HTMLElement | null;
                                        // Allow interactions with the zoom controls without starting a pan.
                                        if (target?.closest?.(`.${styles.zoomControls}`)) return;
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
                                        if (!start) return;
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
                                        className={styles.zoomControls}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onPointerMove={(e) => e.stopPropagation()}
                                        onPointerUp={(e) => e.stopPropagation()}
                                        onWheel={(e) => e.stopPropagation()}
                                    >
                                        <button type="button" onClick={() => setZoomClamped(zoom - 0.2)} aria-label="Zoom out">-</button>
                                        <button type="button" onClick={() => setZoomClamped(zoom + 0.2)} aria-label="Zoom in">+</button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setZoom(1);
                                                setPan({ x: 0, y: 0 });
                                            }}
                                            aria-label="Reset zoom"
                                        >
                                            Reset
                                        </button>
                                        <span className={styles.zoomReadout}>{Math.round(zoom * 100)}%</span>
                                    </div>

                                    <div
                                        ref={receiptWrapRef}
                                        className={styles.receiptImageWrap}
                                        style={{
                                            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                                        }}
                                    >
                                        <img
                                            ref={receiptImgRef}
                                            src={receiptDisplaySrc}
                                            alt="Receipt"
                                            className={styles.receiptImage}
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
                                        {activeBboxPadded && (
                                            <div
                                                className={styles.itemBboxOverlay}
                                                style={{
                                                    left: `${activeBboxPadded[0] * 100}%`,
                                                    top: `${activeBboxPadded[1] * 100}%`,
                                                    width: `${(activeBboxPadded[2] - activeBboxPadded[0]) * 100}%`,
                                                    height: `${(activeBboxPadded[3] - activeBboxPadded[1]) * 100}%`,
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside className={styles.sidePanel}>
                            {showFailureNotice && (
                                <div className={styles.failureNotice}>
                                    OCR failed for this upload. Please re-upload the receipt photo.
                                </div>
                            )}
                            <section className={`${styles.section} ${styles.panelTop}`}>
                                <div className={styles.purchaseHero}>
                                    <div className={styles.purchaseTitleCard}>
                                        <h4>{merchantName}</h4>
                                        {addressLinesForDisplay.length > 0 && (
                                            <p>
                                                {addressLinesForDisplay.map((line, idx) => (
                                                    <span key={`${line}-${idx}`}>
                                                        {line}
                                                        {idx < addressLinesForDisplay.length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                    </div>
                                    <div className={styles.heroSplitStats}>
                                        <div className={styles.heroStatBlock}>
                                            <span>Items</span>
                                            <strong>{items.length}</strong>
                                        </div>
                                        <div className={styles.heroStatBlock}>
                                            <span>Grand Total</span>
                                            <strong
                                                key={`hero-grand-total-${totalsFlashKey}`}
                                                className={totalsFlashKey > 0 ? styles.valueFlash : ''}
                                            >
                                                {money(finalTotalValue)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className={styles.section}>
                                <h3>Items</h3>
                                <div className={styles.fieldList}>
                                    {items.length ? (
                                        items.map((item: EditableItem, index: number) => {
                                            const lineSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                                            const isEditing = activeItemEdit === index;
                                            const lineFlashKey = lineFlashKeys[index] ?? 0;
                                            return (
                                                <div
                                                    key={`item-${item.lineIndex}-${index}`}
                                                    className={`${styles.fieldItem} ${isEditing ? styles.fieldItemActive : ''}`}
                                                    onClick={() => setActiveItemEdit(index)}
                                                    onMouseEnter={() => setHoveredItemIndex(index)}
                                                    onMouseLeave={() => setHoveredItemIndex(null)}
                                                    onFocus={() => setHoveredItemIndex(index)}
                                                    onBlur={(e) => {
                                                        // Don't clear hover highlight when focus moves between inputs inside the row.
                                                        const next = e.relatedTarget as Node | null;
                                                        if (next && e.currentTarget.contains(next)) return;
                                                        setHoveredItemIndex(null);
                                                    }}
                                                >
                                                    <div className={styles.fieldLabel}>
                                                        <label>{item.name || `Item ${index + 1}`}</label>
                                                        <span
                                                            key={`line-subtotal-${index}-${lineFlashKey}`}
                                                            className={`${styles.confidence} ${lineFlashKey > 0 ? styles.valueFlash : ''}`}
                                                        >
                                                            {money(lineSubtotal)}
                                                        </span>
                                                    </div>
                                                    <div className={styles.itemInlineMeta}>
                                                        <span>{`Qty ${item.quantity}`}</span>
                                                        <span>{`Unit ${money(item.unitPrice)}`}</span>
                                                        <span>{item.category || 'Other'}</span>
                                                    </div>

                                                    <div
                                                        className={`${styles.itemEditorPanel} ${isEditing ? styles.itemEditorPanelOpen : ''}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className={styles.itemEditorGrid}>
                                                            <label className={styles.editorField}>
                                                                <span>Name</span>
                                                                <input
                                                                    type="text"
                                                                    value={item.name}
                                                                    onChange={(e) => updateItem(index, { name: e.target.value })}
                                                                />
                                                            </label>
                                                            <label className={styles.editorField}>
                                                                <span>Qty</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value || 0) })}
                                                                />
                                                            </label>
                                                            <label className={styles.editorField}>
                                                                <span>Unit Price</span>
                                                                <div className={styles.moneyInputWrap}>
                                                                    <span className={styles.moneyPrefix} aria-hidden="true">$</span>
                                                                    <input
                                                                        className={styles.moneyInput}
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
                                                            <label className={styles.editorField}>
                                                                <span>Category</span>
                                                                <select
                                                                    value={item.category}
                                                                    onChange={(e) => updateItem(index, { category: e.target.value })}
                                                                >
                                                                    {CATEGORY_OPTIONS.map((option) => (
                                                                        <option key={option} value={option}>{option}</option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={styles.doneEditBtn}
                                                            onClick={() => setActiveItemEdit(null)}
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={styles.fieldItem}>
                                            <div className={styles.fieldLabel}>
                                                <label>NO ITEMS FOUND</label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <h3>Total Calculation</h3>
                                <div className={styles.metricList}>
                                    <div className={styles.metricRow}><span>Subtotal</span><strong key={`calc-subtotal-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>{money(lineSubtotal)}</strong></div>
                                    <div className={styles.metricRow}><span>Tax</span><strong key={`calc-tax-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>+ {money(lineTax)}</strong></div>
                                    <div className={styles.metricRow}><span>Tip</span><strong key={`calc-tip-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>+ {money(lineTip)}</strong></div>
                                    <div className={styles.metricRow}><span>Fees</span><strong key={`calc-fees-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>+ {money(lineFees)}</strong></div>
                                    <div className={styles.metricRow}><span>Discount</span><strong key={`calc-discount-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>- {money(lineDiscount)}</strong></div>
                                    <div className={styles.metricDivider} />
                                    <div className={`${styles.metricRow} ${styles.metricRowFinal}`}>
                                        <span>Grand Total</span>
                                        <strong key={`calc-grand-${totalsFlashKey}`} className={totalsFlashKey > 0 ? styles.valueFlash : ''}>{money(finalTotalValue)}</strong>
                                    </div>
                                </div>
                            </section>

                            <footer className={styles.footer}>
                                {confirmError && (
                                    <div className={styles.saveError} role="alert">
                                        {confirmError}
                                    </div>
                                )}
                                <button className={styles.confirmBtn} onClick={handleConfirm} disabled={submitting}>
                                    Confirm & Update Graph
                                </button>
                            </footer>

                            {debugMode && (
                                <section className={styles.section}>
                                    <h3>Debug</h3>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!receiptId) return;
                                                const imageUrl = data?.image_original_path;
                                                if (!imageUrl) {
                                                    setDebugRerunStatus('Missing image_original_path on receipt');
                                                    return;
                                                }
                                                setDebugRerunStatus('Re-running extraction...');
                                                try {
                                                    const res = await fetch('/api/receipts/extract', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ receipt_id: receiptId, image_url: imageUrl }),
                                                    });
                                                    const json = await res.json().catch(() => ({}));
                                                    if (!res.ok) throw new Error(json?.error || `extract failed (${res.status})`);
                                                    setDebugRerunStatus('Extraction finished. Waiting for live updates...');
                                                } catch (e: any) {
                                                    setDebugRerunStatus(`Extraction failed: ${e?.message || String(e)}`);
                                                }
                                            }}
                                            style={{
                                                padding: '0.45rem 0.7rem',
                                                borderRadius: 10,
                                                border: '1px solid #cfddce',
                                                background: '#f8fbf6',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Re-run Extraction
                                        </button>
                                        {debugRerunStatus && (
                                            <span style={{ fontSize: 12, color: '#556759' }}>{debugRerunStatus}</span>
                                        )}
                                    </div>
                                    <details>
                                        <summary>Show raw extraction + items</summary>
                                        <div style={{ margin: '0.6rem 0 0.8rem', display: 'grid', gap: 8 }}>
                                            <label style={{ display: 'grid', gap: 4 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#556759' }}>
                                                    BBox Transform (auto={bboxTransform.mode})
                                                </span>
                                                <select
                                                    value={bboxModeOverride}
                                                    onChange={(e) => setBboxModeOverride(e.target.value as any)}
                                                    style={{ padding: '0.4rem 0.5rem', borderRadius: 8, border: '1px solid #cfddce' }}
                                                >
                                                    <option value="auto">auto</option>
                                                    <option value="none">none</option>
                                                    <option value="flipY">flipY</option>
                                                    <option value="rotate180">rotate180</option>
                                                    <option value="rotate90cw">rotate90cw</option>
                                                    <option value="rotate90ccw">rotate90ccw</option>
                                                </select>
                                            </label>
                                            <div style={{ fontSize: 12, color: '#556759' }}>
                                                Active bbox: {JSON.stringify(activeBbox)}
                                            </div>
                                        </div>
                                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.35 }}>
                                            {JSON.stringify({
                                                receipt_id: data.id,
                                                status: data.status,
                                                merchant: extractions?.merchant?.value ?? null,
                                                extracted_items: extraction?.items ?? null,
                                                persisted_items: data.receipt_items ?? null,
                                                raw_text: rawText,
                                            }, null, 2)}
                                        </pre>
                                    </details>
                                </section>
                            )}
                        </aside>
                    </div>
                </div>
            </div>
            {showLoadingLayer && loadingScreen}

            {showConfirmSuccess && confirmSuccessSummary && (
                <div
                    className={styles.successBackdrop}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Receipt confirmed"
                    onClick={() => {
                        setShowConfirmSuccess(false);
                        router.push('/imports');
                    }}
                >
                    <div
                        className={styles.successCard}
                        onClick={(e) => e.stopPropagation()}
                    >
                            <div className={styles.successHeader}>
                                <div className={styles.successIcon} aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M20 7L10.5 16.5L4 10"
                                        stroke="currentColor"
                                        strokeWidth="2.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <div className={styles.successTitle}>Receipt Saved</div>
                                <div className={styles.successSubtitle}>Added to your graph. Returning to imports.</div>
                            </div>
                        </div>

                        <div className={styles.successGrid}>
                            <div className={styles.successStat}>
                                <span>Merchant</span>
                                <strong>{confirmSuccessSummary.merchant}</strong>
                            </div>
                            <div className={styles.successStat}>
                                <span>Items</span>
                                <strong>{confirmSuccessSummary.items}</strong>
                            </div>
                            <div className={styles.successStat}>
                                <span>Total</span>
                                <strong>{money(confirmSuccessSummary.total)}</strong>
                            </div>
                            <div className={styles.successStat}>
                                <span>Date</span>
                                <strong>{confirmSuccessSummary.date || 'Unknown'}</strong>
                            </div>
                        </div>

                        {confirmSuccessSummary.categoryTotals.length > 0 && (
                            <div className={styles.successCategoryBlock}>
                                <div className={styles.successCategoryHeader}>
                                    <span>Category totals</span>
                                    <span className={styles.successCategoryHint}>Added to your graph</span>
                                </div>
                                <div className={styles.successCategoryList}>
                                    {confirmSuccessSummary.categoryTotals.slice(0, 6).map((row) => (
                                        <div key={row.category} className={styles.successCategoryRow}>
                                            <span className={styles.successCategoryName}>{row.category}</span>
                                            <strong className={styles.successCategoryTotal}>{money(row.total)}</strong>
                                        </div>
                                    ))}
                                    {confirmSuccessSummary.categoryTotals.length > 6 && (
                                        <div className={styles.successCategoryMore}>
                                            + {confirmSuccessSummary.categoryTotals.length - 6} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={styles.successActions}>
                            <button
                                type="button"
                                className={styles.successPrimary}
                                onClick={() => router.push('/imports')}
                            >
                                Back to Imports
                            </button>
                            <button
                                type="button"
                                className={styles.successSecondary}
                                onClick={() => setShowConfirmSuccess(false)}
                            >
                                Keep Reviewing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
