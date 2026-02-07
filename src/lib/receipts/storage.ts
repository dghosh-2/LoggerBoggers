export const RECEIPTS_BUCKET =
    process.env.NEXT_PUBLIC_RECEIPTS_BUCKET || process.env.RECEIPTS_BUCKET || 'receipts';

function sanitizeSegment(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

export function buildSafeReceiptObjectKey(originalName: string) {
    const trimmed = originalName.trim();
    const lastDot = trimmed.lastIndexOf('.');
    const hasExt = lastDot > 0 && lastDot < trimmed.length - 1;

    const baseRaw = hasExt ? trimmed.slice(0, lastDot) : trimmed;
    const extRaw = hasExt ? trimmed.slice(lastDot + 1) : '';

    const base = sanitizeSegment(baseRaw) || 'receipt';
    const ext = sanitizeSegment(extRaw).replace(/[^a-z0-9]/g, '').slice(0, 8);
    const stamp = Date.now();
    const rand = crypto.randomUUID().slice(0, 8);

    return ext ? `${stamp}-${rand}-${base}.${ext}` : `${stamp}-${rand}-${base}`;
}

export function formatStorageError(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown storage error');
    const lower = rawMessage.toLowerCase();

    if (lower.includes('bucket not found') || lower.includes('not found')) {
        return `Storage bucket "${RECEIPTS_BUCKET}" was not found. Create this bucket in Supabase Storage, or set NEXT_PUBLIC_RECEIPTS_BUCKET to your existing bucket name.`;
    }

    if (lower.includes('row-level security') || lower.includes('permission')) {
        return `Upload is blocked by Supabase Storage permissions for bucket "${RECEIPTS_BUCKET}". Update Storage RLS policies to allow uploads.`;
    }

    return rawMessage;
}
