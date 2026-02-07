export type MobileSessionStatus = 'waiting' | 'uploading' | 'processed' | 'error';

export interface MobileReceiptSession {
    sessionId: string;
    userId: string;
    status: MobileSessionStatus;
    receiptId: string | null;
    error: string | null;
    createdAt: number;
    updatedAt: number;
}

const SESSION_TTL_MS = 15 * 60 * 1000;

function getStore(): Map<string, MobileReceiptSession> {
    const key = '__loggerboggers_mobile_receipt_sessions__';
    const globalObj = globalThis as typeof globalThis & {
        [key]?: Map<string, MobileReceiptSession>;
    };

    if (!globalObj[key]) {
        globalObj[key] = new Map<string, MobileReceiptSession>();
    }

    return globalObj[key];
}

function cleanupExpiredSessions() {
    const now = Date.now();
    const store = getStore();

    for (const [sessionId, session] of store.entries()) {
        if (now - session.updatedAt > SESSION_TTL_MS) {
            store.delete(sessionId);
        }
    }
}

export function createMobileSession(userId: string) {
    cleanupExpiredSessions();

    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const session: MobileReceiptSession = {
        sessionId,
        userId,
        status: 'waiting',
        receiptId: null,
        error: null,
        createdAt: now,
        updatedAt: now,
    };

    getStore().set(sessionId, session);
    return session;
}

export function getMobileSession(sessionId: string) {
    cleanupExpiredSessions();
    return getStore().get(sessionId) ?? null;
}

export function updateMobileSession(
    sessionId: string,
    patch: Partial<Pick<MobileReceiptSession, 'status' | 'receiptId' | 'error'>>
) {
    const store = getStore();
    const existing = store.get(sessionId);

    if (!existing) {
        return null;
    }

    const nextSession: MobileReceiptSession = {
        ...existing,
        ...patch,
        updatedAt: Date.now(),
    };

    store.set(sessionId, nextSession);
    return nextSession;
}
