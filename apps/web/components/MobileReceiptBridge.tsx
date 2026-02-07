'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge, CopyButton, Group, Progress, Text, ThemeIcon } from '@mantine/core';
import { ShadButton } from '@/components/ui/shadcn-button';
import { ShadCard, ShadCardContent, ShadCardDescription, ShadCardHeader, ShadCardTitle } from '@/components/ui/shadcn-card';
import styles from './MobileReceiptBridge.module.css';

type SessionResponse = {
    sessionId: string;
    status: 'waiting' | 'uploading' | 'processed' | 'error';
    receiptId: string | null;
    error: string | null;
};

const statusProgressMap: Record<'idle' | 'waiting' | 'uploading' | 'processed' | 'error', number> = {
    idle: 10,
    waiting: 42,
    uploading: 74,
    processed: 100,
    error: 100,
};

export default function MobileReceiptBridge() {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'waiting' | 'uploading' | 'processed' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
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
        let cancelled = false;

        async function createSession() {
            try {
                const res = await fetch('/api/mobile/sessions', { method: 'POST' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? 'Could not create mobile session');

                if (!cancelled) {
                    setSessionId(data.sessionId);
                    setStatus('waiting');
                    setError(null);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setStatus('error');
                    setError(err.message ?? 'Could not create mobile session');
                }
            }
        }

        createSession();

        return () => {
            cancelled = true;
        };
    }, []);

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
            <ShadCardHeader>
                <ShadCardTitle>Phone Capture Bridge</ShadCardTitle>
                <ShadCardDescription>Scan this QR with your phone camera and upload from mobile while this page waits.</ShadCardDescription>
            </ShadCardHeader>

            <ShadCardContent className={styles.layout}>
                <div className={styles.content}>
                    <Group justify="space-between" wrap="wrap">
                        <Group gap="xs">
                            <ThemeIcon radius="xl" variant="light" color="green">QR</ThemeIcon>
                            <Text fw={600} size="sm">Session status</Text>
                        </Group>
                        <Badge variant="light" color={status === 'error' ? 'red' : status === 'processed' ? 'green' : 'teal'}>
                            {status}
                        </Badge>
                    </Group>

                    <Progress
                        value={statusProgressMap[status]}
                        animated={status !== 'processed' && status !== 'error'}
                        color={status === 'error' ? 'red' : 'green'}
                        radius="xl"
                    />

                    {mobileLink && (
                        <div className={styles.linkWrap}>
                            <code>{mobileLink}</code>
                            <CopyButton value={mobileLink} timeout={1300}>
                                {({ copied, copy }) => (
                                    <ShadButton size="sm" variant="outline" onClick={copy}>
                                        {copied ? 'Copied' : 'Copy Link'}
                                    </ShadButton>
                                )}
                            </CopyButton>
                        </div>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                </div>

                <motion.div
                    className={styles.qrWrap}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28 }}
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
            </ShadCardContent>
        </ShadCard>
    );
}
