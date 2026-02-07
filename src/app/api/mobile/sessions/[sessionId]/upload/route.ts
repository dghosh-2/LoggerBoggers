import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createReceiptAndTriggerOcr } from '@/lib/receiptPipeline';
import { getMobileSession, updateMobileSession } from '@/lib/mobileReceiptSessions';
import { RECEIPTS_BUCKET, buildSafeReceiptObjectKey, formatStorageError } from '@/lib/storage';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const session = await getMobileSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    try {
        if (session.status === 'processed' && session.receiptId) {
            return NextResponse.json({ success: true, receiptId: session.receiptId });
        }
        if (session.status === 'uploading') {
            return NextResponse.json({ error: 'Upload already in progress. Please wait.' }, { status: 409 });
        }

        await updateMobileSession(sessionId, { status: 'uploading', error: null });

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            throw new Error('No receipt image file was provided');
        }

        const fileName = buildSafeReceiptObjectKey(file.name);
        const { error: uploadError } = await supabaseAdmin.storage.from(RECEIPTS_BUCKET).upload(fileName, file);

        if (uploadError) {
            throw uploadError;
        }

        const {
            data: { publicUrl },
        } = supabaseAdmin.storage.from(RECEIPTS_BUCKET).getPublicUrl(fileName);

        const receiptId = await createReceiptAndTriggerOcr(publicUrl, session.userId);

        // Fire-and-forget: run Dedalus OCR -> chat extraction and store results.
        // Use absolute URL derived from this request (works in local dev and deployments).
        fetch(new URL('/api/receipts/extract', req.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: publicUrl, receipt_id: receiptId }),
        }).catch(() => {});

        await updateMobileSession(sessionId, {
            status: 'processed',
            receiptId,
            error: null,
        });

        return NextResponse.json({ success: true, receiptId });
    } catch (error: any) {
        const friendlyError = formatStorageError(error);
        await updateMobileSession(sessionId, {
            status: 'error',
            error: friendlyError,
        });

        return NextResponse.json({ error: friendlyError }, { status: 500 });
    }
}
