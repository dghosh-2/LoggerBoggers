import { NextRequest, NextResponse } from 'next/server';

// Mock news data for financial context
// In production, this would connect to a news API or web search
const MOCK_NEWS = [
    {
        id: '1',
        title: 'Rent Prices Expected to Rise 5% in 2026',
        source: 'Financial Times',
        impact: 'negative',
        category: 'Rent',
        summary: 'Urban rent prices are projected to increase by 5% due to housing demand.',
        suggestion: 'Consider negotiating a longer lease term to lock in current rates.',
    },
    {
        id: '2',
        title: 'Tech Industry Sees Salary Growth',
        source: 'Bloomberg',
        impact: 'positive',
        category: 'Income',
        summary: 'Tech salaries increased 8% on average in Q1 2026.',
        suggestion: 'Good time to negotiate a raise or explore new opportunities.',
    },
    {
        id: '3',
        title: 'Grocery Inflation Slowing',
        source: 'Reuters',
        impact: 'positive',
        category: 'Groceries',
        summary: 'Food prices stabilizing after 2 years of increases.',
        suggestion: 'Maintain current grocery budget; prices unlikely to rise significantly.',
    },
    {
        id: '4',
        title: 'Streaming Services Announce Price Hikes',
        source: 'TechCrunch',
        impact: 'negative',
        category: 'Subscriptions',
        summary: 'Major streaming platforms raising prices by $2-5/month.',
        suggestion: 'Review subscriptions and consider bundling or canceling unused services.',
    },
    {
        id: '5',
        title: 'High-Yield Savings Rates at 5%+',
        source: 'NerdWallet',
        impact: 'positive',
        category: 'Savings',
        summary: 'Best savings accounts now offering 5%+ APY.',
        suggestion: 'Move emergency fund to a high-yield savings account.',
    },
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const limit = parseInt(searchParams.get('limit') || '5');

        let news = MOCK_NEWS;

        // Filter by category if provided
        if (category) {
            news = news.filter(n =>
                n.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Limit results
        news = news.slice(0, limit);

        return NextResponse.json({
            success: true,
            news,
            count: news.length,
        });

    } catch (error) {
        console.error('News API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        // In production: Use web search API here
        // For now: Filter mock news based on keywords
        const keywords = query?.toLowerCase().split(' ') || [];

        let relevantNews = MOCK_NEWS.filter(n => {
            const text = `${n.title} ${n.summary} ${n.category}`.toLowerCase();
            return keywords.some((kw: string) => text.includes(kw));
        });

        // If no matches, return all news
        if (relevantNews.length === 0) {
            relevantNews = MOCK_NEWS.slice(0, 3);
        }

        return NextResponse.json({
            success: true,
            news: relevantNews,
            query,
        });

    } catch (error) {
        console.error('News search error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
