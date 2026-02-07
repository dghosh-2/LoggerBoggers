'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Text, ThemeIcon } from '@mantine/core';
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { supabase } from '@repo/core';
import { ShadButton } from '@/components/ui/shadcn-button';
import { ShadCard, ShadCardContent, ShadCardDescription, ShadCardHeader, ShadCardTitle } from '@/components/ui/shadcn-card';
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from '@/lib/storage';
import { preprocessReceiptImage } from '@/lib/imagePreprocess';
import {
    detectReceiptCorners,
    flattenReceiptFromCorners,
    NormalizedQuad,
} from '@/lib/receiptAutoCrop';
import styles from './ReceiptUpload.module.css';

const scanTokens = ['TOTAL', 'SUBTOTAL', 'DATE', 'MERCHANT', 'TAX', 'ITEM', 'AMOUNT', 'CATEGORY'];

const DEFAULT_CORNERS: NormalizedQuad = [
    { x: 0.12, y: 0.08 },
    { x: 0.88, y: 0.08 },
    { x: 0.88, y: 0.92 },
    { x: 0.12, y: 0.92 },
];

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

type OverlayRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export default function ReceiptUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [corners, setCorners] = useState<NormalizedQuad | null>(null);
    const [activeHandle, setActiveHandle] = useState<number | null>(null);
    const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);

    const frameRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    useEffect(() => {
        if (!preview) {
            setOverlayRect(null);
            return;
        }

        const updateRect = () => {
            if (!frameRef.current || !imageRef.current) return;
            const frame = frameRef.current.getBoundingClientRect();
            const img = imageRef.current.getBoundingClientRect();
            if (!img.width || !img.height) return;
            setOverlayRect({
                left: img.left - frame.left,
                top: img.top - frame.top,
                width: img.width,
                height: img.height,
            });
        };

        updateRect();

        const observer = new ResizeObserver(() => updateRect());
        if (frameRef.current) observer.observe(frameRef.current);
        if (imageRef.current) observer.observe(imageRef.current);

        window.addEventListener('resize', updateRect);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateRect);
        };
    }, [preview]);

    useEffect(() => {
        if (activeHandle === null) return;

        const move = (event: PointerEvent) => {
            if (!overlayRect || !corners || !frameRef.current) return;
            const frame = frameRef.current.getBoundingClientRect();
            const x = (event.clientX - frame.left - overlayRect.left) / overlayRect.width;
            const y = (event.clientY - frame.top - overlayRect.top) / overlayRect.height;

            setCorners((prev) => {
                if (!prev) return prev;
                const next = [...prev] as NormalizedQuad;
                next[activeHandle] = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
                return next;
            });
        };

        const end = () => setActiveHandle(null);

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
        };
    }, [activeHandle, overlayRect, corners]);

    const resetSelection = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        setError(null);
        setCorners(null);
        setActiveHandle(null);
        setOverlayRect(null);
    };

    const runCornerDetection = async (selected: File) => {
        const detected = await detectReceiptCorners(selected);
        if (detected) {
            setCorners(detected);
            return;
        }
        setCorners(DEFAULT_CORNERS);
    };

    const handleDrop = async (files: FileWithPath[]) => {
        const selected = files[0];
        if (!selected) return;

        setPreparing(true);
        setError(null);
        setActiveHandle(null);

        if (preview) URL.revokeObjectURL(preview);
        setFile(selected);
        setPreview(URL.createObjectURL(selected));

        try {
            await runCornerDetection(selected);
        } catch (err: any) {
            setCorners(DEFAULT_CORNERS);
            setError(err?.message ?? 'Could not detect corners automatically.');
        } finally {
            setPreparing(false);
        }
    };

    const handleRedetect = async () => {
        if (!file) return;
        setPreparing(true);
        setError(null);
        try {
            await runCornerDetection(file);
        } catch (err: any) {
            setError(err?.message ?? 'Corner re-detection failed.');
        } finally {
            setPreparing(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        const timings: Record<string, number> = {};

        try {
            const preprocessStart = performance.now();
            timings.preprocess_start = Date.now();
            let fileForUpload = file;
            if (corners) {
                const flattened = await flattenReceiptFromCorners(file, corners);
                if (flattened) {
                    fileForUpload = flattened;
                } else {
                    // Keep going with the original image.
                }
            }

            const optimized = await preprocessReceiptImage(fileForUpload, {
                maxLongEdge: 2000,
                initialQuality: 0.8,
                maxBytes: 3.5 * 1024 * 1024,
            });
            fileForUpload = optimized.file;
            timings.preprocess_end = Date.now();
            console.log('[timing] receipt preprocess', {
                ms: Math.round(performance.now() - preprocessStart),
                outputBytes: fileForUpload.size,
                outputDimensions: `${optimized.width}x${optimized.height}`,
                quality: optimized.quality,
            });

            const fileName = buildSafeReceiptObjectKey(fileForUpload.name);
            const uploadStart = performance.now();
            timings.upload_start = Date.now();
            const { error: uploadError } = await supabase.storage
                .from(RECEIPTS_BUCKET)
                .upload(fileName, fileForUpload);

            if (uploadError) throw uploadError;
            timings.upload_end = Date.now();
            console.log('[timing] receipt storage upload', { ms: Math.round(performance.now() - uploadStart) });

            const {
                data: { publicUrl },
            } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(fileName);

            const createStart = performance.now();
            const res = await fetch('/api/receipts/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: publicUrl, client_timings: timings }),
            });

            const { receipt_id, error: apiError } = await res.json();
            if (apiError) throw new Error(apiError);
            console.log('[timing] receipt row/create API', {
                ms: Math.round(performance.now() - createStart),
                receipt_id,
            });

            window.location.href = `/imports/receipt/${receipt_id}`;
        } catch (err: any) {
            console.error('Scan failed:', err);
            setError(formatStorageError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.root}>
            {!preview ? (
                <ShadCard>
                    <ShadCardHeader>
                        <ShadCardTitle>Upload Receipt Image</ShadCardTitle>
                        <ShadCardDescription>Auto-detects corners, lets you fine-tune, then flattens on scan.</ShadCardDescription>
                    </ShadCardHeader>
                    <ShadCardContent>
                        <Dropzone
                            onDrop={handleDrop}
                            onReject={() => {
                                setError('Only image files are supported.');
                            }}
                            maxFiles={1}
                            accept={IMAGE_MIME_TYPE}
                            className={styles.dropzone}
                        >
                            <div className={styles.dropzoneInner}>
                                <ThemeIcon radius="xl" size="lg" variant="light" color="green">IMG</ThemeIcon>
                                <div>
                                    <Text fw={700} size="sm">Drop receipt image here</Text>
                                    <Text c="dimmed" size="sm">or click to browse your files</Text>
                                </div>
                            </div>
                        </Dropzone>
                    </ShadCardContent>
                </ShadCard>
            ) : (
                <div className={styles.previewLayout}>
                    <ShadCard className={styles.previewCard}>
                        <ShadCardContent className={styles.previewContent}>
                            <div ref={frameRef} className={styles.previewFrame}>
                                <img ref={imageRef} src={preview} alt="Receipt preview" />

                                {corners && overlayRect && (
                                    <div
                                        className={styles.cornerOverlay}
                                        style={{
                                            left: `${overlayRect.left}px`,
                                            top: `${overlayRect.top}px`,
                                            width: `${overlayRect.width}px`,
                                            height: `${overlayRect.height}px`,
                                        }}
                                    >
                                        <svg
                                            className={styles.cornerSvg}
                                            viewBox="0 0 1000 1000"
                                            preserveAspectRatio="none"
                                            aria-hidden="true"
                                        >
                                            <polygon
                                                className={styles.cornerPolygon}
                                                points={corners.map((p) => `${p.x * 1000},${p.y * 1000}`).join(' ')}
                                            />
                                            <polyline
                                                className={styles.cornerLine}
                                                points={[
                                                    `${corners[0].x * 1000},${corners[0].y * 1000}`,
                                                    `${corners[1].x * 1000},${corners[1].y * 1000}`,
                                                    `${corners[2].x * 1000},${corners[2].y * 1000}`,
                                                    `${corners[3].x * 1000},${corners[3].y * 1000}`,
                                                    `${corners[0].x * 1000},${corners[0].y * 1000}`,
                                                ].join(' ')}
                                            />
                                        </svg>

                                        {corners.map((point, index) => (
                                            <button
                                                key={`corner-${index}`}
                                                type="button"
                                                className={styles.cornerHandle}
                                                style={{
                                                    left: `${point.x * 100}%`,
                                                    top: `${point.y * 100}%`,
                                                }}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    if (!loading && !preparing) setActiveHandle(index);
                                                }}
                                                disabled={loading || preparing}
                                                aria-label={`Adjust corner ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}

                                <AnimatePresence>
                                    {loading && (
                                        <motion.div
                                            className={styles.scanOverlay}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.22 }}
                                        >
                                            <motion.div
                                                className={styles.scanBeam}
                                                animate={{ y: ['-8%', '108%'] }}
                                                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                                            />
                                            <div className={styles.tokenCloud}>
                                                {scanTokens.map((token, index) => (
                                                    <motion.span
                                                        key={`${token}-${index}`}
                                                        className={styles.scanToken}
                                                        style={{ left: `${8 + (index % 4) * 22}%` }}
                                                        initial={{ opacity: 0, y: 16 }}
                                                        animate={{ opacity: [0, 1, 0.92, 0], y: [20, -18, -90, -130] }}
                                                        transition={{
                                                            duration: 1.35,
                                                            repeat: Infinity,
                                                            ease: 'easeInOut',
                                                            delay: index * 0.1,
                                                        }}
                                                    >
                                                        {token}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </ShadCardContent>
                    </ShadCard>

                    <ShadCard>
                        <ShadCardContent className={styles.controls}>
                            <div className={styles.actions}>
                                <ShadButton
                                    onClick={handleUpload}
                                    size="lg"
                                    disabled={!file || preparing || loading}
                                >
                                    {preparing ? 'Matching Corners…' : loading ? 'Scanning…' : 'Flatten + Scan'}
                                </ShadButton>
                                <ShadButton
                                    onClick={handleRedetect}
                                    variant="outline"
                                    size="lg"
                                    disabled={!file || preparing || loading}
                                >
                                    Re-Detect Corners
                                </ShadButton>
                                <ShadButton
                                    onClick={resetSelection}
                                    variant="outline"
                                    size="lg"
                                    disabled={preparing || loading}
                                >
                                    Choose Different Image
                                </ShadButton>
                            </div>

                            {error && <p className={styles.error}>{error}</p>}
                        </ShadCardContent>
                    </ShadCard>
                </div>
            )}
        </div>
    );
}
