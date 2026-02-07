import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { UserQuerySchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = UserQuerySchema.parse(body);

    // System prompt with flexible visualization options
    const systemPrompt = `You are a financial data orchestrator. Parse natural language queries about stocks into JSON.

Extract:
1. Stock symbols (convert names to tickers: Apple→AAPL, Google→GOOGL, Tesla→TSLA, Microsoft→MSFT, Amazon→AMZN, Meta→META, NVIDIA→NVDA, AMD→AMD)
2. Time range (period codes: "last year"→"1y", "5 years"→"5y", "6 months"→"6mo", "last month"→"1mo", "2 years"→"2y")
3. Query type: "single" or "comparison"
4. Visualization: chartMode is "combined" (overlay) or "separate" (side-by-side)
5. Intent: brief summary

Respond with valid JSON only:
{
  "symbols": ["AAPL", "GOOGL"],
  "timeRange": { "period": "2y" },
  "queryType": "comparison",
  "visualization": { "chartMode": "combined" },
  "features": { "risk": true, "recommendations": true },
  "intent": "Compare Apple and Google stock over 2 years"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse: "${query}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    // Normalize output with defaults
    const output = {
      symbols: parsed.symbols || [],
      timeRange: parsed.timeRange || { period: '1y' },
      queryType: parsed.queryType || 'single',
      visualization: {
        chartMode: parsed.visualization?.chartMode || 'combined',
      },
      features: {
        annotations: false,
        risk: parsed.features?.risk ?? true,
        recommendations: parsed.features?.recommendations ?? true,
      },
      intent: parsed.intent || query,
    };

    return NextResponse.json(output);
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json(
      { error: 'Failed to process query', details: error.message },
      { status: 500 }
    );
  }
}
