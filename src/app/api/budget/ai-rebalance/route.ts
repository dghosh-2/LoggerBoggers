import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { ALWAYS_PROTECTED_CATEGORIES } from '@/lib/budget/autopilot-engine';

interface CategoryData {
    category: string;
    allocated: number;
    spent: number;
    percentUsed: number;
    isFixed: boolean;
}

interface RebalanceSuggestion {
    category: string;
    currentAllocation: number;
    suggestedAllocation: number;
    reasoning: string;
    impact: string;
}

interface RebalanceResponse {
    suggestions: RebalanceSuggestion[];
    totalSavingsIncrease: number;
    summary: string;
    insights: Array<{
        type: 'optimization' | 'warning' | 'achievement' | 'pattern';
        title: string;
        description: string;
        impact: string | null;
    }>;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            monthlyIncome,
            fixedCosts,
            categoryBudgets,
            savingsTargetPercentage,
            priority,
            totalSpent,
            totalBudget,
        } = body;

        if (!monthlyIncome || !categoryBudgets || categoryBudgets.length === 0) {
            return NextResponse.json(
                { error: 'Missing required budget data' },
                { status: 400 }
            );
        }

        // Separate fixed and flexible categories
        const fixedCategories = (categoryBudgets as CategoryData[]).filter(
            c => c.isFixed || ALWAYS_PROTECTED_CATEGORIES.includes(c.category)
        );
        const flexibleCategories = (categoryBudgets as CategoryData[]).filter(
            c => !c.isFixed && !ALWAYS_PROTECTED_CATEGORIES.includes(c.category)
        );

        // Build the prompt with real spending data
        const categoryLines = (categoryBudgets as CategoryData[])
            .map(c => `- ${c.category}: Allocated $${c.allocated.toFixed(2)}, Spent $${c.spent.toFixed(2)} (${c.percentUsed.toFixed(1)}% used)${c.isFixed ? ' [PROTECTED - DO NOT CHANGE]' : ''}`)
            .join('\n');

        const systemPrompt = `You are an expert financial advisor helping optimize personal budgets. You analyze spending patterns and suggest budget reallocations to maximize savings while maintaining quality of life. You MUST return valid JSON only.`;

        const userPrompt = `Analyze this user's budget data and suggest optimal budget reallocations.

BUDGET DATA:
- Monthly Income: $${monthlyIncome.toFixed(2)}
- Fixed Costs: $${fixedCosts.toFixed(2)}
- Savings Target: ${savingsTargetPercentage}% of discretionary income
- Priority Mode: ${priority}
- Total Budget: $${totalBudget.toFixed(2)}
- Total Spent This Month: $${totalSpent.toFixed(2)}

CATEGORY BREAKDOWN:
${categoryLines}

PROTECTED CATEGORIES (${ALWAYS_PROTECTED_CATEGORIES.join(', ')}): These categories MUST NOT be changed. Never suggest modifications to protected/fixed categories.

RULES:
1. Only suggest changes for flexible (non-protected) categories
2. The total of all flexible category allocations should stay reasonable relative to discretionary income
3. If a category consistently underspends, suggest reducing its allocation
4. If a category is near or over budget, consider if it needs more allocation
5. Always prioritize the user's savings target
6. Be specific with dollar amounts and percentages

Return JSON in this exact format:
{
  "suggestions": [
    {
      "category": "CategoryName",
      "currentAllocation": 420,
      "suggestedAllocation": 380,
      "reasoning": "You consistently underspend by 15% in this category",
      "impact": "Frees $40/month for savings"
    }
  ],
  "totalSavingsIncrease": 120,
  "summary": "Brief 1-2 sentence explanation of overall optimization strategy",
  "insights": [
    {
      "type": "optimization",
      "title": "Short headline (5-7 words)",
      "description": "2-3 sentence explanation",
      "impact": "Quantified benefit (e.g., Save $60/month)"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from OpenAI');
        }

        const parsed: RebalanceResponse = JSON.parse(content);

        // Validate that no protected categories were included in suggestions
        parsed.suggestions = parsed.suggestions.filter(
            s => !ALWAYS_PROTECTED_CATEGORIES.includes(s.category) &&
                !fixedCategories.some(fc => fc.category === s.category)
        );

        return NextResponse.json(parsed);
    } catch (error: any) {
        console.error('AI Rebalance error:', error);
        return NextResponse.json(
            { error: 'Failed to generate AI rebalance suggestions', details: error.message },
            { status: 500 }
        );
    }
}
