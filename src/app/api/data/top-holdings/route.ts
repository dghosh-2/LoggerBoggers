import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const moversLimit = Math.min(Math.max(Number(searchParams.get('movers') ?? 3) || 3, 1), 10);
    const quoteMax = Math.min(Math.max(Number(searchParams.get('quoteMax') ?? 30) || 30, 5), 80);

    if (!userId) {
      return NextResponse.json({
        portfolio: { totalValue: 0, dayChangeValue: null, dayChangePercent: null },
        movers: [],
        coverage: { quotedValue: 0, totalValue: 0, quotedHoldings: 0, totalHoldings: 0 },
        as_of: new Date().toISOString(),
      });
    }

    const { data: connectionData } = await supabaseAdmin
      .from('user_plaid_connections')
      .select('is_connected')
      .eq('uuid_user_id', userId)
      .single();

    if (!connectionData?.is_connected) {
      return NextResponse.json({
        portfolio: { totalValue: 0, dayChangeValue: null, dayChangePercent: null },
        movers: [],
        coverage: { quotedValue: 0, totalValue: 0, quotedHoldings: 0, totalHoldings: 0 },
        as_of: new Date().toISOString(),
      });
    }

    const { data: holdings, error } = await supabaseAdmin
      .from('holdings')
      .select('symbol, name, value')
      .eq('uuid_user_id', userId);

    if (error) {
      console.error('Error fetching holdings:', error);
      return NextResponse.json(
        {
          portfolio: { totalValue: 0, dayChangeValue: null, dayChangePercent: null },
          movers: [],
          coverage: { quotedValue: 0, totalValue: 0, quotedHoldings: 0, totalHoldings: 0 },
          as_of: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const normalized = (holdings || [])
      .map((h: any) => ({
        symbol: (h.symbol || '').toString().trim(),
        name: (h.name || '').toString().trim(),
        value: Number(h.value || 0),
      }))
      .filter((h) => h.symbol.length > 0 && Number.isFinite(h.value))
      .sort((a, b) => b.value - a.value);

    const totalValue = normalized.reduce((sum, h) => sum + (Number.isFinite(h.value) ? h.value : 0), 0);
    const quoteUniverse = normalized.slice(0, quoteMax);
    const quotedValue = quoteUniverse.reduce((sum, h) => sum + (Number.isFinite(h.value) ? h.value : 0), 0);

    const quotes = await Promise.allSettled(
      quoteUniverse.map(async (h) => {
        const q: any = await yahooFinance.quote(h.symbol);
        const dayChangePercent =
          typeof q?.regularMarketChangePercent === 'number' ? q.regularMarketChangePercent : null;
        const dayPnlApprox =
          typeof dayChangePercent === 'number' ? (h.value * dayChangePercent) / 100 : null;

        return {
          ...h,
          dayChangePercent,
          dayPnlApprox,
          marketState: (q?.marketState || null) as string | null,
        };
      })
    );

    const enriched = quotes.map((res, i) => {
      if (res.status === 'fulfilled') return res.value;
      // Quote failed; return holding without daily numbers.
      return {
        ...quoteUniverse[i],
        dayChangePercent: null,
        dayPnlApprox: null,
        marketState: null,
      };
    });

    const dayChangeValue = enriched.reduce((sum, h) => {
      if (typeof h.dayPnlApprox !== 'number') return sum;
      return sum + h.dayPnlApprox;
    }, 0);

    const dayChangePercent = totalValue > 0 ? (dayChangeValue / totalValue) * 100 : null;

    const movers = [...enriched]
      .filter((h) => typeof h.dayChangePercent === 'number')
      .sort((a, b) => Math.abs((b.dayChangePercent as number) ?? 0) - Math.abs((a.dayChangePercent as number) ?? 0))
      .slice(0, moversLimit);

    return NextResponse.json({
      portfolio: {
        totalValue,
        dayChangeValue: Number.isFinite(dayChangeValue) ? dayChangeValue : null,
        dayChangePercent: typeof dayChangePercent === 'number' && Number.isFinite(dayChangePercent) ? dayChangePercent : null,
      },
      movers,
      coverage: {
        quotedValue,
        totalValue,
        quotedHoldings: quoteUniverse.length,
        totalHoldings: normalized.length,
      },
      as_of: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in top-holdings API:', err);
    return NextResponse.json(
      {
        portfolio: { totalValue: 0, dayChangeValue: null, dayChangePercent: null },
        movers: [],
        coverage: { quotedValue: 0, totalValue: 0, quotedHoldings: 0, totalHoldings: 0 },
        as_of: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
