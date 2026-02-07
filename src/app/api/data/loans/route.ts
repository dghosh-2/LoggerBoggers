import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // Check if user is connected
        const { data: connectionData } = await supabase
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('user_id', 'default_user')
            .single();

        if (!connectionData?.is_connected) {
            return NextResponse.json({ loans: [] });
        }

        // Get loans from Supabase
        const { data: loans, error } = await supabase
            .from('loans')
            .select(`
                id,
                account_id,
                plaid_account_id,
                name,
                type,
                original_principal,
                current_balance,
                interest_rate,
                minimum_payment,
                next_payment_date,
                origination_date,
                institution_name
            `)
            .eq('user_id', 'default_user');

        if (error) {
            console.error('Error fetching loans:', error);
            return NextResponse.json({ loans: [] });
        }

        // Transform to expected format
        const formattedLoans = (loans || []).map(l => ({
            id: l.id,
            accountId: l.account_id,
            name: l.name,
            type: l.type,
            originalPrincipal: l.original_principal,
            currentBalance: l.current_balance,
            interestRate: l.interest_rate,
            minimumPayment: l.minimum_payment,
            nextPaymentDueDate: l.next_payment_date,
            originationDate: l.origination_date,
            institution: l.institution_name,
        }));

        return NextResponse.json({ loans: formattedLoans });
    } catch (error: any) {
        console.error('Error in loans API:', error);
        return NextResponse.json({ loans: [] });
    }
}
