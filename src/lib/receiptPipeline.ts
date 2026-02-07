import { supabase } from '@repo/core';

export async function createReceiptAndTriggerOcr(imageUrl: string) {
    const dbStart = Date.now();
    const { data: receipt, error: dbError } = await supabase
        .from('receipts')
        .insert({
            image_original_path: imageUrl,
            status: 'pending',
            source: 'upload',
        })
        .select()
        .single();

    if (dbError) {
        throw dbError;
    }
    console.log('[timing] receipt row created', {
        receipt_id: receipt.id,
        created_at_ms: Date.now(),
        db_insert_ms: Date.now() - dbStart,
    });

    console.log('[timing] ocr invoke queued', { receipt_id: receipt.id, queued_at_ms: Date.now() });
    // The actual OCR/extraction is triggered separately (server route) so local dev does not depend on edge functions.

    return receipt.id as string;
}
