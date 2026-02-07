import { NextResponse } from 'next/server';
import { getMobileSession } from '@/lib/mobileReceiptSessions';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const session = getMobileSession(sessionId);

    if (!session) {
        return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    return NextResponse.json(session);
}
