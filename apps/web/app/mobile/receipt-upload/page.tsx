'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { autoCropReceiptFile } from '@/lib/receiptAutoCrop';
import styles from './page.module.css';

export default function MobileReceiptUploadPage() {
    const params = useSearchParams();
    const sessionId = params.get('session');

    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState('Take a clear photo of your receipt and upload it.');

    const isReady = useMemo(() => Boolean(sessionId), [sessionId]);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!sessionId || !file) {
            return;
        }

        setStatus('uploading');
        setMessage('Auto-scanning receipt corners and uploading...');

        try {
            const { file: preparedFile } = await autoCropReceiptFile(file);
            const formData = new FormData();
            formData.append('file', preparedFile);

            const res = await fetch(`/api/mobile/sessions/${sessionId}/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error ?? 'Upload failed');
            }

            setStatus('done');
            setMessage('Upload complete. You can return to your computer.');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message ?? 'Upload failed');
        }
    }

    if (!isReady) {
        return (
            <main className={styles.container}>
                <h1>Invalid Upload Link</h1>
                <p>Open this page by scanning the QR code from the web app.</p>
            </main>
        );
    }

    return (
        <main className={styles.container}>
            <h1>Receipt Upload</h1>
            <p>{message}</p>

            <form className={styles.form} onSubmit={handleSubmit}>
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={status === 'uploading' || status === 'done'}
                    required
                />

                <button type="submit" disabled={!file || status === 'uploading' || status === 'done'}>
                    {status === 'uploading' ? 'Uploading...' : 'Upload Receipt'}
                </button>
            </form>
        </main>
    );
}
