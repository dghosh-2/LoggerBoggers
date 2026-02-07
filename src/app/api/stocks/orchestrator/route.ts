import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { UserQuerySchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = UserQuerySchema.parse(body);

    // Comprehensive system prompt for flexible visualization
    const systemPrompt = `You are a financial data orchestrator that converts natural language queries into comprehensive visualization configurations.

STOCK SYMBOL MAPPING:
Apple→AAPL, Google/Alphabet→GOOGL, Tesla→TSLA, Microsoft→MSFT, Amazon→AMZN, Meta/Facebook→META, NVIDIA→NVDA, AMD→AMD, Netflix→NFLX, Disney→DIS, Intel→INTC, IBM→IBM, Salesforce→CRM, Adobe→ADBE, PayPal→PYPL, Uber→UBER, Airbnb→ABNB, Spotify→SPOT, Zoom→ZM, Shopify→SHOP

TIME PERIOD MAPPING:
"today"/"1 day"→"1d", "this week"/"5 days"→"5d", "1 month"/"last month"→"1mo", "3 months"/"quarter"→"3mo", "6 months"/"half year"→"6mo", "1 year"/"last year"/"12 months"→"1y", "2 years"→"2y", "5 years"→"5y", "10 years"/"decade"→"10y", "year to date"/"ytd"→"ytd", "all time"/"max"→"max"

QUERY TYPE DETECTION:
- "single_stock": One stock analysis
- "comparison": Multiple stocks compared (e.g., "compare X and Y", "X vs Y")
- "portfolio": Portfolio/multiple holdings analysis
- "risk_analysis": Focus on risk metrics (e.g., "how risky is", "volatility of")
- "performance": Performance tracking (e.g., "how did X perform", "returns of")

LAYOUT RULES:
- If user wants "separate graphs" or "side by side" → layout.type = "split", create multiple chart configs
- If user wants "one graph" or "overlay" or "combined" → layout.type = "single", one chart with multiple series
- If comparing 3+ stocks → consider layout.type = "grid"
- For risk-focused queries → include riskLayout = "detailed" or "comparison"

CHART CONFIGURATION:
- Each chart needs: id, title, chartType (line/area/comparison/bar), series array
- Each series needs: symbol, optional color, lineStyle (solid/dashed/dotted)
- For percentage comparisons use chartType = "comparison"
- For volume analysis use chartType = "bar"

Respond with this JSON structure:
{
  "intent": "Brief description of what user wants",
  "queryType": "single_stock|comparison|portfolio|risk_analysis|performance",
  "symbols": ["AAPL", "GOOGL"],
  "timeRange": { "period": "1y" },
  "layout": {
    "type": "single|split|grid|stacked|comparison",
    "columns": 1-3
  },
  "charts": [
    {
      "id": "chart-1",
      "title": "Chart Title",
      "subtitle": "Optional subtitle",
      "chartType": "line|area|comparison|bar",
      "series": [
        { "symbol": "AAPL", "lineStyle": "solid" },
        { "symbol": "GOOGL", "lineStyle": "solid" }
      ],
      "height": "sm|md|lg|xl",
      "showLegend": true
    }
  ],
  "riskLayout": "compact|detailed|comparison",
  "features": {
    "showRiskMetrics": true,
    "showRecommendations": true,
    "showStatistics": true,
    "enableDeepDive": true
  }
}

EXAMPLES:
- "Compare Apple and Google over 5 years" → comparison, 1 chart with 2 series, chartType="comparison"
- "Show me Apple and Tesla in separate graphs" → split layout, 2 charts each with 1 series
- "How risky is NVIDIA?" → risk_analysis, 1 chart, riskLayout="detailed"
- "Apple vs Microsoft vs Google side by side" → grid layout, 3 charts or 1 comparison chart
- "Show Tesla stock with area chart" → single_stock, chartType="area"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this query: "${query}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);

    // Normalize and validate output with comprehensive defaults
    const output = {
      intent: parsed.intent || query,
      queryType: parsed.queryType || 'single_stock',
      symbols: parsed.symbols || [],
      timeRange: {
        period: parsed.timeRange?.period || '1y',
      },
      layout: {
        type: parsed.layout?.type || 'single',
        columns: parsed.layout?.columns || (parsed.symbols?.length > 2 ? 2 : 1),
      },
      charts: normalizeCharts(parsed.charts, parsed.symbols),
      riskLayout: parsed.riskLayout || 'detailed',
      features: {
        showRiskMetrics: parsed.features?.showRiskMetrics ?? true,
        showRecommendations: parsed.features?.showRecommendations ?? true,
        showStatistics: parsed.features?.showStatistics ?? true,
        enableDeepDive: parsed.features?.enableDeepDive ?? true,
      },
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

/**
 * Normalize chart configurations with defaults
 */
function normalizeCharts(charts: any[] | undefined, symbols: string[]): any[] {
  if (!charts || charts.length === 0) {
    // Create default chart config
    return [{
      id: 'chart-main',
      title: symbols.length > 1 ? 'Stock Comparison' : `${symbols[0] || 'Stock'} Performance`,
      chartType: symbols.length > 1 ? 'comparison' : 'line',
      series: symbols.map(symbol => ({
        symbol,
        lineStyle: 'solid',
        lineWidth: 2,
      })),
      height: 'md',
      showLegend: true,
      showTooltip: true,
    }];
  }

  return charts.map((chart, idx) => ({
    id: chart.id || `chart-${idx}`,
    title: chart.title || 'Stock Chart',
    subtitle: chart.subtitle,
    chartType: chart.chartType || 'line',
    series: (chart.series || []).map((s: any) => ({
      symbol: s.symbol,
      color: s.color,
      lineStyle: s.lineStyle || 'solid',
      lineWidth: s.lineWidth || 2,
      showDataPoints: s.showDataPoints || false,
    })),
    height: chart.height || 'md',
    showLegend: chart.showLegend ?? true,
    showTooltip: chart.showTooltip ?? true,
    yAxis: chart.yAxis || { format: 'currency' },
  }));
}
