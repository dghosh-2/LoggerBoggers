import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/openai';
import { scrapeStockNews, scrapeMarketNews } from '@/lib/news-scraper';

export async function POST(request: NextRequest) {
    try {
        const { symbol, date, priceData } = await request.json();

        if (!symbol || !date) {
            return NextResponse.json(
                { error: 'Symbol and date are required' },
                { status: 400 }
            );
        }

        // Scrape news for that date
        const stockNews = await scrapeStockNews(symbol, date, 3);
        const marketNews = await scrapeMarketNews(date);

        // Generate AI analysis
        const analysisPrompt = `
Stock: ${symbol}
Date: ${date}
Price Info: Open: $${priceData.open}, Close: $${priceData.close}, Change: ${priceData.changePercent.toFixed(2)}%

Relevant News:
${stockNews.map(n => `- ${n.title} (${n.source})`).join('\n')}

Market Context:
${marketNews.map(n => `- ${n.title}`).join('\n')}

Provide a comprehensive analysis (2-3 paragraphs) explaining:
1. Why the stock price moved the way it did on this date
2. The broader market context
3. Key factors influencing the price movement

Be specific, insightful, and focus on the connection between news events and price action.
`;

        const analysis = await generateText(
            'You are an expert financial analyst who excels at explaining stock price movements.',
            analysisPrompt
        );

        // Generate broader context
        const contextPrompt = `
Given the stock ${symbol} on ${date}, provide a brief paragraph about the broader market and economic context during this period. What were the major market trends, economic indicators, or events happening around this time?
`;

        const context = await generateText(
            'You are a financial market expert providing context.',
            contextPrompt
        );

        return NextResponse.json({
            date,
            symbol,
            priceInfo: priceData,
            news: stockNews,
            analysis,
            context,
        });
    } catch (error: any) {
        console.error('Deep dive error:', error);
        return NextResponse.json(
            { error: 'Failed to generate deep dive analysis', details: error.message },
            { status: 500 }
        );
    }
}
