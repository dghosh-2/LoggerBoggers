import { NextResponse } from 'next/server';
import { supabase } from '@repo/core';
import { getUserIdFromRequest } from '@/lib/auth';

type CorrectedJson = {
    merchant?: unknown;
    date?: unknown;
    total?: unknown;
    subtotal?: unknown;
    tax?: unknown;
    [key: string]: unknown;
};

type IncomingItem = {
    name?: unknown;
    quantity?: unknown;
    unitPrice?: unknown;
    category?: unknown;
    bbox?: unknown;
};

type ReceiptItemInsertRow = {
    receipt_id: string;
    line_index: number;
    item_name: string;
    item_amount: number;
    quantity: number;
    unit_price: number;
    item_category: string | null;
    bbox: [number, number, number, number] | null;
};

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
}

function asNumberOrNull(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function asISODateStringOrNull(value: unknown): string | null {
    const s = asNonEmptyString(value);
    if (!s) return null;
    // Prefer "YYYY-MM-DD". Otherwise try to parse common formats (MVP).
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function bboxOrNull(value: unknown): [number, number, number, number] | null {
    if (!Array.isArray(value) || value.length !== 4) return null;
    const [x0, y0, x1, y1] = value.map((n) => Number(n));
    const bbox: [number, number, number, number] = [x0, y0, x1, y1];
    return bbox.every((n) => Number.isFinite(n)) ? bbox : null;
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = await getUserIdFromRequest(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Ensure the receipt belongs to this user (prevents cross-user confirms).
        const { data: owned, error: ownedError } = await supabase
            .from('receipts')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        if (ownedError || !owned) {
            return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
        }

        const body = (await req.json()) as { corrected_json?: CorrectedJson; items?: unknown };
        const corrected_json = body?.corrected_json ?? {};
        const corrected = (typeof corrected_json === 'object' && corrected_json !== null ? corrected_json : {}) as CorrectedJson;
        const items = body?.items;

        // 1. Store the corrections
        const { error: corError } = await supabase
            .from('receipt_corrections')
            .insert({
                receipt_id: id,
                corrected_json
            });

        if (corError) throw corError;

        // If client supplied item edits, persist them to receipt_items so the review matches.
        if (Array.isArray(items)) {
            // Best-effort replace: delete existing items then insert the updated set.
            await supabase.from('receipt_items').delete().eq('receipt_id', id);

            const rows: ReceiptItemInsertRow[] = (items as IncomingItem[])
                .map((it, idx) => {
                    const name = asNonEmptyString(it?.name) ?? `Item ${idx + 1}`;
                    const qty = asNumberOrNull(it?.quantity) ?? 1;
                    const unit = asNumberOrNull(it?.unitPrice) ?? 0;
                    const lineTotal = qty * unit;
                    const category = asNonEmptyString(it?.category);
                    const bbox = bboxOrNull(it?.bbox);

                    if (!Number.isFinite(qty) || qty <= 0) return null;
                    if (!Number.isFinite(unit) || unit < 0) return null;
                    if (!Number.isFinite(lineTotal) || lineTotal < 0) return null;

                    return {
                        receipt_id: id,
                        line_index: idx,
                        item_name: name,
                        item_amount: lineTotal,
                        quantity: qty,
                        unit_price: unit,
                        item_category: category,
                        bbox,
                    };
                })
                .filter((row): row is ReceiptItemInsertRow => Boolean(row));

            if (rows.length) {
                const { error: itemsError } = await supabase.from('receipt_items').insert(rows);
                if (itemsError) throw itemsError;
            }
        }

        // 2. Update receipt status + corrected core fields
        await supabase
            .from('receipts')
            .update({
                status: 'confirmed',
                merchant_name: asNonEmptyString(corrected.merchant),
                transaction_date: asNonEmptyString(corrected.date),
                total_amount: asNumberOrNull(corrected.total),
                subtotal_amount: asNumberOrNull(corrected.subtotal),
                tax_amount: asNumberOrNull(corrected.tax),
            })
            .eq('id', id)
            .eq('user_id', userId);

        // 3. Create Transaction
        const { data: category } = await supabase.from('categories').select('id').eq('name', 'Other').single();

        const { data: tx, error: txError } = await supabase.from('transactions').insert({
            user_id: userId,
            receipt_id: id,
            merchant_name: asNonEmptyString(corrected.merchant),
            amount: asNumberOrNull(corrected.total),
            transaction_date: asNonEmptyString(corrected.date),
            category_id: category?.id,
            notes: 'Confirmed via receipt scanning'
        }).select().single();

        if (txError) throw txError;

        // Also store into the canonical financial transactions table used by the dashboard/graph.
        // This is MVP glue while receipts have their own transaction linkage.
        await supabase.from('financial_transactions').insert({
            user_id: userId,
            uuid_user_id: userId,
            amount: asNumberOrNull(corrected.total),
            category: 'Other',
            name: asNonEmptyString(corrected.merchant) ?? 'Receipt',
            merchant_name: asNonEmptyString(corrected.merchant),
            date: asISODateStringOrNull(corrected.date),
            source: 'receipt_scan',
            pending: false,
            tax: asNumberOrNull(corrected.tax),
        });

        // 4. Create Graph Edge (Expert requirement)
        // Edge from a generic 'Wallet' account to an 'Expense' bucket
        await supabase.from('graph_edges').insert({
            user_id: userId,
            source_node: 'Wallet',
            target_node: asNonEmptyString(corrected.merchant),
            edge_type: 'expense',
            amount: asNumberOrNull(corrected.total),
            metadata: {
                receipt_id: id,
                transaction_id: tx.id,
                category: 'Other'
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Confirm API Error:', error);
        const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
