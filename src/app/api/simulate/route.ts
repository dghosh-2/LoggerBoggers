import { NextRequest, NextResponse } from 'next/server';
import {
    analyzeHistoricalData,
    buildAIPrompt,
    runSimulation,
    parseNewsToImpacts,
    SimulationInput,
    NewsImpact
} from '@/lib/simulation-engine';

// Fetch news for simulation context
async function fetchNewsForSimulation(): Promise<any[]> {
    try {
        // In production, this would be an external API call
        // For now, return mock news data
        return [
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
        ];
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            userQuery,
            incomeChangePercent = 0,
            expenseChangePercent = 0,
            savingsRatePercent = 25,
            customEvents = [],
            includeNews = true,
            months = 12
        } = body;

        // Get historical analysis
        const historical = analyzeHistoricalData();

        // Fetch and parse news impacts
        let newsImpacts: NewsImpact[] = [];
        let newsContext = '';

        if (includeNews) {
            const news = await fetchNewsForSimulation();
            newsImpacts = parseNewsToImpacts(news);
            newsContext = news.map(n => `- ${n.title}: ${n.summary}`).join('\n');
        }

        // Build simulation input
        const simulationInput: SimulationInput = {
            incomeChangePercent,
            expenseChangePercent,
            savingsRatePercent,
            customEvents,
            newsImpacts,
            months,
        };

        // Run the simulation
        const simulationResult = runSimulation(simulationInput);

        // If no user query, just return simulation results
        if (!userQuery) {
            return NextResponse.json({
                success: true,
                simulation: simulationResult,
                historical: {
                    avgMonthlyExpenses: historical.avgMonthlyExpenses,
                    avgMonthlySavings: historical.avgMonthlySavings,
                    topCategories: historical.topCategories,
                    categoryBreakdown: historical.categoryBreakdown,
                    monthlyTrends: historical.monthlyTrends,
                },
                newsImpacts,
                aiResponse: null,
            });
        }

        // Check for OpenAI API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({
                success: true,
                simulation: simulationResult,
                historical: {
                    avgMonthlyExpenses: historical.avgMonthlyExpenses,
                    avgMonthlySavings: historical.avgMonthlySavings,
                    topCategories: historical.topCategories,
                },
                newsImpacts,
                aiResponse: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local to enable AI insights.",
            });
        }

        // Build the AI prompt with full context
        const prompt = buildAIPrompt(historical, simulationResult, userQuery, newsContext);

        // Call OpenAI API
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful financial advisor AI. You have access to the user\'s historical spending data, a projection simulation, and current financial news. Provide specific, actionable advice.'
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 600,
            }),
        });

        if (!openAIResponse.ok) {
            const errorData = await openAIResponse.json();
            console.error('OpenAI API error:', errorData);
            return NextResponse.json({
                success: true,
                simulation: simulationResult,
                historical: {
                    avgMonthlyExpenses: historical.avgMonthlyExpenses,
                    avgMonthlySavings: historical.avgMonthlySavings,
                    topCategories: historical.topCategories,
                },
                newsImpacts,
                aiResponse: "Error calling OpenAI API. Please check your API key.",
            });
        }

        const aiData = await openAIResponse.json();
        const aiResponse = aiData.choices?.[0]?.message?.content || "No response from AI.";

        return NextResponse.json({
            success: true,
            simulation: simulationResult,
            historical: {
                avgMonthlyExpenses: historical.avgMonthlyExpenses,
                avgMonthlySavings: historical.avgMonthlySavings,
                topCategories: historical.topCategories,
                categoryBreakdown: historical.categoryBreakdown,
            },
            newsImpacts,
            aiResponse,
        });

    } catch (error) {
        console.error('Simulation API error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
