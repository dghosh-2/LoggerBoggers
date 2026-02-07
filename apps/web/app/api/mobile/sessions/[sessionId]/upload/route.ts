import { NextResponse } from 'next/server';
import { supabase } from '@repo/core';
import { createReceiptAndTriggerOcr } from '@/lib/receiptPipeline';
import { getMobileSession, updateMobileSession } from '@/lib/mobileReceiptSessions';
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from '@/lib/storage';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const session = getMobileSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    try {
        updateMobileSession(sessionId, { status: 'uploading', error: null });

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            throw new Error('No receipt image file was provided');
        }

        const fileName = buildSafeReceiptObjectKey(file.name);
        const { error: uploadError } = await supabase.storage.from(RECEIPTS_BUCKET).upload(fileName, file);

        if (uploadError) {
            throw uploadError;
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(fileName);

        const receiptId = await createReceiptAndTriggerOcr(publicUrl);

        // Fire-and-forget: run Dedalus OCR -> chat extraction and store results.
        // Use absolute URL derived from this request (works in local dev and deployments).
        fetch(new URL('/api/receipts/extract', req.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: publicUrl, receipt_id: receiptId }),
        }).catch(() => {});

        updateMobileSession(sessionId, {
            status: 'processed',
            receiptId,
            error: null,
        });

        return NextResponse.json({ success: true, receiptId });
    } catch (error: any) {
        const friendlyError = formatStorageError(error);
        updateMobileSession(sessionId, {
            status: 'error',
            error: friendlyError,
        });

        return NextResponse.json({ error: friendlyError }, { status: 500 });
    }
}
