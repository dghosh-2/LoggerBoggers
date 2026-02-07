import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

type InsertResult = { ok: true } | { ok: false; error: unknown };

function extractMissingColumnNameFromPostgrestError(err: any): string | null {
  const msg = String(err?.message || '');
  const details = String(err?.details || '');
  const hint = String(err?.hint || '');
  const combined = `${msg}\n${details}\n${hint}`;

  // Common PostgREST error:
  // "Could not find the 'financial_transaction_id' column of 'purchase_locations' in the schema cache"
  let m = combined.match(/Could not find the '([^']+)' column of 'purchase_locations'/i);
  if (m?.[1]) return m[1];

  // Postgres error style:
  // 'column "financial_transaction_id" of relation "purchase_locations" does not exist'
  m = combined.match(/column \"([^\"]+)\" of relation \"purchase_locations\" does not exist/i);
  if (m?.[1]) return m[1];

  return null;
}

function stripColumn(rows: Record<string, unknown>[], col: string) {
  return rows.map((r) => {
    if (!(col in r)) return r;
    const next = { ...r };
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (next as any)[col];
    return next;
  });
}

/**
 * Insert into `purchase_locations`, but tolerate schema drift between:
 * - `transaction_id` vs `financial_transaction_id`
 * - older/newer schema cache in PostgREST
 *
 * This tries the insert and, if the server complains about an unknown column,
 * strips that column from the payload and retries a couple times.
 */
export async function insertPurchaseLocations(
  rows: Record<string, unknown>[] | Record<string, unknown>
): Promise<InsertResult> {
  const initial = Array.isArray(rows) ? rows : [rows];
  let attemptRows = initial;
  let lastError: any = null;

  for (let i = 0; i < 3; i++) {
    const { error } = await supabaseAdmin.from('purchase_locations').insert(attemptRows);
    if (!error) return { ok: true };

    lastError = error;
    const missingCol = extractMissingColumnNameFromPostgrestError(error);
    if (!missingCol) break;

    attemptRows = stripColumn(attemptRows, missingCol);
  }

  return { ok: false, error: lastError };
}

