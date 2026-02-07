import { NextResponse } from 'next/server';
import { supabase } from '@repo/core';
import { getUserIdFromRequest } from '@/lib/auth';
import { normalizeCategory } from '@/lib/categories';
import { supabaseAdmin } from '@/lib/supabase-admin';

type CorrectedJson = {
    merchant?: unknown;
    date?: unknown;
    total?: unknown;
    subtotal?: unknown;
    tax?: unknown;
    address?: unknown;
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

async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
    const q = query.trim();
    if (!q) return null;

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'LoggerBoggers/1.0 (receipt confirm geocoding)',
            'Accept': 'application/json',
        },
        cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
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
        const txDate = asISODateStringOrNull(corrected.date) ?? new Date().toISOString().slice(0, 10);
        const merchantName = asNonEmptyString(corrected.merchant) ?? 'Receipt';
        const totalAmount = asNumberOrNull(corrected.total);
        const correctedAddress = asNonEmptyString(corrected.address);
        const dominantCategory = Array.isArray(items)
            ? (() => {
                const sums = new Map<string, number>();
                for (const it of items as IncomingItem[]) {
                    const rawCat = (it?.category ?? '') as unknown;
                    const cat = normalizeCategory(rawCat);
                    const qty = asNumberOrNull(it?.quantity) ?? 0;
                    const unit = asNumberOrNull(it?.unitPrice) ?? 0;
                    const line = qty * unit;
                    if (!Number.isFinite(line) || line <= 0) continue;
                    sums.set(cat, (sums.get(cat) ?? 0) + line);
                }
                const best = Array.from(sums.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
                return best ?? 'Other';
            })()
            : 'Other';

        // Try to capture a merchant address/location for the globe feature.
        // Prefer explicit correction, otherwise pull from latest extraction JSON.
        let extractedAddress: string | null = null;
        if (!correctedAddress) {
            const { data: ext } = await supabase
                .from('receipt_extractions')
                .select('extracted_json')
                .eq('receipt_id', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const v = (ext as any)?.extracted_json?.extractions?.address?.value;
            extractedAddress = asNonEmptyString(v);
        }
        const bestAddress = correctedAddress ?? extractedAddress;

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
                merchant_name: merchantName,
                transaction_date: txDate,
                total_amount: totalAmount,
                subtotal_amount: asNumberOrNull(corrected.subtotal),
                tax_amount: asNumberOrNull(corrected.tax),
            })
            .eq('id', id)
            .eq('user_id', userId);

        // 3. Create canonical transaction row (source of truth for the dashboard + graph).
        const { data: ftx, error: ftxError } = await supabase
            .from('financial_transactions')
            .insert({
            user_id: userId,
            uuid_user_id: userId,
            amount: totalAmount ?? 0,
            category: dominantCategory,
            name: merchantName,
            merchant_name: merchantName,
            date: txDate,
            location: bestAddress ?? null,
            source: 'receipt_scan',
            pending: false,
            tax: asNumberOrNull(corrected.tax),
            })
            .select('id')
            .single();

        if (ftxError) throw ftxError;

        // Best-effort cache a globe point immediately if we have an address.
        // This avoids waiting for the locations API to backfill.
        if (bestAddress) {
            try {
                const geo = await geocodeNominatim(bestAddress);
                if (geo) {
                    await supabaseAdmin.from('purchase_locations').insert({
                        user_id: userId,
                        transaction_id: ftx?.id ?? null,
                        address: bestAddress,
                        merchant_name: merchantName,
                        latitude: geo.lat,
                        longitude: geo.lng,
                        amount: totalAmount ?? 0,
                        category: dominantCategory,
                        date: txDate,
                        source: 'receipt_scan',
                    });
                }
            } catch (e) {
                // Ignore: globe caching is non-critical.
                console.error('Error caching purchase_location from receipt confirm:', e);
            }
        }

        // 4. Create Graph Edge (Expert requirement)
        // Edge from a generic 'Wallet' account to an 'Expense' bucket
        await supabase.from('graph_edges').insert({
            user_id: userId,
            source_node: 'Wallet',
            target_node: merchantName,
            edge_type: 'expense',
            amount: totalAmount,
            metadata: {
                receipt_id: id,
                financial_transaction_id: ftx?.id,
                category: dominantCategory
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Confirm API Error:', error);
        const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
