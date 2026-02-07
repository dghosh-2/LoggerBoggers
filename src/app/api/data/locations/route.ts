import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

type Timeframe = '7d' | '30d' | '90d' | '1y' | 'all';

function timeframeToStartDate(timeframe: Timeframe): Date {
  const startDate = new Date();
  switch (timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      return new Date('2000-01-01');
  }
  return startDate;
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function txKey(input: { date: string; amount: number; merchant: string; address: string }): string {
  const merchant = (input.merchant || '').trim().toLowerCase();
  const address = (input.address || '').trim().toLowerCase();
  const amount = Number(input.amount || 0).toFixed(2);
  const date = (input.date || '').trim();
  return `${date}|${amount}|${merchant}|${address}`;
}

async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;

  // Nominatim usage policy expects a valid User-Agent identifying the application.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'LoggerBoggers/1.0 (purchase globe geocoding)',
      'Accept': 'application/json',
    },
    // Avoid caching potentially stale geocodes at the edge/browser layer.
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const data: any = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function isMissingTableError(err: any, tableName: string): boolean {
  const msg = String(err?.message || err?.details || err?.hint || '');
  const code = String(err?.code || '');
  return code === '42P01' || msg.toLowerCase().includes(`relation "${tableName}" does not exist`);
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ locations: [] });
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') || '30d') as Timeframe;

    const startDate = timeframeToStartDate(timeframe);
    const startDateStr = toDateString(startDate);

    // Fetch purchase locations from database
    const { data: locations, error } = await supabaseAdmin
      .from('purchase_locations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (error) {
      // If the cache table doesn't exist yet, fall back to returning geocoded points directly.
      if (isMissingTableError(error, 'purchase_locations')) {
        console.error('purchase_locations table missing; falling back to on-the-fly geocoding.');
      } else {
        console.error('Error fetching locations:', error);
      }

      const { data: txs, error: txError } = await supabaseAdmin
        .from('financial_transactions')
        .select('id, date, amount, category, merchant_name, name, location, source')
        .eq('uuid_user_id', userId)
        .gte('date', startDateStr)
        .not('location', 'is', null)
        .order('date', { ascending: false })
        .limit(250);

      if (txError) {
        console.error('Error fetching financial_transactions for fallback:', txError);
        return NextResponse.json({ locations: [] });
      }

      const candidates = (txs || [])
        .map((tx: any) => {
          const address = String(tx.location ?? '').trim();
          if (!address) return null;
          const merchant = String(tx.merchant_name || tx.name || '').trim();
          const date = String(tx.date ?? '').trim();
          const amount = Number(tx.amount ?? 0);
          const category = String(tx.category || 'Other');
          return { id: tx.id, address, merchant, date, amount, category };
        })
        .filter(Boolean) as Array<{
        id: string;
        address: string;
        merchant: string;
        date: string;
        amount: number;
        category: string;
      }>;

      const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
      const uniqueAddresses = Array.from(new Set(candidates.map((t) => t.address))).slice(0, 12);
      for (const addr of uniqueAddresses) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
        // eslint-disable-next-line no-await-in-loop
        geocodeCache.set(addr, await geocodeNominatim(addr));
      }

      const transformedLocations = candidates
        .map((t) => {
          const geo = geocodeCache.get(t.address);
          if (!geo) return null;
          return {
            id: t.id,
            lat: geo.lat,
            lng: geo.lng,
            name: t.merchant || t.address,
            amount: t.amount,
            date: t.date,
            category: t.category || 'Other',
          };
        })
        .filter(Boolean);

      return NextResponse.json({ locations: transformedLocations });
    }

    // Backfill from financial_transactions.location (string) by geocoding and caching into purchase_locations.
    // This lets the Globe feature work even when only an address string is stored on the transaction itself.
    const existingKeys = new Set(
      (locations || []).map((loc: any) =>
        txKey({
          date: String(loc.date ?? ''),
          amount: Number(loc.amount ?? 0),
          merchant: String(loc.merchant_name ?? ''),
          address: String(loc.address ?? ''),
        })
      )
    );

    const { data: txs, error: txError } = await supabaseAdmin
      .from('financial_transactions')
      .select('id, date, amount, category, merchant_name, name, location, source')
      .eq('uuid_user_id', userId)
      .gte('date', startDateStr)
      .not('location', 'is', null)
      .order('date', { ascending: false })
      .limit(2000);

    if (txError) {
      // Not fatal: we can still serve any cached purchase_locations rows.
      console.error('Error fetching financial_transactions for location backfill:', txError);
    }

    const candidates = (txs || [])
      .map((tx: any) => {
        const address = String(tx.location ?? '').trim();
        if (!address) return null;
        const merchant = String(tx.merchant_name || tx.name || '').trim();
        const date = String(tx.date ?? '').trim();
        const amount = Number(tx.amount ?? 0);
        const category = String(tx.category || 'Other');
        const source = String(tx.source || 'plaid');
        const key = txKey({ date, amount, merchant, address });
        return { address, merchant, date, amount, category, source, key };
      })
      .filter(Boolean) as Array<{
      address: string;
      merchant: string;
      date: string;
      amount: number;
      category: string;
      source: string;
      key: string;
    }>;

    const missing = candidates.filter((c) => !existingKeys.has(c.key));

    // Keep this conservative to avoid long requests and geocoder rate limits.
    const MAX_NEW_ROWS_PER_REQUEST = 250;
    const MAX_GEOCODE_PER_REQUEST = 12;

    const toInsert = missing.slice(0, MAX_NEW_ROWS_PER_REQUEST);
    if (toInsert.length > 0) {
      const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
      const uniqueAddresses = Array.from(new Set(toInsert.map((t) => t.address)));

      for (const addr of uniqueAddresses.slice(0, MAX_GEOCODE_PER_REQUEST)) {
        // Small delay to be gentle with public geocoding endpoints.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
        // eslint-disable-next-line no-await-in-loop
        const geo = await geocodeNominatim(addr);
        geocodeCache.set(addr, geo);
      }

      const rows = toInsert
        .map((t) => {
          const geo = geocodeCache.get(t.address);
          if (!geo) return null;
          return {
            user_id: userId,
            transaction_id: null,
            address: t.address,
            merchant_name: t.merchant,
            latitude: geo.lat,
            longitude: geo.lng,
            amount: t.amount,
            category: t.category || 'Other',
            date: t.date,
            source: t.source || 'plaid',
          };
        })
        .filter(Boolean) as any[];

      if (rows.length > 0) {
        const { error: insError } = await supabaseAdmin.from('purchase_locations').insert(rows);
        if (insError) {
          console.error('Error inserting purchase_locations backfill rows:', insError);
        } else {
          // Merge keys locally so we don't keep trying to backfill the same things this request.
          rows.forEach((r: any) => {
            existingKeys.add(
              txKey({
                date: String(r.date ?? ''),
                amount: Number(r.amount ?? 0),
                merchant: String(r.merchant_name ?? ''),
                address: String(r.address ?? ''),
              })
            );
          });
        }
      }
    }

    // Re-fetch after optional backfill so the globe gets the newest cached rows.
    const { data: locationsAfter, error: errorAfter } = await supabaseAdmin
      .from('purchase_locations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (errorAfter) {
      console.error('Error fetching locations after backfill:', errorAfter);
      // Fall back to the first query result.
    }

    const finalLocations = errorAfter ? locations : locationsAfter;

    // Transform data for the globe
    const transformedLocations = (finalLocations || []).map((loc: any) => ({
      id: loc.id,
      lat: Number(loc.latitude),
      lng: Number(loc.longitude),
      name: loc.merchant_name || loc.address,
      amount: Number(loc.amount),
      date: loc.date,
      category: loc.category || 'Other',
    }));

    return NextResponse.json({ locations: transformedLocations });
  } catch (error) {
    console.error('Error in locations API:', error);
    return NextResponse.json({ locations: [] }, { status: 500 });
  }
}
