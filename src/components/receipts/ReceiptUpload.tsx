'use client';

import { useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { supabase } from '@repo/core';
import { preprocessReceiptImage } from '@/lib/imagePreprocess';
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from '@/lib/storage';
import styles from './ReceiptUpload.module.css';

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
        if (!f.type.startsWith('image/')) {
            setError('Please upload an image file.');
            return;
        }
        setSelectedFile(f);
    };

    const onScan = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            // Keep preprocessing minimal: resize/compress for faster OCR and upload.
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
            if (!publicUrl) throw new Error('Could not get public URL for uploaded receipt');

            const res = await fetch('/api/receipts/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: publicUrl }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);

            const receiptId = json?.receipt_id;
            if (!receiptId) throw new Error('Upload did not return a receipt_id');

            window.location.href = `/receipts/review/${receiptId}`;
        } catch (e: any) {
            setError(formatStorageError(e));
        } finally {
            setLoading(false);
        }
    };

    const reset = () => setSelectedFile(null);

    return (
        <GlassCard className="p-0 overflow-hidden">
            {!previewUrl ? (
                <div
                    className={[
                        styles.drop,
                        dragOver ? styles.dropActive : '',
                    ].join(' ')}
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
                        if (e.key === 'Enter' || e.key === ' ') onBrowse();
                    }}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className={styles.hiddenInput}
                        onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            if (f) onDrop(f);
                        }}
                    />
                    <div className={styles.dropInner}>
                        <div className={styles.dropTitle}>Drop receipt image</div>
                        <div className={styles.dropSub}>or click to browse</div>
                    </div>
                </div>
            ) : (
                <div className={styles.previewWrap}>
                    <div className={styles.previewFrame}>
                        <img src={previewUrl} alt="Receipt preview" className={styles.previewImg} />
                    </div>

                    <div className={styles.actionsRow}>
                        <div className={styles.actionsButtons}>
                            <GlassButton
                                variant="primary"
                                size="lg"
                                onClick={onScan}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? 'Scanning...' : 'Scan Receipt'}
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
                            <GlassButton
                                variant="ghost"
                                size="lg"
                                onClick={() => setSelectedFile(file)}
                                disabled
                                className="w-full"
                            >
                                Image Ready
                            </GlassButton>
                        </div>

                        {error && <div className={styles.error}>{error}</div>}
                    </div>
                </div>
            )}
        </GlassCard>
    );
}
