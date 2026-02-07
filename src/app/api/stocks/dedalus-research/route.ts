import { NextRequest, NextResponse } from 'next/server';
import { callDedalusResearch, type DedalusResearchResult } from '@/lib/dedalus-client';

export async function POST(request: NextRequest) {
    try {
        const { query, symbols, extractedQuestions = [] } = await request.json();

        if (!query || !symbols || symbols.length === 0) {
            return NextResponse.json(
                { error: 'Query and symbols are required' },
                { status: 400 }
            );
        }

        // Build a comprehensive research query
        let researchQuery = query;
        
        // Add extracted questions to the research query if any
        if (extractedQuestions.length > 0) {
            researchQuery += `\n\nSpecific questions to address:\n${extractedQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`;
        }

        // Call Dedalus for research
        const result = await callDedalusResearch(researchQuery, symbols);

        // Format the response for the frontend
        const response: DedalusResearchResult & { 
            formattedContext: string;
            newsContext: string;
        } = {
            ...result,
            formattedContext: formatResearchContext(result),
            newsContext: formatNewsContext(result.news || []),
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Dedalus research route error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to perform research', 
                details: error.message,
                success: false,
                response: '',
                toolsUsed: [],
                formattedContext: '',
                newsContext: '',
            },
            { status: 500 }
        );
    }
}

/**
 * Format the research result into a context string for the recommendations API
 */
function formatResearchContext(result: DedalusResearchResult): string {
    if (!result.success || !result.response) {
        return '';
    }

    const parts: string[] = [];

    // Add the main response
    parts.push('=== Dedalus Research Context ===');
    parts.push(result.response);

    // Add news summary if available
    if (result.news && result.news.length > 0) {
        parts.push('\n=== Recent News ===');
        result.news.forEach((item, idx) => {
            parts.push(`${idx + 1}. ${item.title} (${item.source})`);
        });
    }

    // Add company info if available
    if (result.companyInfo && result.companyInfo.length > 0) {
        parts.push('\n=== Company Information ===');
        result.companyInfo.forEach(info => {
            const details = [
                info.sector && `Sector: ${info.sector}`,
                info.industry && `Industry: ${info.industry}`,
                info.description && `Description: ${info.description}`,
            ].filter(Boolean).join(', ');
            if (details) {
                parts.push(`${info.symbol}: ${details}`);
            }
        });
    }

    // Add financial metrics if available
    if (result.financials && result.financials.length > 0) {
        parts.push('\n=== Financial Metrics ===');
        result.financials.forEach(fin => {
            const metrics = [
                fin.peRatio && `P/E: ${fin.peRatio.toFixed(2)}`,
                fin.profitMargin && `Profit Margin: ${(fin.profitMargin * 100).toFixed(1)}%`,
                fin.revenueGrowth && `Revenue Growth: ${(fin.revenueGrowth * 100).toFixed(1)}%`,
            ].filter(Boolean).join(', ');
            if (metrics) {
                parts.push(`${fin.symbol}: ${metrics}`);
            }
        });
    }

    // Add tools used for transparency
    if (result.toolsUsed && result.toolsUsed.length > 0) {
        parts.push(`\n[Research tools used: ${result.toolsUsed.join(', ')}]`);
    }

    return parts.join('\n');
}

/**
 * Format news items into a context string
 */
function formatNewsContext(news: { title: string; source: string; url?: string }[]): string {
    if (!news || news.length === 0) {
        return '';
    }

    return news.map((item, idx) => 
        `${idx + 1}. "${item.title}" - ${item.source}${item.url ? ` (${item.url})` : ''}`
    ).join('\n');
}
