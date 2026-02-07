'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import styles from './MobileReceiptBridge.module.css';

type SessionResponse = {
    sessionId: string;
    status: 'waiting' | 'uploading' | 'processed' | 'error';
    receiptId: string | null;
    error: string | null;
};

export default function MobileReceiptBridge() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'waiting' | 'uploading' | 'processed' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const createSession = useCallback(async () => {
        try {
            setStatus('idle');
            setError(null);
            const res = await fetch('/api/mobile/sessions', { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error ?? 'Could not create mobile session');
            setSessionId(data.sessionId);
            setStatus('waiting');
        } catch (e: any) {
            setStatus('error');
            setError(e?.message ?? 'Could not create mobile session');
        }
    }, []);

    useEffect(() => {
        createSession();
    }, [createSession]);

    const mobileLink = useMemo(() => {
        if (!sessionId || !origin) return '';
        return `${origin}/mobile/receipt-upload?session=${sessionId}`;
    }, [origin, sessionId]);

    const qrSrc = useMemo(() => {
        if (!mobileLink) return '';
        // 3rd-party QR generator (fine for dev).
        return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(mobileLink)}`;
    }, [mobileLink]);

    useEffect(() => {
        if (!sessionId || status === 'processed' || status === 'error') return;

        const interval = window.setInterval(async () => {
            try {
                const res = await fetch(`/api/mobile/sessions/${sessionId}`);
                const data = (await res.json()) as SessionResponse | { error?: string | null };
                if (!res.ok) throw new Error(('error' in data ? data.error : null) ?? 'Session polling failed');

                const sessionData = data as SessionResponse;
                setStatus(sessionData.status);

                if (sessionData.status === 'processed' && sessionData.receiptId) {
                    window.location.href = `/receipts/review/${sessionData.receiptId}`;
                }
                if (sessionData.status === 'error') setError(sessionData.error ?? 'Mobile upload failed');
            } catch (e: any) {
                setStatus('error');
                setError(e?.message ?? 'Session polling failed');
            }
        }, 2000);

        return () => window.clearInterval(interval);
    }, [sessionId, status]);

    const copy = async () => {
        try {
            if (!mobileLink) return;
            await navigator.clipboard.writeText(mobileLink);
        } catch {
            // ignore
        }
    };

    return (
        <GlassCard className={styles.card}>
            <div className={styles.inner}>
                <div className={styles.qr}>
                    {qrSrc ? (
                        <img src={qrSrc} alt="Mobile upload QR code" className={styles.qrImg} />
                    ) : (
                        <div className={styles.placeholder}>Generating QR...</div>
                    )}
                </div>

                <div className={styles.actions}>
                    <GlassButton
                        variant="secondary"
                        size="lg"
                        onClick={() => {
                            if (!mobileLink) return;
                            window.open(mobileLink, '_blank', 'noopener,noreferrer');
                        }}
                        disabled={!mobileLink}
                    >
                        Open Link
                    </GlassButton>
                    <GlassButton variant="secondary" size="lg" onClick={copy} disabled={!mobileLink}>
                        Copy Link
                    </GlassButton>
                    <GlassButton variant="ghost" size="lg" onClick={createSession}>
                        New QR
                    </GlassButton>
                </div>

                {error && <div className={styles.error}>{error}</div>}
            </div>
        </GlassCard>
    );
}
