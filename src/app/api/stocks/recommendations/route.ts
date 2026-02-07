import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/openai';
import { getUserContext } from '@/lib/user-profile';

export async function POST(request: NextRequest) {
    try {
        const { query, stocks } = await request.json();

        if (!query || !stocks) {
            return NextResponse.json(
                { error: 'Query and stocks data are required' },
                { status: 400 }
            );
        }

        // Get user profile context
        const userContext = await getUserContext();

        // Build stock summary
        const stockSummary = stocks.map((stock: any) => {
            const latestPrice = stock.data[stock.data.length - 1]?.close || 0;
            const oldestPrice = stock.data[0]?.close || 0;
            const change = ((latestPrice - oldestPrice) / oldestPrice) * 100;

            return `${stock.symbol} (${stock.name}): Current $${latestPrice.toFixed(2)}, ${change > 0 ? '+' : ''}${change.toFixed(2)}% over period`;
        }).join('\n');

        // Generate personalized recommendations
        const recommendationPrompt = `
${userContext}

Query: ${query}

Stock Performance Summary:
${stockSummary}

Based on the user's profile (age, risk tolerance, financial situation) and the stocks they're viewing, provide:
1. A clear summary recommendation (2-3 sentences)
2. 3-4 specific insights about these stocks relevant to this user
3. Contextual advice tailored to their risk tolerance and life stage
4. How this aligns with their stated risk tolerance

Be specific, actionable, and personalized. Consider their age, risk tolerance, debt, and income status.
`;

        const response = await generateText(
            'You are a certified financial advisor providing personalized investment insights.',
            recommendationPrompt
        );

        // Parse the response into structured format
        const sections = response.split('\n\n');
        const summary = sections[0] || '';

        // Extract insights (look for numbered or bulleted lists)
        const insights = [];
        for (const section of sections) {
            if (section.match(/^\d+\.|^-|^•/)) {
                const lines = section.split('\n').filter(l => l.match(/^\d+\.|^-|^•/));
                for (const line of lines.slice(0, 4)) {
                    const text = line.replace(/^\d+\.\s*|^-\s*|^•\s*/, '').trim();
                    if (text) {
                        insights.push({
                            title: text.split(':')[0] || 'Insight',
                            description: text.split(':')[1]?.trim() || text,
                            relevance: 'Based on your profile',
                        });
                    }
                }
            }
        }

        // Fallback insights if parsing fails
        if (insights.length === 0) {
            insights.push({
                title: 'Personalized Analysis',
                description: response,
                relevance: 'Based on your profile and query',
            });
        }

        const recommendation = {
            summary,
            insights: insights.slice(0, 4),
            contextualAdvice: sections.find(s => s.toLowerCase().includes('advice') || s.toLowerCase().includes('consider')) || sections[sections.length - 1] || '',
            riskAlignment: sections.find(s => s.toLowerCase().includes('risk')) || 'Recommendations align with your stated risk tolerance.',
        };

        return NextResponse.json(recommendation);
    } catch (error: any) {
        console.error('Recommendations error:', error);
        return NextResponse.json(
            { error: 'Failed to generate recommendations', details: error.message },
            { status: 500 }
        );
    }
}
