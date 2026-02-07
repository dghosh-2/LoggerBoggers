'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CopyButton } from '@mantine/core';
import { ShadButton } from '@/components/ui/shadcn-button';
import { ShadCard, ShadCardContent } from '@/components/ui/shadcn-card';
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
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Could not create mobile session');

            setSessionId(data.sessionId);
            setStatus('waiting');
            setError(null);
        } catch (err: any) {
            setStatus('error');
            setError(err.message ?? 'Could not create mobile session');
        }
    }, []);

    const mobileLink = useMemo(() => {
        if (!sessionId || !origin) return '';
        return `${origin}/mobile/receipt-upload?session=${sessionId}`;
    }, [origin, sessionId]);

    const qrSrc = useMemo(() => {
        if (!mobileLink) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(mobileLink)}`;
    }, [mobileLink]);

    useEffect(() => {
        createSession();
    }, [createSession]);

    useEffect(() => {
        if (!sessionId || status === 'processed' || status === 'error') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/mobile/sessions/${sessionId}`);
                const data = (await res.json()) as SessionResponse | { error?: string | null };

                if (!res.ok) {
                    const msg = 'error' in data ? data.error : null;
                    throw new Error(msg ?? 'Session polling failed');
                }

                const sessionData = data as SessionResponse;
                setStatus(sessionData.status);

                if (sessionData.status === 'processed' && sessionData.receiptId) {
                    window.location.href = `/imports/receipt/${sessionData.receiptId}`;
                }

                if (sessionData.status === 'error') {
                    setError(sessionData.error ?? 'Mobile upload failed');
                }
            } catch (err: any) {
                setStatus('error');
                setError(err.message ?? 'Session polling failed');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sessionId, status]);

    return (
        <ShadCard className={styles.card}>
            <ShadCardContent className={styles.simple}>
                <motion.div
                    className={styles.qrWrap}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22 }}
                >
                    {qrSrc ? (
                        <motion.img
                            src={qrSrc}
                            alt="Mobile upload QR code"
                            animate={status === 'waiting' || status === 'uploading' ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    ) : (
                        <div className={styles.placeholder}>Generating QR...</div>
                    )}
                </motion.div>

                <div className={styles.actions}>
                    <ShadButton
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            if (!mobileLink) return;
                            window.open(mobileLink, '_blank', 'noopener,noreferrer');
                        }}
                        disabled={!mobileLink}
                    >
                        Open Link
                    </ShadButton>

                    <CopyButton value={mobileLink || ''} timeout={1300}>
                        {({ copied, copy }) => (
                            <ShadButton size="sm" variant="outline" onClick={copy} disabled={!mobileLink}>
                                {copied ? 'Copied' : 'Copy Link'}
                            </ShadButton>
                        )}
                    </CopyButton>

                    <ShadButton
                        size="sm"
                        variant="outline"
                        onClick={() => createSession()}
                    >
                        New QR
                    </ShadButton>
                </div>

                {error && <p className={styles.error}>{error}</p>}
            </ShadCardContent>
        </ShadCard>
    );
}
