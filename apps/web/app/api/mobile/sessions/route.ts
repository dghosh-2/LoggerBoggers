import { NextResponse } from 'next/server';
import { createMobileSession } from '@/lib/mobileReceiptSessions';

export async function POST() {
    const session = createMobileSession();

    return NextResponse.json({
        sessionId: session.sessionId,
        status: session.status,
        expiresInSeconds: 900,
    });
}
