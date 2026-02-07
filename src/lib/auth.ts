import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
    id: string;
    username: string;
    displayName: string;
}

/**
 * Get the current authenticated user from the session cookie
 * For use in server components and API routes
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) {
            return null;
        }

        // Find session
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('user_id, expires_at')
            .eq('token', token)
            .single();

        if (sessionError || !session) {
            return null;
        }

        // Check if session expired
        if (new Date(session.expires_at) < new Date()) {
            return null;
        }

        // Get user
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, display_name')
            .eq('id', session.user_id)
            .single();

        if (userError || !user) {
            return null;
        }

        return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
        };
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * Get user ID from request cookies (for API routes)
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
    try {
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) return null;

        const cookies = Object.fromEntries(
            cookieHeader.split('; ').map(c => {
                const [key, ...val] = c.split('=');
                return [key, val.join('=')];
            })
        );

        const token = cookies['session_token'];
        if (!token) return null;

        const { data: session } = await supabase
            .from('sessions')
            .select('user_id, expires_at')
            .eq('token', token)
            .single();

        if (!session || new Date(session.expires_at) < new Date()) {
            return null;
        }

        return session.user_id;
    } catch (error) {
        console.error('Error getting user ID from request:', error);
        return null;
    }
}
