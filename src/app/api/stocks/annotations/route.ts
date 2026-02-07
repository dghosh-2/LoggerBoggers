import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/openai';
import { StockData } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const { stocks } = await request.json();

        if (!stocks || !Array.isArray(stocks)) {
            return NextResponse.json(
                { error: 'Invalid stock data' },
                { status: 400 }
            );
        }

        const annotations = [];

        // Generate annotations for each stock
        for (const stock of stocks as StockData[]) {
            const { symbol, data } = stock;

            if (data.length === 0) continue;

            // Find significant points: peaks, troughs, significant changes
            const prices = data.map(d => d.close);
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);

            // Find peak
            const peakIndex = prices.findIndex(p => p === maxPrice);
            const peakDate = data[peakIndex].date;

            // Find trough
            const troughIndex = prices.findIndex(p => p === minPrice);
            const troughDate = data[troughIndex].date;

            // Generate AI insights for peak
            const peakPrompt = `The stock ${symbol} reached its peak price of $${maxPrice.toFixed(2)} on ${peakDate}. Provide a brief, insightful annotation (max 15 words) explaining why this might be significant.`;
            const peakText = await generateText(
                'You are a financial analyst providing concise insights.',
                peakPrompt
            );

            annotations.push({
                date: peakDate,
                symbol,
                type: 'peak',
                text: peakText.substring(0, 100),
                value: maxPrice,
            });

            // Generate AI insights for trough
            const troughPrompt = `The stock ${symbol} reached its lowest price of $${minPrice.toFixed(2)} on ${troughDate}. Provide a brief, insightful annotation (max 15 words) explaining why this might be significant.`;
            const troughText = await generateText(
                'You are a financial analyst providing concise insights.',
                troughPrompt
            );

            annotations.push({
                date: troughDate,
                symbol,
                type: 'trough',
                text: troughText.substring(0, 100),
                value: minPrice,
            });

            // Find significant price changes (> 5% in a day)
            for (let i = 1; i < data.length && annotations.length < 10; i++) {
                const change = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
                if (Math.abs(change) > 5) {
                    const changePrompt = `The stock ${symbol} had a ${change > 0 ? 'gain' : 'drop'} of ${Math.abs(change).toFixed(1)}% on ${data[i].date}. Provide a brief annotation (max 12 words) about this movement.`;
                    const changeText = await generateText(
                        'You are a financial analyst providing concise insights.',
                        changePrompt
                    );

                    annotations.push({
                        date: data[i].date,
                        symbol,
                        type: 'significant_event',
                        text: changeText.substring(0, 80),
                        value: data[i].close,
                    });
                }
            }
        }

        return NextResponse.json({ annotations });
    } catch (error: any) {
        console.error('Annotations error:', error);
        return NextResponse.json(
            { error: 'Failed to generate annotations', details: error.message },
            { status: 500 }
        );
    }
}
