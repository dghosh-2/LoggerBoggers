import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        // Query the actual database schema
        const { data: columns, error } = await supabaseAdmin
            .rpc('get_table_columns', { table_name: 'transactions' });
        
        // If RPC doesn't exist, try a different approach - select one row and check keys
        const { data: sampleTx, error: sampleError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .limit(1);
        
        const { data: sampleIncome } = await supabaseAdmin
            .from('income')
            .select('*')
            .limit(1);
            
        const { data: sampleAccounts } = await supabaseAdmin
            .from('accounts')
            .select('*')
            .limit(1);
            
        // Check for categories table
        const { data: categories, error: catError } = await supabaseAdmin
            .from('categories')
            .select('*')
            .limit(20);

        // Try to get column info via information_schema
        const { data: txColumns } = await supabaseAdmin
            .from('information_schema.columns' as any)
            .select('column_name, data_type')
            .eq('table_name', 'transactions')
            .eq('table_schema', 'public');

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/2d405ccf-cb3f-4611-bc27-f95a616c15c9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'debug/schema/route.ts:35',message:'Schema discovery results',data:{txSampleKeys:sampleTx?.[0]?Object.keys(sampleTx[0]):[],incomeSampleKeys:sampleIncome?.[0]?Object.keys(sampleIncome[0]):[],accountSampleKeys:sampleAccounts?.[0]?Object.keys(sampleAccounts[0]):[],txColumns,sampleError},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        return NextResponse.json({
            transactions: {
                sampleKeys: sampleTx?.[0] ? Object.keys(sampleTx[0]) : [],
                sample: sampleTx?.[0] || null,
                error: sampleError,
                columns: txColumns,
            },
            income: {
                sampleKeys: sampleIncome?.[0] ? Object.keys(sampleIncome[0]) : [],
                sample: sampleIncome?.[0] || null,
            },
            accounts: {
                sampleKeys: sampleAccounts?.[0] ? Object.keys(sampleAccounts[0]) : [],
                sample: sampleAccounts?.[0] || null,
            },
            categories: {
                data: categories || [],
                error: catError,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
