'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, QrCode, RefreshCw } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { toast } from "@/components/ui/toast";

type SessionResponse = {
    sessionId: string;
    status: 'waiting' | 'uploading' | 'processed' | 'error';
    receiptId: string | null;
    error: string | null;
};

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return fallback;
}

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
	        } catch (e: unknown) {
	            setStatus('error');
	            setError(getErrorMessage(e, 'Could not create mobile session'));
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
	            } catch (e: unknown) {
	                setStatus('error');
	                setError(getErrorMessage(e, 'Session polling failed'));
	            }
	        }, 2000);

        return () => window.clearInterval(interval);
    }, [sessionId, status]);

    const copy = async () => {
        try {
            if (!mobileLink) return;
            await navigator.clipboard.writeText(mobileLink);
            toast.success("Link copied");
        } catch {
            toast.error("Could not copy link");
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background-secondary p-3">
                <div className="flex items-center justify-center rounded-md border border-border bg-background p-3">
                    {qrSrc ? (
                        <img
                            src={qrSrc}
                            alt="Mobile upload QR code"
                            className="w-full max-w-[280px] aspect-square object-contain"
                        />
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-foreground-muted animate-pulse-soft">
                            <QrCode className="h-4 w-4" />
                            Generating QR...
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border border-border bg-background-secondary px-3 py-2">
                <div className="flex items-center gap-2 text-[11px] text-foreground-muted">
                    <Link2 className="h-3.5 w-3.5" />
                    <span className="truncate font-mono">{mobileLink || "Creating session..."}</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground-muted">
                    Status:{" "}
                    <span className="font-medium text-foreground">
                        {status === "idle" ? "starting" : status}
                    </span>
                </div>
            </div>

            <div className="grid gap-2">
                <GlassButton
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                        if (!mobileLink) return;
                        window.open(mobileLink, '_blank', 'noopener,noreferrer');
                    }}
                    disabled={!mobileLink}
                    className="w-full"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open Link
                </GlassButton>

                <GlassButton
                    variant="secondary"
                    size="lg"
                    onClick={copy}
                    disabled={!mobileLink}
                    className="w-full"
                >
                    Copy Link
                </GlassButton>

                <GlassButton variant="ghost" size="lg" onClick={createSession} className="w-full">
                    <RefreshCw className="h-4 w-4" />
                    New QR
                </GlassButton>
            </div>

            {error && <div className="text-xs font-medium text-destructive">{error}</div>}
        </div>
    );
}
