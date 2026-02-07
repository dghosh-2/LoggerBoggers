import { NextResponse } from 'next/server';
import { supabase } from '@repo/core';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getUserIdFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Fetch receipt with full OCR/audit/normalized details
        const { data: receipt, error: rError } = await supabase
            .from('receipts')
            .select(`
        *,
        receipt_extractions (*),
        receipt_corrections (*),
        receipt_items (*),
        receipt_amount_breakdowns (*)
      `)
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (rError) throw rError;

        return NextResponse.json(receipt);

    } catch (error: any) {
        console.error('Get Receipt API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
