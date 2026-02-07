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
            return NextResponse.json({ holdings: [] });
        }

        // Get holdings from Supabase
        const { data: holdings, error } = await supabase
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
            .eq('user_id', 'default_user');

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
