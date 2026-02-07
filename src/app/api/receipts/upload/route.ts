import { NextResponse } from 'next/server';
import { createReceiptAndTriggerOcr } from '@/lib/receiptPipeline';

export async function POST(req: Request) {
    try {
        const reqStart = Date.now();
        const { image_url, client_timings } = await req.json();

        if (!image_url) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        if (client_timings) {
            console.log('[timing] client upload timings', client_timings);
        }

        const receiptId = await createReceiptAndTriggerOcr(image_url);

        // Fire-and-forget: run Dedalus OCR -> chat extraction and store results.
        // Use absolute URL derived from this request (works in local dev and deployments).
        fetch(new URL('/api/receipts/extract', req.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url, receipt_id: receiptId }),
        }).catch(() => {});

        console.log('[timing] upload route finished', {
            receipt_id: receiptId,
            route_ms: Date.now() - reqStart,
            receipt_row_created_time: Date.now(),
        });
        return NextResponse.json({ receipt_id: receiptId });

    } catch (error: any) {
        console.error('Upload API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
