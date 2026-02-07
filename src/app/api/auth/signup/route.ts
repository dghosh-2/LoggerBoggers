import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session token
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
    try {
        const { username, password, displayName } = await request.json();

        // Validate input
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        if (username.length < 3) {
            return NextResponse.json(
                { error: 'Username must be at least 3 characters' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Check if username already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username.toLowerCase())
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: 'Username already taken' },
                { status: 409 }
            );
        }

        // Create user
        const passwordHash = hashPassword(password);
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                username: username.toLowerCase(),
                password_hash: passwordHash,
                display_name: displayName || username,
            })
            .select('id, username, display_name')
            .single();

        if (createError || !newUser) {
            console.error('Error creating user:', createError);
            return NextResponse.json(
                { error: 'Failed to create account' },
                { status: 500 }
            );
        }

        // Create initial user_plaid_connections record
        await supabase
            .from('user_plaid_connections')
            .insert({
                user_id: newUser.id,
                uuid_user_id: newUser.id,
                is_connected: false,
            });

        // Create session
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 day session

        const { error: sessionError } = await supabase
            .from('sessions')
            .insert({
                user_id: newUser.id,
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

        // Set cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                displayName: newUser.display_name,
            },
        });

        response.cookies.set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
