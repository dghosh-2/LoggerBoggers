import { NextRequest, NextResponse } from 'next/server';

// Yahoo Finance API for stock lookup
// This uses the free Yahoo Finance API endpoint

interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    marketCap?: number;
    exchange?: string;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase().trim();

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        // Use Yahoo Finance v8 API
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                next: { revalidate: 60 }, // Cache for 60 seconds
            }
        );

        if (!response.ok) {
            // Try alternative endpoint for search
            const searchResponse = await fetch(
                `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                }
            );

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const quotes = searchData.quotes || [];
                
                if (quotes.length > 0) {
                    // Find best match
                    const match = quotes.find((q: any) => 
                        q.symbol?.toUpperCase() === symbol || 
                        q.symbol?.toUpperCase().startsWith(symbol)
                    ) || quotes[0];

                    if (match) {
                        // Fetch actual price for the matched symbol
                        const priceResponse = await fetch(
                            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(match.symbol)}?interval=1d&range=1d`,
                            {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                },
                            }
                        );

                        if (priceResponse.ok) {
                            const priceData = await priceResponse.json();
                            const result = priceData.chart?.result?.[0];
                            const meta = result?.meta;
                            const quote = result?.indicators?.quote?.[0];

                            if (meta && quote) {
                                const currentPrice = meta.regularMarketPrice || quote.close?.[quote.close.length - 1] || 0;
                                const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
                                const change = currentPrice - previousClose;
                                const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

                                return NextResponse.json({
                                    success: true,
                                    stock: {
                                        symbol: match.symbol,
                                        name: match.shortname || match.longname || match.symbol,
                                        price: Math.round(currentPrice * 100) / 100,
                                        change: Math.round(change * 100) / 100,
                                        changePercent: Math.round(changePercent * 100) / 100,
                                        currency: meta.currency || 'USD',
                                        exchange: match.exchange || meta.exchangeName,
                                    } as StockQuote,
                                });
                            }
                        }

                        // Return search result without price
                        return NextResponse.json({
                            success: true,
                            stock: {
                                symbol: match.symbol,
                                name: match.shortname || match.longname || match.symbol,
                                price: 0,
                                change: 0,
                                changePercent: 0,
                                currency: 'USD',
                                exchange: match.exchange,
                            } as StockQuote,
                            warning: 'Price data unavailable',
                        });
                    }
                }
            }

            return NextResponse.json({ 
                error: 'Stock not found', 
                symbol,
                suggestion: 'Try a different symbol or check the spelling'
            }, { status: 404 });
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];
        const meta = result?.meta;
        const quote = result?.indicators?.quote?.[0];

        if (!meta) {
            return NextResponse.json({ error: 'Invalid response from Yahoo Finance' }, { status: 500 });
        }

        const currentPrice = meta.regularMarketPrice || quote?.close?.[quote.close.length - 1] || 0;
        const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

        return NextResponse.json({
            success: true,
            stock: {
                symbol: meta.symbol,
                name: meta.shortName || meta.longName || meta.symbol,
                price: Math.round(currentPrice * 100) / 100,
                change: Math.round(change * 100) / 100,
                changePercent: Math.round(changePercent * 100) / 100,
                currency: meta.currency || 'USD',
                exchange: meta.exchangeName,
            } as StockQuote,
        });

    } catch (error: any) {
        console.error('Error fetching stock data:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch stock data',
            details: error.message 
        }, { status: 500 });
    }
}

// Search for stocks
export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json();

        if (!query || query.length < 1) {
            return NextResponse.json({ results: [] });
        }

        const response = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            }
        );

        if (!response.ok) {
            return NextResponse.json({ results: [] });
        }

        const data = await response.json();
        const quotes = (data.quotes || [])
            .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
            .slice(0, 8)
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange,
                type: q.quoteType,
            }));

        return NextResponse.json({ results: quotes });

    } catch (error: any) {
        console.error('Error searching stocks:', error);
        return NextResponse.json({ results: [] });
    }
}
