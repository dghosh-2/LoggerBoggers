/**
 * Dedalus SDK Client Wrapper
 * 
 * This module provides a server-side wrapper for the Dedalus API,
 * which connects to MCP servers (Yahoo Finance, Exa Search) for
 * real-time market data and web research.
 */

const DEDALUS_API_URL = process.env.DEDALUS_API_URL || 'https://api.dedaluslabs.ai';
const DEDALUS_API_KEY = process.env.DEDALUS_API_KEY;

// MCP servers from Dedalus Marketplace
const MCP_SERVERS = [
    'tsion/yahoo-finance-mcp',
    'tsion/exa',
];

const SYSTEM_PROMPT = `You are a finance research assistant with access to real-time market data and web search.

**Yahoo Finance Tools** — for market data:
- get_quote: Live price, volume, market cap, P/E ratio, 52-week high/low
- get_historical_data: OHLCV candles (1d, 5d, 1mo, 3mo, 6mo, 1y, etc.)
- get_news: Latest news headlines for a ticker
- compare_stocks: Compare multiple stocks side by side
- get_company_info: Business summary, sector, industry, employees
- get_financials: Financial metrics (margins, P/E, revenue growth, etc.)

**Exa Search Tools** — for research:
- exa_search: Web search for news, analysis, SEC filings, earnings reports
- exa_find_similar: Find pages similar to a given URL
- exa_get_contents: Fetch full text content from URLs

When answering questions:
1. Use Yahoo Finance for current prices, historical data, company info, financials
2. Use Exa Search for news, analysis, competitor research, background info
3. Combine both when the question requires data + context

Be concise. Show key numbers when comparing. Cite sources when using web search.
Respond in a structured format that can be parsed.`;

export interface DedalusMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface DedalusResearchResult {
    success: boolean;
    response: string;
    toolsUsed: string[];
    news?: NewsItem[];
    companyInfo?: CompanyInfo[];
    financials?: FinancialMetrics[];
    error?: string;
}

export interface NewsItem {
    title: string;
    source: string;
    url?: string;
    date?: string;
    summary?: string;
}

export interface CompanyInfo {
    symbol: string;
    name?: string;
    sector?: string;
    industry?: string;
    description?: string;
    employees?: number;
    marketCap?: number;
}

export interface FinancialMetrics {
    symbol: string;
    peRatio?: number;
    forwardPE?: number;
    priceToBook?: number;
    revenueGrowth?: number;
    profitMargin?: number;
    operatingMargin?: number;
    dividendYield?: number;
}

/**
 * Call the Dedalus API to perform finance research
 */
export async function callDedalusResearch(
    query: string,
    symbols: string[],
    conversationHistory: DedalusMessage[] = []
): Promise<DedalusResearchResult> {
    if (!DEDALUS_API_KEY) {
        console.warn('DEDALUS_API_KEY not set, skipping Dedalus research');
        return {
            success: false,
            response: '',
            toolsUsed: [],
            error: 'Dedalus API key not configured',
        };
    }

    try {
        // Build the research prompt
        const researchPrompt = buildResearchPrompt(query, symbols);
        
        const messages: DedalusMessage[] = [
            ...conversationHistory,
            { role: 'user', content: researchPrompt },
        ];

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        // Call Dedalus API with timeout
        const response = await fetch(`${DEDALUS_API_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEDALUS_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini', // Use faster model
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages,
                ],
                mcp_servers: MCP_SERVERS,
                max_tokens: 1000, // Reduced for speed
                temperature: 0.5,
            }),
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Dedalus API error:', response.status, errorText);
            return {
                success: false,
                response: '',
                toolsUsed: [],
                error: `Dedalus API error: ${response.status}`,
            };
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || '';
        const toolsUsed = extractToolsUsed(data);

        // Parse the response to extract structured data
        const parsedData = parseResearchResponse(assistantMessage, symbols);

        return {
            success: true,
            response: assistantMessage,
            toolsUsed,
            ...parsedData,
        };
    } catch (error: any) {
        // Handle timeout specifically
        if (error.name === 'AbortError') {
            console.warn('Dedalus research timed out');
            return {
                success: false,
                response: '',
                toolsUsed: [],
                error: 'Research timed out',
            };
        }
        console.error('Dedalus research error:', error);
        return {
            success: false,
            response: '',
            toolsUsed: [],
            error: error.message || 'Unknown error',
        };
    }
}

/**
 * Build a research prompt for the given query and symbols
 */
function buildResearchPrompt(query: string, symbols: string[]): string {
    const symbolList = symbols.join(', ');
    
    return `Research request for stocks: ${symbolList}

User query: "${query}"

Please provide:
1. Latest news and developments for these stocks (use Exa search)
2. Key financial metrics and company info (use Yahoo Finance)
3. Any relevant analyst opinions or market sentiment
4. Brief summary of findings

Focus on information that would help an investor make informed decisions.`;
}

/**
 * Extract tools used from the Dedalus response
 */
function extractToolsUsed(data: any): string[] {
    const tools: string[] = [];
    
    // Check for tool calls in the response
    if (data.choices?.[0]?.message?.tool_calls) {
        for (const toolCall of data.choices[0].message.tool_calls) {
            if (toolCall.function?.name) {
                tools.push(toolCall.function.name);
            }
        }
    }
    
    // Also check usage metadata if available
    if (data.usage?.tools_called) {
        tools.push(...data.usage.tools_called);
    }
    
    return [...new Set(tools)]; // Remove duplicates
}

/**
 * Parse the research response to extract structured data
 */
function parseResearchResponse(response: string, symbols: string[]): Partial<DedalusResearchResult> {
    const result: Partial<DedalusResearchResult> = {
        news: [],
        companyInfo: [],
        financials: [],
    };

    // Extract news items (look for patterns like headlines, sources)
    const newsPatterns = [
        /(?:news|headline|report):\s*["']?([^"'\n]+)["']?/gi,
        /[-•]\s*["']?([^"'\n]+)["']?\s*(?:[-–]\s*(\w+))?/g,
    ];
    
    for (const pattern of newsPatterns) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
            if (match[1] && match[1].length > 20) { // Filter out short matches
                result.news?.push({
                    title: match[1].trim(),
                    source: match[2] || 'Web Search',
                });
            }
        }
    }

    // Extract company info mentions
    for (const symbol of symbols) {
        const sectorMatch = response.match(new RegExp(`${symbol}[^.]*(?:sector|industry)[:\\s]*([^,.]+)`, 'i'));
        const descMatch = response.match(new RegExp(`${symbol}[^.]*(?:is|operates)[^.]+\\.`, 'i'));
        
        if (sectorMatch || descMatch) {
            result.companyInfo?.push({
                symbol,
                sector: sectorMatch?.[1]?.trim(),
                description: descMatch?.[0]?.trim(),
            });
        }
    }

    // Extract financial metrics
    for (const symbol of symbols) {
        const peMatch = response.match(new RegExp(`${symbol}[^.]*P\\/E[:\\s]*([\\d.]+)`, 'i'));
        const marginMatch = response.match(new RegExp(`${symbol}[^.]*margin[:\\s]*([\\d.]+)%`, 'i'));
        
        if (peMatch || marginMatch) {
            result.financials?.push({
                symbol,
                peRatio: peMatch ? parseFloat(peMatch[1]) : undefined,
                profitMargin: marginMatch ? parseFloat(marginMatch[1]) / 100 : undefined,
            });
        }
    }

    // Limit results
    if (result.news) result.news = result.news.slice(0, 5);
    if (result.companyInfo) result.companyInfo = result.companyInfo.slice(0, 5);
    if (result.financials) result.financials = result.financials.slice(0, 5);

    return result;
}

/**
 * Get news for specific symbols using Dedalus
 */
export async function getStockNews(symbols: string[]): Promise<NewsItem[]> {
    const result = await callDedalusResearch(
        `Get the latest news and developments for ${symbols.join(', ')}`,
        symbols
    );
    
    return result.news || [];
}

/**
 * Get company research using Dedalus
 */
export async function getCompanyResearch(symbols: string[]): Promise<string> {
    const result = await callDedalusResearch(
        `Provide a brief research summary for ${symbols.join(', ')}, including recent news, analyst opinions, and key metrics`,
        symbols
    );
    
    return result.response;
}

export default {
    callDedalusResearch,
    getStockNews,
    getCompanyResearch,
};
