import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export type MobileSessionStatus = 'waiting' | 'uploading' | 'processed' | 'error';

export interface MobileReceiptSession {
  sessionId: string;
  userId: string;
  status: MobileSessionStatus;
  receiptId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes
export const MOBILE_SESSION_EXPIRES_IN_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

function toModel(row: any): MobileReceiptSession {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    status: row.status,
    receiptId: row.receipt_id,
    error: row.error,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

export async function createMobileSession(userId: string): Promise<MobileReceiptSession> {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from('mobile_receipt_sessions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      status: 'waiting',
      receipt_id: null,
      error: null,
      expires_at: expiresAt,
      updated_at: new Date(now).toISOString(),
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not create mobile session');
  }

  return toModel(data);
}

export async function getMobileSession(sessionId: string): Promise<MobileReceiptSession | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('mobile_receipt_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (error) {
    // Treat as not found to avoid leaking internals; callers can surface a generic message.
    return null;
  }

  return data ? toModel(data) : null;
}

export async function updateMobileSession(
  sessionId: string,
  patch: Partial<Pick<MobileReceiptSession, 'status' | 'receiptId' | 'error'>>
): Promise<MobileReceiptSession | null> {
  const now = new Date().toISOString();

  const update: Record<string, any> = {
    updated_at: now,
  };

  if (patch.status) update.status = patch.status;
  if (patch.receiptId !== undefined) update.receipt_id = patch.receiptId;
  if (patch.error !== undefined) update.error = patch.error;

  const { data, error } = await supabaseAdmin
    .from('mobile_receipt_sessions')
    .update(update)
    .eq('session_id', sessionId)
    .select('*')
    .maybeSingle();

  if (error || !data) return null;
  return toModel(data);
}

