import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, display_name, password_hash')
            .eq('username', username.toLowerCase())
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Verify password
        const passwordHash = hashPassword(password);
        if (user.password_hash !== passwordHash) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            );
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);

        // Delete old sessions for this user (optional: keep multiple sessions)
        await supabase
            .from('sessions')
            .delete()
            .eq('user_id', user.id);

        // Create new session
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: sessionError } = await supabase
            .from('sessions')
            .insert({
                user_id: user.id,
                token,
                expires_at: expiresAt.toISOString(),
            });

        if (sessionError) {
            console.error('Error creating session:', sessionError);
            return NextResponse.json(
                { error: 'Failed to create session' },
                { status: 500 }
            );
        }

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
            },
        });

        response.cookies.set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
