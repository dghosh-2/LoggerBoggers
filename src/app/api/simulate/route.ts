import { NextRequest, NextResponse } from 'next/server';
import {
    analyzeHistoricalData,
    buildAIPrompt,
    runSimulation,
    parseNewsToImpacts,
    SimulationInput,
    NewsImpact,
    ScenarioImpact
} from '@/lib/simulation-engine';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';

// Fetch real transaction data from Supabase
async function fetchRealData(userId: string): Promise<{
    transactions: Array<{ date: string; amount: number; category: string }>;
    monthlyIncome: number;
    isConnected: boolean;
}> {
    try {
        // Check if user is connected
        const { data: connectionData } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('is_connected')
            .eq('uuid_user_id', userId)
            .single();

        if (!connectionData?.is_connected) {
            return { transactions: [], monthlyIncome: 0, isConnected: false };
        }

        // Fetch transactions from last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const { data: transactions } = await supabaseAdmin
            .from('transactions')
            .select('date, amount, category')
            .eq('uuid_user_id', userId)
            .gte('date', sixMonthsAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

        // Calculate monthly income from income table
        const { data: incomeData } = await supabaseAdmin
            .from('income')
            .select('amount')
            .eq('uuid_user_id', userId)
            .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

        const totalIncome = incomeData?.reduce((sum, i) => sum + i.amount, 0) || 0;
        const monthlyIncome = Math.round(totalIncome / 6);

        return {
            transactions: transactions || [],
            monthlyIncome,
            isConnected: true,
        };
    } catch (error) {
        console.error('Error fetching real data:', error);
        return { transactions: [], monthlyIncome: 0, isConnected: false };
    }
}

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

// Interpret user query into simulation parameters
async function interpretScenario(query: string, apiKey: string): Promise<ScenarioImpact | null> {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                        content: `You are a financial parameter extractor. Convert the user's scenario into numerical adjustments for a financial simulation.
                        
                        Return a valid JSON object with:
                        - incomeChangePercent: number (e.g., 10 for +10% income, -5 for -5%)
                        - expenseChangePercent: number (e.g., 20 for +20% expenses)
                        - riskFactors: string[] (list of potential risks associated with this scenario)
                        
                        Example: "I'm moving to NYC" -> {"incomeChangePercent": 15, "expenseChangePercent": 40, "riskFactors": ["High cost of living", "Rent prices"]}
                        Example: "I lost my job" -> {"incomeChangePercent": -100, "expenseChangePercent": -20, "riskFactors": ["Income loss", "Emergency fund depletion"]}
                        
                        Be realistic with estimates.`
                    },
                    { role: 'user', content: query },
                ],
                temperature: 0.3,
                max_tokens: 150,
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content) as ScenarioImpact;
    } catch (error) {
        console.error('Error interpreting scenario:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

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

        // Fetch real data from Supabase
        const { transactions, monthlyIncome, isConnected } = await fetchRealData(userId);

        // If not connected, return empty simulation
        if (!isConnected) {
            return NextResponse.json({
                success: true,
                simulation: {
                    projections: [],
                    breakdown: [],
                    totalIncome: 0,
                    totalExpenses: 0,
                    totalSavings: 0,
                    endBalance: 0,
                    goalProgress: 0,
                    riskScore: 0,
                    insights: ['Connect your accounts to run financial simulations'],
                    timeline: [],
                    historicalComparison: {
                        avgMonthlyExpensesBefore: 0,
                        avgMonthlyExpensesAfter: 0,
                        savingsRateChange: 0,
                    },
                },
                historical: {
                    avgMonthlyExpenses: 0,
                    avgMonthlySavings: 0,
                    topCategories: [],
                    categoryBreakdown: [],
                    monthlyTrends: [],
                },
                newsImpacts: [],
                aiResponse: 'Connect your bank accounts via Plaid to enable financial simulations.',
                isConnected: false,
            });
        }

        // Get historical analysis with real data
        const historical = analyzeHistoricalData(transactions, monthlyIncome);

        // Fetch and parse news impacts
        let newsImpacts: NewsImpact[] = [];
        let newsContext = '';

        if (includeNews) {
            const news = await fetchNewsForSimulation();
            newsImpacts = parseNewsToImpacts(news);
            newsContext = news.map(n => `- ${n.title}: ${n.summary}`).join('\n');
        }

        // Check for OpenAI API key
        const apiKey = process.env.OPENAI_API_KEY;

        // Interpret user scenario if provided
        let scenarioImpact: ScenarioImpact | null = null;
        let adjustedIncomeChange = incomeChangePercent;
        let adjustedExpenseChange = expenseChangePercent;

        if (userQuery && apiKey) {
            scenarioImpact = await interpretScenario(userQuery, apiKey);
            if (scenarioImpact) {
                adjustedIncomeChange += scenarioImpact.incomeChangePercent;
                adjustedExpenseChange += scenarioImpact.expenseChangePercent;
            }
        }

        // Build simulation input with adjusted parameters
        const simulationInput: SimulationInput = {
            incomeChangePercent: adjustedIncomeChange,
            expenseChangePercent: adjustedExpenseChange,
            savingsRatePercent,
            customEvents,
            newsImpacts,
            months,
        };

        // Run the simulation with real data
        const simulationResult = runSimulation(simulationInput, transactions, monthlyIncome);

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

        // Build the AI prompt with full context and scenario info
        let promptContext = newsContext;
        if (scenarioImpact) {
            promptContext += `\nSCENARIO APPLIED: User query "${userQuery}" interpreted as Income: ${scenarioImpact.incomeChangePercent > 0 ? '+' : ''}${scenarioImpact.incomeChangePercent}%, Expenses: ${scenarioImpact.expenseChangePercent > 0 ? '+' : ''}${scenarioImpact.expenseChangePercent}%.`;
        }

        const prompt = buildAIPrompt(historical, simulationResult, userQuery, promptContext);

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
