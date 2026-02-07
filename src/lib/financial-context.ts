import { analyzeHistoricalData } from './simulation-engine';
import fs from 'fs';
import path from 'path';

/**
 * Fetch all available financial data for the user
 * This provides context to the AI about the user's actual financial situation
 */
export async function getFinancialContext(): Promise<string> {
    try {
        const contextParts: string[] = [];

        // 1. Get user profile data
        try {
            const filePath = path.join(process.cwd(), 'src/app/onboarding/data.md');
            if (fs.existsSync(filePath)) {
                const userProfile = fs.readFileSync(filePath, 'utf8');
                contextParts.push(`USER PROFILE:\n${userProfile}`);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }

        // 2. Get Plaid account data
        try {
            const storedTokens = (global as any).plaidAccessTokens as Map<string, { accessToken: string; itemId: string; institution: string }> | undefined;

            if (storedTokens && storedTokens.size > 0) {
                const accountsSummary: string[] = ['CONNECTED ACCOUNTS:'];

                for (const [itemId, tokenData] of storedTokens.entries()) {
                    accountsSummary.push(`- Institution: ${tokenData.institution} (ID: ${itemId})`);
                }

                // Note: We're not actually fetching live account balances here to keep it fast
                // The AI will be able to request specific account details if needed
                accountsSummary.push('\nNote: Use account tools to fetch current balances and transactions.');

                contextParts.push(accountsSummary.join('\n'));
            } else {
                contextParts.push('CONNECTED ACCOUNTS: None (user has not connected any bank accounts via Plaid)');
            }
        } catch (error) {
            console.error('Error fetching Plaid data:', error);
        }

        // 3. Get historical spending analysis
        try {
            const historical = analyzeHistoricalData();

            const totalSpent = historical.categoryBreakdown.reduce((sum, c) => sum + c.totalSpent, 0);
            const spendingContext = [
                'HISTORICAL SPENDING DATA:',
                `- Average Monthly Expenses: $${historical.avgMonthlyExpenses.toFixed(2)}`,
                `- Average Monthly Savings: $${historical.avgMonthlySavings.toFixed(2)}`,
                '',
                'Top Spending Categories:',
                ...historical.categoryBreakdown.slice(0, 5).map(cat =>
                    `  - ${cat.category}: $${cat.totalSpent.toFixed(2)} (${totalSpent > 0 ? ((cat.totalSpent / totalSpent) * 100).toFixed(1) : 0}%)`
                ),
                '',
                'Monthly Trends:',
                ...historical.monthlyTrends.slice(-3).map(trend =>
                    `  - ${trend.month}: $${trend.expenses.toFixed(2)} spent, $${trend.savings.toFixed(2)} saved`
                ),
            ];

            contextParts.push(spendingContext.join('\n'));
        } catch (error) {
            console.error('Error fetching historical data:', error);
            contextParts.push('HISTORICAL SPENDING DATA: Not available');
        }

        // Combine all context
        if (contextParts.length === 0) {
            return 'No financial data available. User needs to connect accounts and provide profile information.';
        }

        return contextParts.join('\n\n');
    } catch (error) {
        console.error('Error building financial context:', error);
        return 'Error fetching financial data.';
    }
}

/**
 * Get a concise version of financial context (for voice conversations)
 */
export async function getConciseFinancialContext(): Promise<string> {
    try {
        const contextParts: string[] = [];

        // User profile essentials
        try {
            const filePath = path.join(process.cwd(), 'src/app/onboarding/data.md');
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const age = content.match(/Age.*?(\d+)/)?.[1];
                const risk = content.match(/Risk Tolerance.*?(\w+)/)?.[1];

                if (age || risk) {
                    contextParts.push(`User: ${age ? `${age} years old` : ''}${age && risk ? ', ' : ''}${risk ? `${risk} risk tolerance` : ''}`);
                }
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }

        // Spending summary
        try {
            const historical = analyzeHistoricalData();
            contextParts.push(
                `Avg Monthly: $${historical.avgMonthlyExpenses.toFixed(0)} expenses, $${historical.avgMonthlySavings.toFixed(0)} savings`,
                `Top categories: ${historical.topCategories.slice(0, 3).join(', ')}`
            );
        } catch (error) {
            console.error('Error fetching historical data:', error);
        }

        return contextParts.length > 0
            ? `FINANCIAL SNAPSHOT:\n${contextParts.join('\n')}`
            : 'No financial data available yet.';
    } catch (error) {
        console.error('Error building concise context:', error);
        return '';
    }
}
