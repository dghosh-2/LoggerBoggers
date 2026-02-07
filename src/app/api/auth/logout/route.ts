import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('session_token')?.value;

        if (token) {
            // Delete session from database
            await supabase
                .from('sessions')
                .delete()
                .eq('token', token);
        }

        const response = NextResponse.json({ success: true });

        // Clear cookie
        response.cookies.set('session_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
