import { NextResponse } from 'next/server';
import { createMobileSession, MOBILE_SESSION_EXPIRES_IN_SECONDS } from '@/lib/mobileReceiptSessions';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await createMobileSession(userId);

    return NextResponse.json({
        sessionId: session.sessionId,
        status: session.status,
        expiresInSeconds: MOBILE_SESSION_EXPIRES_IN_SECONDS,
    });
}
