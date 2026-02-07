import { NextResponse } from 'next/server';
import { supabase } from '@repo/core';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { corrected_json } = await req.json();

        // 1. Store the corrections
        const { error: corError } = await supabase
            .from('receipt_corrections')
            .insert({
                receipt_id: id,
                corrected_json
            });

        if (corError) throw corError;

        // 2. Update receipt status + corrected core fields
        await supabase
            .from('receipts')
            .update({
                status: 'confirmed',
                merchant_name: corrected_json.merchant ?? null,
                transaction_date: corrected_json.date ?? null,
                total_amount: corrected_json.total ?? null,
            })
            .eq('id', id);

        // 3. Create Transaction
        const { data: category } = await supabase.from('categories').select('id').eq('name', 'Other').single();

        const { data: tx, error: txError } = await supabase.from('transactions').insert({
            receipt_id: id,
            merchant_name: corrected_json.merchant,
            amount: corrected_json.total,
            transaction_date: corrected_json.date,
            category_id: category?.id,
            notes: 'Confirmed via receipt scanning'
        }).select().single();

        if (txError) throw txError;

        // 4. Create Graph Edge (Expert requirement)
        // Edge from a generic 'Wallet' account to an 'Expense' bucket
        await supabase.from('graph_edges').insert({
            source_node: 'Wallet',
            target_node: corrected_json.merchant,
            edge_type: 'expense',
            amount: corrected_json.total,
            metadata: {
                receipt_id: id,
                transaction_id: tx.id,
                category: 'Other'
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Confirm API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
