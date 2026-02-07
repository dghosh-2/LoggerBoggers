import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({ loans: [] });
        }

        // Check if user is connected
        const { data: connectionData } = await supabase
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();

        if (!connectionData?.is_connected) {
            return NextResponse.json({ loans: [] });
        }

        // Get loan accounts from accounts table (type = 'loan')
        const { data: loanAccounts, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('uuid_user_id', userId)
            .eq('type', 'loan');

        if (error) {
            console.error('Error fetching loan accounts:', error);
            return NextResponse.json({ loans: [] });
        }

        // Transform accounts to loan format
        // For sandbox data, we estimate some values
        const formattedLoans = (loanAccounts || []).map(acc => {
            const currentBalance = Number(acc.current_balance) || 0;
            // Estimate original principal as 1.5x current balance for demo
            const originalPrincipal = Math.round(currentBalance * 1.5);
            
            // Determine loan type from subtype
            let loanType = 'other';
            if (acc.subtype === 'student') loanType = 'student';
            else if (acc.subtype === 'mortgage') loanType = 'mortgage';
            else if (acc.subtype === 'auto') loanType = 'auto';
            else if (acc.subtype === 'personal') loanType = 'personal';

            return {
                id: acc.id,
                accountId: acc.plaid_account_id,
                name: acc.name,
                type: loanType,
                originalPrincipal: originalPrincipal,
                currentBalance: currentBalance,
                interestRate: loanType === 'student' ? 5.5 : loanType === 'mortgage' ? 6.5 : 7.5,
                minimumPayment: Math.round(currentBalance * 0.02), // Estimate 2% of balance
                nextPaymentDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
                originationDate: null,
                institution: acc.institution_name,
            };
        });

        return NextResponse.json({ loans: formattedLoans });
    } catch (error: any) {
        console.error('Error in loans API:', error);
        return NextResponse.json({ loans: [] });
    }
}
