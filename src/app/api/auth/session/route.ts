import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value;

        if (!token) {
            return NextResponse.json({ user: null });
        }

        // Find session
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('user_id, expires_at')
            .eq('token', token)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ user: null });
        }

        // Check if session expired
        if (new Date(session.expires_at) < new Date()) {
            // Delete expired session
            await supabase
                .from('sessions')
                .delete()
                .eq('token', token);
            return NextResponse.json({ user: null });
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('id', session.user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ user: null });
        }

        // Check if user has Plaid connected
        const { data: plaidConnection } = await supabase
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', user.id)
            .single();

        return NextResponse.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                isPlaidConnected: plaidConnection?.is_connected || false,
            },
        });
    } catch (error: any) {
        console.error('Session check error:', error);
        return NextResponse.json({ user: null });
    }
}
