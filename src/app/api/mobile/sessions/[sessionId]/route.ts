import { NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobileReceiptSessions';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const session = await getMobileSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    if (session.userId !== userId) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    // Do not leak userId to the client.
    return NextResponse.json({
        sessionId: session.sessionId,
        status: session.status,
        receiptId: session.receiptId,
        error: session.error,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
    });
}
