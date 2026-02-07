import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json({ holdings: [] });
        }

        // Check if user is connected
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();

        if (!connectionData?.is_connected) {
            return NextResponse.json({ holdings: [] });
        }

        // Get holdings from Supabase
        const { data: holdings, error } = await supabaseAdmin
            .from('holdings')
            .select(`
                id,
                account_id,
                plaid_security_id,
                symbol,
                name,
                quantity,
                price,
                value,
                cost_basis,
                gain_loss,
                gain_loss_percent
            `)
            .eq('uuid_user_id', userId);

        if (error) {
            console.error('Error fetching holdings:', error);
            return NextResponse.json({ holdings: [] });
        }

        // Transform to expected format
        const formattedHoldings = (holdings || []).map(h => ({
            id: h.id,
            accountId: h.account_id,
            securityId: h.plaid_security_id,
            symbol: h.symbol,
            name: h.name,
            quantity: h.quantity,
            price: h.price,
            value: h.value,
            costBasis: h.cost_basis,
            gainLoss: h.gain_loss,
            gainLossPercent: h.gain_loss_percent,
        }));

        return NextResponse.json({ holdings: formattedHoldings });
    } catch (error: any) {
        console.error('Error in holdings API:', error);
        return NextResponse.json({ holdings: [] });
    }
}
