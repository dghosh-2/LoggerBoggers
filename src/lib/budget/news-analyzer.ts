/**
 * News Analyzer
 * 
 * Integrates with NewsAPI.org and OpenAI to detect
 * budget-impacting events from current news.
 */

import type { NewsArticle, AnalyzedNewsEvent } from '@/types/budget';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const NEWS_QUERY = 'inflation OR "interest rate" OR "consumer spending" OR tariffs OR "federal reserve" OR "gas prices" OR "food prices"';
const NEWS_DOMAINS = 'wsj.com,bloomberg.com,cnbc.com,reuters.com,marketwatch.com';
const NEWS_CACHE_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════════════
// NEWS API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch recent financial news from NewsAPI
 */
export async function fetchFinancialNews(apiKey: string): Promise<NewsArticle[]> {
    if (!apiKey) {
        console.warn('NEWS_API_KEY not configured, returning empty news');
        return [];
    }

    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const fromDate = oneWeekAgo.toISOString().split('T')[0];

        const url = new URL('https://newsapi.org/v2/everything');
        url.searchParams.set('q', NEWS_QUERY);
        url.searchParams.set('domains', NEWS_DOMAINS);
        url.searchParams.set('from', fromDate);
        url.searchParams.set('sortBy', 'relevancy');
        url.searchParams.set('pageSize', '20');
        url.searchParams.set('apiKey', apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            console.error('NewsAPI error:', response.status);
            return [];
        }

        const data = await response.json();

        return (data.articles || []).map((article: {
            title: string;
            description: string;
            url: string;
            publishedAt: string;
            source: { name: string };
        }) => ({
            title: article.title,
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown',
        }));
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// OPENAI ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

const ANALYSIS_SYSTEM_PROMPT = `You are a financial analyst helping individuals plan their budgets for upcoming events and economic changes. Analyze news articles and extract actionable budget insights.

Focus on events that will impact typical US consumer budgets within the next 90 days.`;

const ANALYSIS_USER_PROMPT = `Analyze these recent financial news headlines and descriptions:

{ARTICLES}

Extract events or economic trends that will impact a typical US consumer's budget in the next 90 days.

For EACH relevant event/trend, provide a JSON object with:
- eventName: Brief descriptive name
- timeframe: When this will impact budgets (specific date or range like "Late February")
- affectedCategory: ONE of: Groceries, Dining, Shopping, Transportation, Entertainment, Utilities, Healthcare, Housing, Other
- impactType: "increase" or "decrease"
- impactPercentage: Estimated % change (number only)
- reasoning: 1-2 sentence explanation
- actionableAdvice: Specific action user can take (max 2 sentences)

Return ONLY a JSON array. Include only events with MEDIUM or HIGH confidence.
If no relevant events, return empty array [].`;

/**
 * Analyze news articles using OpenAI
 */
export async function analyzeNewsWithAI(
    articles: NewsArticle[],
    openaiApiKey: string
): Promise<AnalyzedNewsEvent[]> {
    if (!openaiApiKey || articles.length === 0) {
        return [];
    }

    try {
        // Format articles for prompt
        const articlesText = articles
            .map((a, i) => `${i + 1}. ${a.title}\n   ${a.description}`)
            .join('\n\n');

        const userPrompt = ANALYSIS_USER_PROMPT.replace('{ARTICLES}', articlesText);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.status);
            return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';

        // Parse JSON response
        try {
            // Extract JSON array from response (handle markdown code blocks)
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return [];

            const events: AnalyzedNewsEvent[] = JSON.parse(jsonMatch[0]);
            return events.filter(e =>
                e.eventName &&
                e.affectedCategory &&
                e.actionableAdvice
            );
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Failed to analyze news:', error);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch and analyze news, returning budget events
 */
export async function getNewsBasedEvents(
    newsApiKey: string,
    openaiApiKey: string
): Promise<AnalyzedNewsEvent[]> {
    // Fetch news
    const articles = await fetchFinancialNews(newsApiKey);

    if (articles.length === 0) {
        return [];
    }

    // Analyze with AI
    const events = await analyzeNewsWithAI(articles, openaiApiKey);

    return events;
}

/**
 * Check if cached news analysis is still valid
 */
export function isCacheValid(cacheDate: string): boolean {
    const cached = new Date(cacheDate);
    const now = new Date();
    const hoursSince = (now.getTime() - cached.getTime()) / (1000 * 60 * 60);
    return hoursSince < NEWS_CACHE_HOURS;
}

/**
 * Convert analyzed news event to DetectedEvent format
 */
export function newsEventToDetectedEvent(
    event: AnalyzedNewsEvent,
    userId: string
): {
    userId: string;
    eventName: string;
    eventDate: string;
    category: string;
    estimatedCost: number;
    source: 'news';
    confidence: 'medium';
    newsInsight: string;
    actionableAdvice: string;
} {
    // Parse timeframe to approximate date
    const now = new Date();
    let eventDate = new Date(now);

    const timeframeLower = event.timeframe.toLowerCase();

    if (timeframeLower.includes('week')) {
        eventDate.setDate(now.getDate() + 7);
    } else if (timeframeLower.includes('month') || timeframeLower.includes('february')) {
        eventDate.setMonth(1); // February
        if (eventDate < now) eventDate.setFullYear(now.getFullYear() + 1);
    } else if (timeframeLower.includes('march')) {
        eventDate.setMonth(2);
        if (eventDate < now) eventDate.setFullYear(now.getFullYear() + 1);
    } else if (timeframeLower.includes('april')) {
        eventDate.setMonth(3);
        if (eventDate < now) eventDate.setFullYear(now.getFullYear() + 1);
    } else {
        // Default to 30 days from now
        eventDate.setDate(now.getDate() + 30);
    }

    // Estimate cost based on impact percentage (rough calculation)
    const baseCost = 100; // Arbitrary base
    const estimatedCost = Math.round(baseCost * (1 + event.impactPercentage / 100));

    return {
        userId,
        eventName: `📰 ${event.eventName}`,
        eventDate: eventDate.toISOString().split('T')[0],
        category: event.affectedCategory,
        estimatedCost,
        source: 'news',
        confidence: 'medium',
        newsInsight: event.reasoning,
        actionableAdvice: event.actionableAdvice,
    };
}
