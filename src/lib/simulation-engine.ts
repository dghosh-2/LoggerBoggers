// Simulation engine - uses real data when available

// ============================================
// TYPES
// ============================================

export interface CategorySummary {
    category: string;
    totalSpent: number;
    avgMonthly: number;
    transactions: number;
    trend: 'up' | 'down' | 'stable';
    trendPercent: number;
}

export interface HistoricalAnalysis {
    totalIncome: number;
    totalExpenses: number;
    avgMonthlyExpenses: number;
    avgMonthlySavings: number;
    categoryBreakdown: CategorySummary[];
    topCategories: string[];
    recurringExpenses: RecurringExpense[];
    monthlyTrends: MonthlyTrend[];
}

export interface RecurringExpense {
    name: string;
    amount: number;
    day: number;
    category: string;
}

export interface MonthlyTrend {
    month: string;
    income: number;
    expenses: number;
    savings: number;
}

export interface NewsImpact {
    id: string;
    title: string;
    category: string;
    impactType: 'income' | 'expense';
    impactPercent: number;
    effectiveMonth: number; // Month when impact starts (1-12)
    duration: number; // How many months it lasts
    description: string;
}

export interface SimulationEvent {
    id: string;
    type: 'income' | 'expense' | 'subscription' | 'one-time';
    description: string;
    amount: number;
    category?: string;
    recurring?: boolean;
    month?: number; // Specific month for one-time events
}

export interface ScenarioImpact {
    incomeChangePercent: number;
    expenseChangePercent: number;
    oneTimeEvents: SimulationEvent[];
    riskFactors: string[];
}

export interface SimulationInput {
    incomeChangePercent: number;
    expenseChangePercent: number;
    savingsRatePercent: number;
    customEvents: SimulationEvent[];
    newsImpacts: NewsImpact[];
    months: number;
}

export interface MonthlyProjection {
    month: number;
    monthName: string;
    income: number;
    expenses: number;
    savings: number;
    balance: number;
    events: string[]; // What happened this month
    newsEffects: string[]; // News-related impacts
}

export interface SimulationBreakdown {
    category: string;
    baseAmount: number;
    adjustedAmount: number;
    changePercent: number;
    newsImpact: number;
    totalAmount: number;
}

export interface SimulationOutput {
    projections: MonthlyProjection[];
    breakdown: SimulationBreakdown[];
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    endBalance: number;
    goalProgress: number;
    riskScore: number;
    insights: string[];
    timeline: string[]; // Key events timeline
    historicalComparison: {
        avgMonthlyExpensesBefore: number;
        avgMonthlyExpensesAfter: number;
        savingsRateChange: number;
    };
}

// ============================================
// HISTORICAL DATA ANALYSIS
// ============================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// This function is called by the simulation API which fetches real data
// The baseIncome parameter should come from actual user data
export function analyzeHistoricalData(
    transactions: Array<{ date: string; amount: number; category: string }> = [],
    monthlyIncome: number = 0
): HistoricalAnalysis {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // Filter transactions within analysis window
    const relevantTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= sixMonthsAgo && d <= now;
    });

    // Group by month for trend analysis
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    // Aggregate by category with trend analysis
    const categoryData = new Map<string, {
        total: number;
        count: number;
        byMonth: Map<string, number>;
    }>();

    relevantTransactions.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

        // Monthly aggregation
        const monthly = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
        monthly.expenses += t.amount;
        monthlyData.set(monthKey, monthly);

        // Category aggregation
        const cat = categoryData.get(t.category) || {
            total: 0,
            count: 0,
            byMonth: new Map()
        };
        cat.total += t.amount;
        cat.count += 1;
        const monthlyAmount = cat.byMonth.get(monthKey) || 0;
        cat.byMonth.set(monthKey, monthlyAmount + t.amount);
        categoryData.set(t.category, cat);
    });

    // Calculate trends for each category
    const categoryBreakdown: CategorySummary[] = [];
    categoryData.forEach((data, category) => {
        const monthlyAmounts = Array.from(data.byMonth.values());
        const avgMonthly = data.total / Math.max(monthlyAmounts.length, 1);

        // Calculate trend (compare first half to second half)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercent = 0;

        if (monthlyAmounts.length >= 2) {
            const mid = Math.floor(monthlyAmounts.length / 2);
            const firstHalf = monthlyAmounts.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
            const secondHalf = monthlyAmounts.slice(mid).reduce((a, b) => a + b, 0) / (monthlyAmounts.length - mid);

            if (firstHalf > 0) {
                trendPercent = ((secondHalf - firstHalf) / firstHalf) * 100;
                if (trendPercent > 5) trend = 'up';
                else if (trendPercent < -5) trend = 'down';
            }
        }

        categoryBreakdown.push({
            category,
            totalSpent: data.total,
            avgMonthly: Math.round(avgMonthly),
            transactions: data.count,
            trend,
            trendPercent: Math.round(trendPercent),
        });
    });

    categoryBreakdown.sort((a, b) => b.totalSpent - a.totalSpent);

    // Build monthly trends
    const monthlyTrends: MonthlyTrend[] = [];
    const sortedMonths = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    sortedMonths.forEach(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        monthlyTrends.push({
            month: `${MONTH_NAMES[month]} ${year}`,
            income: monthlyIncome,
            expenses: data.expenses,
            savings: monthlyIncome - data.expenses,
        });
    });

    const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.totalSpent, 0);
    const monthCount = Math.max(monthlyTrends.length, 1);
    const avgMonthlyExpenses = totalExpenses / monthCount;

    // Empty recurring expenses - would need to be detected from real data
    const recurringExpenses: RecurringExpense[] = [];

    return {
        totalIncome: monthlyIncome * monthCount,
        totalExpenses,
        avgMonthlyExpenses: Math.round(avgMonthlyExpenses),
        avgMonthlySavings: Math.round(monthlyIncome - avgMonthlyExpenses),
        categoryBreakdown,
        topCategories: categoryBreakdown.slice(0, 5).map(c => c.category),
        recurringExpenses,
        monthlyTrends,
    };
}

// ============================================
// NEWS IMPACT MODELING
// ============================================

export function parseNewsToImpacts(news: any[]): NewsImpact[] {
    return news.map((n, i) => {
        // Determine impact based on news content
        let impactPercent = 0;
        let impactType: 'income' | 'expense' = 'expense';
        let effectiveMonth = 1;
        let duration = 12;

        // Parse news for financial impact
        if (n.category === 'Rent') {
            impactPercent = 5; // Rent usually increases 3-7%
            effectiveMonth = 3; // Usually takes effect in a few months
            impactType = 'expense';
        } else if (n.category === 'Income') {
            impactPercent = 8;
            effectiveMonth = 1;
            impactType = 'income';
        } else if (n.category === 'Groceries') {
            impactPercent = n.impact === 'positive' ? -2 : 3;
            effectiveMonth = 1;
            impactType = 'expense';
        } else if (n.category === 'Subscriptions') {
            impactPercent = 10; // Subscription price increases
            effectiveMonth = 2;
            impactType = 'expense';
        } else if (n.category === 'Savings') {
            // This affects savings returns, not direct expense
            impactPercent = 0;
        }

        return {
            id: n.id || `news-${i}`,
            title: n.title,
            category: n.category,
            impactType,
            impactPercent: n.impact === 'negative' ? Math.abs(impactPercent) : -Math.abs(impactPercent),
            effectiveMonth,
            duration,
            description: n.suggestion || n.summary,
        };
    }).filter(n => n.impactPercent !== 0);
}

// ============================================
// SIMULATION ENGINE
// ============================================

export function runSimulation(
    input: SimulationInput,
    transactions: Array<{ date: string; amount: number; category: string }> = [],
    monthlyIncome: number = 0
): SimulationOutput {
    const historical = analyzeHistoricalData(transactions, monthlyIncome);

    const baseIncome = monthlyIncome;
    const baseExpensesByCategory = new Map<string, number>();

    // Initialize category expenses from historical data
    historical.categoryBreakdown.forEach(cat => {
        baseExpensesByCategory.set(cat.category, cat.avgMonthly);
    });

    // Build detailed breakdown
    const breakdown: SimulationBreakdown[] = [];
    let totalBaseExpenses = 0;
    let totalAdjustedExpenses = 0;

    historical.categoryBreakdown.forEach(cat => {
        const baseAmount = cat.avgMonthly;

        // Apply category-specific trends from historical data
        let trendAdjustment = 1;
        if (cat.trend === 'up') trendAdjustment = 1 + (cat.trendPercent / 100) * 0.5;
        else if (cat.trend === 'down') trendAdjustment = 1 + (cat.trendPercent / 100) * 0.5;

        // Apply user's expense change
        const userAdjustment = 1 + (input.expenseChangePercent / 100);
        const adjustedAmount = baseAmount * trendAdjustment * userAdjustment;

        // Calculate news impact for this category
        let newsImpactAmount = 0;
        input.newsImpacts.forEach(news => {
            if (news.category === cat.category && news.impactType === 'expense') {
                newsImpactAmount += adjustedAmount * (news.impactPercent / 100);
            }
        });

        const totalAmount = adjustedAmount + newsImpactAmount;

        breakdown.push({
            category: cat.category,
            baseAmount: Math.round(baseAmount),
            adjustedAmount: Math.round(adjustedAmount),
            changePercent: Math.round(((adjustedAmount - baseAmount) / baseAmount) * 100),
            newsImpact: Math.round(newsImpactAmount),
            totalAmount: Math.round(totalAmount),
        });

        totalBaseExpenses += baseAmount;
        totalAdjustedExpenses += totalAmount;
    });

    // Generate monthly projections
    const projections: MonthlyProjection[] = [];
    const timeline: string[] = [];
    let balance = 5000; // Starting balance
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalSavings = 0;

    for (let m = 1; m <= input.months; m++) {
        const monthName = MONTH_NAMES[(new Date().getMonth() + m - 1) % 12];
        const events: string[] = [];
        const newsEffects: string[] = [];

        // Calculate income with adjustments
        let monthIncome = baseIncome * (1 + input.incomeChangePercent / 100);

        // Apply income-related news impacts
        input.newsImpacts.forEach(news => {
            if (news.impactType === 'income' && m >= news.effectiveMonth && m < news.effectiveMonth + news.duration) {
                const impact = monthIncome * (news.impactPercent / 100);
                monthIncome += impact;
                if (m === news.effectiveMonth) {
                    newsEffects.push(`${news.title}: ${impact > 0 ? '+' : ''}$${Math.round(impact)}/mo`);
                    timeline.push(`Month ${m}: ${news.title} takes effect`);
                }
            }
        });

        // Calculate expenses
        let monthExpenses = 0;
        breakdown.forEach(cat => {
            let catExpense = cat.adjustedAmount;

            // Apply news impacts with timing
            input.newsImpacts.forEach(news => {
                if (news.category === cat.category && news.impactType === 'expense') {
                    if (m >= news.effectiveMonth && m < news.effectiveMonth + news.duration) {
                        const impact = cat.adjustedAmount * (news.impactPercent / 100);
                        catExpense += impact;
                        if (m === news.effectiveMonth) {
                            newsEffects.push(`${news.title}: +$${Math.round(impact)}/mo on ${cat.category}`);
                            timeline.push(`Month ${m}: ${news.title} impacts ${cat.category}`);
                        }
                    }
                }
            });

            monthExpenses += catExpense;
        });

        // Apply custom events
        input.customEvents.forEach(event => {
            if (event.recurring || event.month === m || (!event.month && m === 1)) {
                if (event.type === 'expense' || event.type === 'subscription') {
                    monthExpenses += event.amount;
                    events.push(`${event.description}: ${event.amount > 0 ? '+' : ''}$${event.amount}`);
                } else if (event.type === 'income') {
                    monthIncome += event.amount;
                    events.push(`${event.description}: +$${event.amount}`);
                }
            }
        });

        // Calculate savings and balance
        const targetSavings = monthIncome * (input.savingsRatePercent / 100);
        const actualSavings = Math.max(0, Math.min(targetSavings, monthIncome - monthExpenses));
        const netCashflow = monthIncome - monthExpenses - actualSavings;
        balance += netCashflow;

        // Add recurring expense notes
        if (m === 1) {
            events.push(`Recurring: ${historical.recurringExpenses.map(r => r.name).join(', ')}`);
        }

        projections.push({
            month: m,
            monthName: `${monthName} 2026`,
            income: Math.round(monthIncome),
            expenses: Math.round(monthExpenses),
            savings: Math.round(actualSavings),
            balance: Math.round(balance),
            events,
            newsEffects,
        });

        totalIncome += monthIncome;
        totalExpenses += monthExpenses;
        totalSavings += actualSavings;
    }

    // Calculate metrics
    const goalAmount = 50000;
    const goalProgress = Math.min(100, (totalSavings / goalAmount) * 100);
    const negativeMonths = projections.filter(p => p.balance < 0).length;
    const riskScore = Math.round((negativeMonths / input.months) * 100);

    // Generate insights
    const insights: string[] = [];

    if (riskScore > 0) {
        insights.push(`Risk Alert: ${negativeMonths} month(s) may have negative balance`);
    }

    // Historical comparison
    const avgExpensesAfter = totalExpenses / input.months;
    const expenseChange = ((avgExpensesAfter - historical.avgMonthlyExpenses) / historical.avgMonthlyExpenses) * 100;

    if (expenseChange > 10) {
        insights.push(`Expenses projected ${Math.round(expenseChange)}% higher than historical average`);
    } else if (expenseChange < -10) {
        insights.push(`Expenses projected ${Math.round(Math.abs(expenseChange))}% lower than historical average`);
    }

    // News impact summary
    const totalNewsImpact = input.newsImpacts.reduce((sum, n) => {
        if (n.impactType === 'expense') return sum + (avgExpensesAfter * n.impactPercent / 100);
        return sum;
    }, 0);

    if (totalNewsImpact > 100) {
        insights.push(`News factors adding ~$${Math.round(totalNewsImpact)}/mo to expenses`);
    }

    // Savings rate insight
    const actualSavingsRate = (totalSavings / totalIncome) * 100;
    if (actualSavingsRate >= input.savingsRatePercent) {
        insights.push(`On track for ${Math.round(actualSavingsRate)}% savings rate`);
    } else {
        insights.push(`Actual savings rate: ${Math.round(actualSavingsRate)}% (target: ${input.savingsRatePercent}%)`);
    }

    // End balance insight
    if (projections[projections.length - 1].balance > 20000) {
        insights.push(`Strong ending balance: $${projections[projections.length - 1].balance.toLocaleString()}`);
    }

    return {
        projections,
        breakdown,
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        totalSavings: Math.round(totalSavings),
        endBalance: Math.round(balance),
        goalProgress: Math.round(goalProgress),
        riskScore,
        insights,
        timeline,
        historicalComparison: {
            avgMonthlyExpensesBefore: historical.avgMonthlyExpenses,
            avgMonthlyExpensesAfter: Math.round(avgExpensesAfter),
            savingsRateChange: monthlyIncome > 0 
                ? Math.round(actualSavingsRate - (historical.avgMonthlySavings / monthlyIncome * 100))
                : 0,
        },
    };
}

// ============================================
// AI PROMPT HELPERS
// ============================================

export function buildAIPrompt(
    historical: HistoricalAnalysis,
    simulation: SimulationOutput,
    userQuery: string,
    newsContext?: string
): string {
    const topSpending = historical.categoryBreakdown
        .slice(0, 5)
        .map(c => `${c.category}: $${c.avgMonthly}/mo (${c.trend} ${c.trendPercent}%)`)
        .join('\n  ');

    const projectionSummary = simulation.projections
        .filter((_, i) => i % 3 === 0) // Every 3rd month
        .map(p => `${p.monthName}: Income $${p.income}, Expenses $${p.expenses}, Balance $${p.balance}`)
        .join('\n  ');

    return `You are a financial advisor AI. Analyze this simulation and answer the user's question with a well-structured response.

HISTORICAL DATA (Past 6 months):
- Avg Monthly Income: $${historical.totalIncome > 0 ? Math.round(historical.totalIncome / 6).toLocaleString() : '0'}
- Avg Monthly Expenses: $${historical.avgMonthlyExpenses.toLocaleString()}
- Avg Monthly Savings: $${historical.avgMonthlySavings.toLocaleString()}
- Top Spending Categories:
  ${topSpending}

SIMULATION RESULTS (Next ${simulation.projections.length} months):
- Projected Total Income: $${simulation.totalIncome.toLocaleString()}
- Projected Total Expenses: $${simulation.totalExpenses.toLocaleString()}
- Projected Total Savings: $${simulation.totalSavings.toLocaleString()}
- Ending Balance: $${simulation.endBalance.toLocaleString()}
- Risk Score: ${simulation.riskScore}%
- Key Projections:
  ${projectionSummary}

${newsContext ? `RELEVANT NEWS:\n${newsContext}\n` : ''}

KEY INSIGHTS FROM SIMULATION:
${simulation.insights.join('\n')}

USER QUESTION: ${userQuery}

Please structure your response with clear sections:

1. HEADLINE: Start with a single sentence summarizing the main impact or answer

2. RECOMMENDATIONS: List 2-3 specific, actionable recommendations with dollar amounts where applicable. Format as:
   - Action to take: specific amount or change needed

3. RISKS: List any potential risks or concerns the user should be aware of

4. OPPORTUNITIES: Highlight any positive factors or opportunities

Keep the response concise (under 300 words). Use specific numbers from the simulation data.`;
}
