import { NextRequest, NextResponse } from 'next/server';
import { fetchMultipleStocks } from '@/lib/yahoo-finance';

export async function POST(request: NextRequest) {
    try {
        const { symbols, period } = await request.json();

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return NextResponse.json(
                { error: 'Invalid symbols array' },
                { status: 400 }
            );
        }

        // Fetch data for all symbols
        const stockData = await fetchMultipleStocks(symbols, period || '1y');

        return NextResponse.json({ stocks: stockData });
    } catch (error: any) {
        console.error('Data fetcher error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock data', details: error.message },
            { status: 500 }
        );
    }
}
