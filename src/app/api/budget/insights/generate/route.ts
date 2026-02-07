import { NextRequest, NextResponse } from 'next/server';
import { generateAllInsights, generateTrendAnalytics } from '@/lib/budget/trend-analyzer';
import type {
    BudgetSummary,
    AutopilotConfig,
    SavingsGoal,
    DetectedEvent,
    BudgetInsight,
    TrendAnalytics,
} from '@/types/budget';

interface GenerateInsightsRequest {
    transactions: Array<{ amount: number; category: string; date: string; name: string }>;
    currentMonth: BudgetSummary;
    config: AutopilotConfig;
    savingsGoals: SavingsGoal[];
    upcomingEvents: DetectedEvent[];
}

interface GenerateInsightsResponse {
    insights: BudgetInsight[];
    trendAnalytics: TrendAnalytics;
    generatedAt: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateInsightsRequest = await request.json();
        const {
            transactions,
            currentMonth,
            config,
            savingsGoals,
            upcomingEvents,
        } = body;

        if (!transactions || !currentMonth || !config) {
            return NextResponse.json(
                { error: 'Missing required data: transactions, currentMonth, and config are required' },
                { status: 400 }
            );
        }

        // Generate all insights using the comprehensive engine
        const insights = generateAllInsights(
            transactions,
            currentMonth,
            config,
            savingsGoals || [],
            upcomingEvents || []
        );

        // Generate trend analytics
        const trendAnalytics = generateTrendAnalytics(
            transactions,
            currentMonth.categoryBudgets
        );

        const response: GenerateInsightsResponse = {
            insights,
            trendAnalytics,
            generatedAt: new Date().toISOString(),
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Insight generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate insights', details: error.message },
            { status: 500 }
        );
    }
}
