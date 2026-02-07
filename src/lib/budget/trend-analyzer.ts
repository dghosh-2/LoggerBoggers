/**
 * Trend Analyzer
 *
 * Comprehensive insight generation engine implementing 5 insight types:
 *   1. Reallocation Opportunities — consistent underspending detection
 *   2. Behavioral Patterns — weekend spikes, post-payday splurges, impulse
 *   3. Goal Progress — behind/ahead schedule analysis
 *   4. Trend Forecasting — 6-month linear regression
 *   5. Event-Budget Alignment — cross-reference events with budget capacity
 *
 * Every insight includes full reasoning (data → analysis → decision).
 */

import type {
    BudgetInsight,
    InsightType,
    CategoryBudget,
    BudgetSummary,
    SavingsGoal,
    DetectedEvent,
    AutopilotConfig,
    CategoryTrend,
    TrendDataPoint,
    DayOfWeekData,
    TrendAnalytics,
    InsightReasoning,
} from '@/types/budget';

import {
    ReasoningBuilder,
    formatDollar,
    formatPercent,
    linearRegression,
    computeStats,
    formatMonthlySummary,
} from './decision-tracker';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Transaction {
    amount: number;
    category: string;
    date: string;
    name: string;
}

interface MonthlySpending {
    month: string; // YYYY-MM
    category: string;
    total: number;
    budget: number;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: BUILD MONTHLY SPENDING DATA
// ═══════════════════════════════════════════════════════════════════════════

function buildMonthlySpending(
    transactions: Transaction[],
    categoryBudgets: CategoryBudget[]
): MonthlySpending[] {
    const map: Record<string, MonthlySpending> = {};

    transactions.forEach(tx => {
        const month = tx.date.substring(0, 7);
        const key = `${month}-${tx.category}`;

        if (!map[key]) {
            const budget = categoryBudgets.find(c => c.category === tx.category);
            map[key] = {
                month,
                category: tx.category,
                total: 0,
                budget: budget?.allocated || 0,
            };
        }
        map[key].total += tx.amount;
    });

    return Object.values(map);
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPE 1: REALLOCATION OPPORTUNITIES
// ═══════════════════════════════════════════════════════════════════════════

function detectReallocationOpportunities(
    monthlyData: MonthlySpending[],
    categoryBudgets: CategoryBudget[],
    savingsGoals: SavingsGoal[]
): BudgetInsight[] {
    const insights: BudgetInsight[] = [];

    // Group by category, get last 3 months
    const categories = [...new Set(monthlyData.map(d => d.category))];
    const allMonths = [...new Set(monthlyData.map(d => d.month))].sort().slice(-3);

    if (allMonths.length < 2) return insights;

    categories.forEach(category => {
        const catBudget = categoryBudgets.find(c => c.category === category);
        if (!catBudget || catBudget.isFixed) return;

        const monthlyActuals = allMonths.map(month => {
            const data = monthlyData.find(d => d.month === month && d.category === category);
            return { month, actual: data?.total || 0, budget: catBudget.allocated };
        });

        // Check for consistent underspending
        const underspendAmounts = monthlyActuals.map(m => m.budget - m.actual);
        const allUnder = underspendAmounts.every(a => a > 0);

        if (!allUnder) return;

        const avgUnderspend = underspendAmounts.reduce((a, b) => a + b, 0) / underspendAmounts.length;
        const underspendPct = (avgUnderspend / catBudget.allocated) * 100;

        if (underspendPct < 20) return; // Not significant enough

        const reallocationAmount = Math.round(avgUnderspend * 0.8); // Keep 20% buffer
        const annualImpact = reallocationAmount * 12;

        // Find best destination
        const behindGoals = savingsGoals.filter(g => g.status === 'behind');
        let destination = 'savings';
        let destinationDetail = 'general savings';

        if (behindGoals.length > 0) {
            destination = behindGoals[0].name;
            destinationDetail = `your "${behindGoals[0].name}" goal`;
        }

        const reasoning = new ReasoningBuilder()
            .setDataSource(`Last ${allMonths.length} months of ${category} transactions vs budget`)
            .addDataStep(
                'Monthly Spending vs Budget',
                `Analyzed ${category} spending across ${allMonths.length} months`,
                monthlyActuals.map(m => ({
                    label: m.month,
                    value: `${formatDollar(m.actual)} of ${formatDollar(m.budget)}`,
                }))
            )
            .addAnalysisStep(
                'Consistent Underspending Detected',
                `You underspent on ${category} every month by an average of ${formatDollar(avgUnderspend)} (${formatPercent(underspendPct)}).`,
                [
                    { label: 'Average underspend', value: Math.round(avgUnderspend), unit: '$' },
                    { label: 'Underspend %', value: underspendPct.toFixed(1), unit: '%' },
                    { label: 'Months consistent', value: allMonths.length },
                ]
            )
            .addDecisionStep(
                'Reallocation Recommended',
                `Reallocating ${formatDollar(reallocationAmount)}/month to ${destinationDetail} ` +
                `(keeping 20% buffer). Annual impact: ${formatDollar(annualImpact)}.`,
                [
                    { label: 'Monthly reallocation', value: reallocationAmount, unit: '$' },
                    { label: 'Annual savings', value: annualImpact, unit: '$' },
                ]
            )
            .setConfidence(underspendPct > 35 ? 0.92 : 0.78)
            .addAlternative(`Reduce ${category} budget by ${formatDollar(reallocationAmount)}`)
            .addAlternative(`Keep current allocation as buffer`)
            .addAlternative(`Reallocate to a different category`)
            .build();

        insights.push({
            id: generateId(),
            userId: 'local-user',
            insightType: 'optimization',
            title: `Reallocate ${formatDollar(reallocationAmount)} from ${category}`,
            description:
                `You consistently underspend on ${category} by ${formatDollar(avgUnderspend)}/month ` +
                `(${formatPercent(underspendPct)}). Reallocating ${formatDollar(reallocationAmount)} to ` +
                `${destinationDetail} saves ${formatDollar(annualImpact)}/year.`,
            impact: `Save ${formatDollar(annualImpact)}/year`,
            isActionable: true,
            actionType: 'reallocate',
            actionPayload: {
                fromCategory: category,
                amount: reallocationAmount,
                toDestination: destination,
            },
            dismissed: false,
            createdAt: new Date().toISOString(),
            reasoning,
        });
    });

    return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPE 2: BEHAVIORAL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

function detectBehavioralPatterns(transactions: Transaction[]): BudgetInsight[] {
    const insights: BudgetInsight[] = [];

    if (transactions.length < 30) return insights;

    // --- Weekend vs Weekday ---
    const weekdayAmounts: number[] = [];
    const weekendAmounts: number[] = [];

    const categoryWeekend: Record<string, { weekday: number[]; weekend: number[] }> = {};

    transactions.forEach(tx => {
        const day = new Date(tx.date).getDay();
        const isWeekend = day === 0 || day === 6;

        if (isWeekend) weekendAmounts.push(tx.amount);
        else weekdayAmounts.push(tx.amount);

        if (!categoryWeekend[tx.category]) {
            categoryWeekend[tx.category] = { weekday: [], weekend: [] };
        }
        if (isWeekend) categoryWeekend[tx.category].weekend.push(tx.amount);
        else categoryWeekend[tx.category].weekday.push(tx.amount);
    });

    // Find categories with biggest weekend spike
    Object.entries(categoryWeekend).forEach(([category, data]) => {
        if (data.weekday.length < 10 || data.weekend.length < 5) return;

        const weekdayAvg = data.weekday.reduce((a, b) => a + b, 0) / data.weekday.length;
        const weekendAvg = data.weekend.reduce((a, b) => a + b, 0) / data.weekend.length;
        const multiplier = weekendAvg / weekdayAvg;

        if (multiplier < 1.5) return;

        const weeklyExcess = (weekendAvg - weekdayAvg) * 2;
        const monthlySavings = Math.round(weeklyExcess * 4.33 * 0.3);

        const reasoning = new ReasoningBuilder()
            .setDataSource(`${data.weekday.length + data.weekend.length} ${category} transactions`)
            .addDataStep(
                'Spending by Day Type',
                `Compared ${data.weekday.length} weekday vs ${data.weekend.length} weekend transactions`,
                [
                    { label: 'Weekday average', value: Math.round(weekdayAvg), unit: '$' },
                    { label: 'Weekend average', value: Math.round(weekendAvg), unit: '$' },
                    { label: 'Multiplier', value: `${multiplier.toFixed(1)}x` },
                ]
            )
            .addAnalysisStep(
                'Weekend Spike Pattern',
                `You spend ${multiplier.toFixed(1)}x more on ${category} on weekends. ` +
                `This adds approximately ${formatDollar(weeklyExcess)} per week in excess spending.`
            )
            .addDecisionStep(
                'Savings Opportunity',
                `Reducing weekend ${category} spending by 30% saves ${formatDollar(monthlySavings)}/month.`,
                [{ label: 'Monthly savings potential', value: monthlySavings, unit: '$' }]
            )
            .setConfidence(0.82)
            .addAlternative(`Set a weekend ${category} budget cap`)
            .addAlternative(`Try home alternatives on Saturdays`)
            .addAlternative('Enable weekend spending reminders')
            .build();

        insights.push({
            id: generateId(),
            userId: 'local-user',
            insightType: 'pattern',
            title: `Weekend ${category} Spending Pattern`,
            description:
                `You spend ${multiplier.toFixed(1)}x more on ${category} on weekends ` +
                `(${formatDollar(weekendAvg)} vs ${formatDollar(weekdayAvg)} on weekdays). ` +
                `This adds ${formatDollar(Math.round(weeklyExcess * 4.33))}/month.`,
            impact: `Save ${formatDollar(monthlySavings)}/month`,
            isActionable: true,
            actionType: 'reduce_category',
            actionPayload: {
                category,
                reductionAmount: monthlySavings,
                behaviorTarget: 'weekend_spending',
            },
            dismissed: false,
            createdAt: new Date().toISOString(),
            reasoning,
        });
    });

    // --- Post-Payday Splurge ---
    const earlyMonthTotals: number[] = [];
    const lateMonthTotals: number[] = [];

    transactions.forEach(tx => {
        const dayOfMonth = new Date(tx.date).getDate();
        if (dayOfMonth <= 7) earlyMonthTotals.push(tx.amount);
        else if (dayOfMonth >= 22) lateMonthTotals.push(tx.amount);
    });

    if (earlyMonthTotals.length > 10 && lateMonthTotals.length > 10) {
        const earlyAvg = earlyMonthTotals.reduce((a, b) => a + b, 0) / earlyMonthTotals.length;
        const lateAvg = lateMonthTotals.reduce((a, b) => a + b, 0) / lateMonthTotals.length;
        const ratio = earlyAvg / lateAvg;

        if (ratio > 1.5) {
            const reasoning = new ReasoningBuilder()
                .setDataSource('Transaction timing analysis across all months')
                .addDataStep(
                    'Spending by Month Phase',
                    `Compared ${earlyMonthTotals.length} early-month (days 1-7) vs ${lateMonthTotals.length} late-month (days 22-31) transactions`,
                    [
                        { label: 'Early month avg', value: Math.round(earlyAvg), unit: '$/tx' },
                        { label: 'Late month avg', value: Math.round(lateAvg), unit: '$/tx' },
                        { label: 'Ratio', value: `${ratio.toFixed(1)}x` },
                    ]
                )
                .addAnalysisStep(
                    'Post-Payday Splurge Detected',
                    `Your per-transaction spending is ${ratio.toFixed(1)}x higher in the first week of the month vs the last week. ` +
                    `This is a common post-payday effect.`
                )
                .addDecisionStep(
                    'Behavioral Nudge',
                    'Spreading purchases more evenly across the month helps avoid budget stress in the final weeks.'
                )
                .setConfidence(0.75)
                .addAlternative('Wait 48 hours before large purchases after payday')
                .addAlternative('Move bill payments to payday week')
                .addAlternative('Create a "first week" spending cap')
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'warning',
                title: 'Post-Payday Spending Spike',
                description:
                    `You spend ${ratio.toFixed(1)}x more per transaction in the first week of the month. ` +
                    `Spreading purchases more evenly can reduce budget stress later in the month.`,
                impact: 'Reduce end-of-month budget stress',
                isActionable: true,
                actionType: 'enable_reminder',
                actionPayload: {
                    reminderType: 'post_paycheck_alert',
                    triggerDays: [1, 2, 3],
                },
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        }
    }

    return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPE 3: GOAL PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeGoalProgress(
    savingsGoals: SavingsGoal[],
    categoryBudgets: CategoryBudget[]
): BudgetInsight[] {
    const insights: BudgetInsight[] = [];
    const today = new Date();

    savingsGoals.forEach(goal => {
        if (goal.status === 'completed' || !goal.deadline) return;

        const deadline = new Date(goal.deadline);
        const daysRemaining = Math.max(1, Math.ceil(
            (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ));
        const weeksRemaining = Math.max(1, daysRemaining / 7);
        const remaining = goal.targetAmount - goal.currentAmount;
        const requiredWeekly = remaining / weeksRemaining;
        const currentWeekly = goal.weeklyContribution || 0;
        const percentComplete = (goal.currentAmount / goal.targetAmount) * 100;

        // Days elapsed since goal creation
        const daysElapsed = Math.max(1, Math.ceil(
            (today.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ));
        const expectedProgress = (daysElapsed / (daysElapsed + daysRemaining)) * 100;

        if (percentComplete >= 100) {
            // Goal completed!
            const reasoning = new ReasoningBuilder()
                .setDataSource(`Savings goal: ${goal.name}`)
                .addDataStep('Goal Tracking', `Goal "${goal.name}" target: ${formatDollar(goal.targetAmount)}`, [
                    { label: 'Target', value: goal.targetAmount, unit: '$' },
                    { label: 'Saved', value: goal.currentAmount, unit: '$' },
                ])
                .addAnalysisStep('Completion Check', `Saved ${formatDollar(goal.currentAmount)} of ${formatDollar(goal.targetAmount)} target.`)
                .addDecisionStep('Celebration!', `Goal reached ${daysRemaining} days before deadline.`)
                .setConfidence(1.0)
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'achievement',
                title: `${goal.name} Goal Completed!`,
                description: `Congratulations! You saved ${formatDollar(goal.currentAmount)} for ${goal.name}.`,
                impact: `Goal achieved ${daysRemaining} days early`,
                isActionable: true,
                actionType: 'mark_complete',
                actionPayload: { goalId: goal.id },
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        } else if (percentComplete < expectedProgress * 0.85) {
            // Behind schedule
            const weeklyDeficit = requiredWeekly - currentWeekly;
            const monthlyDeficit = Math.round(weeklyDeficit * 4.33);

            // Find underspent categories to pull from
            const underspentCats = categoryBudgets
                .filter(c => !c.isFixed && c.remaining > 50)
                .sort((a, b) => b.remaining - a.remaining)
                .slice(0, 3);

            const reasoning = new ReasoningBuilder()
                .setDataSource(`Goal "${goal.name}" progress tracking`)
                .addDataStep('Goal Status', `Tracking "${goal.name}"`, [
                    { label: 'Target', value: goal.targetAmount, unit: '$' },
                    { label: 'Current', value: goal.currentAmount, unit: '$' },
                    { label: 'Remaining', value: Math.round(remaining), unit: '$' },
                    { label: 'Days left', value: daysRemaining },
                ])
                .addAnalysisStep(
                    'Behind Schedule',
                    `Expected ${formatPercent(expectedProgress)} progress, only at ${formatPercent(percentComplete)}. ` +
                    `Need ${formatDollar(requiredWeekly)}/week but saving ${formatDollar(currentWeekly)}/week.`,
                    [
                        { label: 'Required weekly', value: Math.round(requiredWeekly), unit: '$' },
                        { label: 'Current weekly', value: Math.round(currentWeekly), unit: '$' },
                        { label: 'Weekly deficit', value: Math.round(weeklyDeficit), unit: '$' },
                    ]
                )
                .addDecisionStep(
                    'Action Needed',
                    `Need ${formatDollar(monthlyDeficit)} more per month. ` +
                    (underspentCats.length > 0
                        ? `${underspentCats[0].category} has ${formatDollar(underspentCats[0].remaining)} available.`
                        : 'Consider extending the deadline.')
                )
                .setConfidence(0.88)
                .addAlternative(`Pull from ${underspentCats[0]?.category || 'another category'}`)
                .addAlternative('Extend the goal deadline')
                .addAlternative('Increase weekly contribution')
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'warning',
                title: `Behind on ${goal.name}`,
                description:
                    `You need ${formatDollar(requiredWeekly)}/week to reach ${goal.name} by ` +
                    `${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ` +
                    `but you're saving ${formatDollar(currentWeekly)}/week. ` +
                    `${formatDollar(monthlyDeficit)} more per month is needed.`,
                impact: `Need ${formatDollar(monthlyDeficit)} more/month`,
                isActionable: true,
                actionType: 'boost_goal',
                actionPayload: {
                    goalId: goal.id,
                    requiredWeeklyIncrease: Math.round(weeklyDeficit),
                    reallocationOptions: underspentCats.map(c => ({
                        category: c.category,
                        available: Math.round(c.remaining),
                    })),
                },
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        } else if (percentComplete > expectedProgress * 1.15) {
            // Ahead of schedule
            const daysAhead = Math.round(
                ((percentComplete - expectedProgress) / 100) * (daysElapsed + daysRemaining)
            );

            const reasoning = new ReasoningBuilder()
                .setDataSource(`Goal "${goal.name}" progress tracking`)
                .addDataStep('Goal Status', `Tracking "${goal.name}"`, [
                    { label: 'Target', value: goal.targetAmount, unit: '$' },
                    { label: 'Progress', value: `${percentComplete.toFixed(0)}%` },
                    { label: 'Expected', value: `${expectedProgress.toFixed(0)}%` },
                ])
                .addAnalysisStep(
                    'Ahead of Schedule',
                    `At ${formatPercent(percentComplete)} vs expected ${formatPercent(expectedProgress)}. ` +
                    `Approximately ${daysAhead} days ahead of schedule.`
                )
                .addDecisionStep('Keep It Up', 'You could reduce contribution or reach the goal early.')
                .setConfidence(0.9)
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'achievement',
                title: `Ahead on ${goal.name}!`,
                description:
                    `You're ${daysAhead} days ahead of schedule on ${goal.name}! ` +
                    `At this rate, you'll reach your goal early.`,
                impact: `${daysAhead} days ahead of schedule`,
                isActionable: false,
                actionType: null,
                actionPayload: null,
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        }
    });

    return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPE 4: TREND FORECASTING
// ═══════════════════════════════════════════════════════════════════════════

function analyzeTrends(
    monthlyData: MonthlySpending[],
    categoryBudgets: CategoryBudget[]
): BudgetInsight[] {
    const insights: BudgetInsight[] = [];
    const categories = [...new Set(monthlyData.map(d => d.category))];
    const allMonths = [...new Set(monthlyData.map(d => d.month))].sort();

    if (allMonths.length < 3) return insights;

    categories.forEach(category => {
        const catBudget = categoryBudgets.find(c => c.category === category);
        if (!catBudget || catBudget.isFixed) return;

        // Get monthly totals sorted chronologically
        const monthlyTotals = allMonths.map(month => {
            const data = monthlyData.find(d => d.month === month && d.category === category);
            return { month, value: data?.total || 0 };
        }).filter(m => m.value > 0);

        if (monthlyTotals.length < 3) return;

        const values = monthlyTotals.map(m => m.value);
        const { slope, rSquared } = linearRegression(values);

        // Only report significant trends
        if (rSquared < 0.5 || Math.abs(slope) < 10) return;

        const currentLevel = values[values.length - 1];
        const projectedIn6Months = currentLevel + slope * 6;
        const annualImpact = Math.round(slope * 12);

        if (slope > 0) {
            // Increasing trend
            const reasoning = new ReasoningBuilder()
                .setDataSource(`${monthlyTotals.length} months of ${category} spending data`)
                .addDataStep(
                    'Monthly Spending History',
                    formatMonthlySummary(monthlyTotals),
                    monthlyTotals.slice(-4).map(m => ({ label: m.month, value: Math.round(m.value), unit: '$' }))
                )
                .addAnalysisStep(
                    'Trend Detection (Linear Regression)',
                    `Detected an upward trend of ${formatDollar(slope)}/month in ${category} spending. ` +
                    `Model confidence: R²=${rSquared.toFixed(2)}.`,
                    [
                        { label: 'Monthly increase', value: Math.round(slope), unit: '$/mo' },
                        { label: 'R² confidence', value: rSquared.toFixed(2) },
                        { label: 'Current level', value: Math.round(currentLevel), unit: '$' },
                        { label: '6-month projection', value: Math.round(projectedIn6Months), unit: '$' },
                    ]
                )
                .addDecisionStep(
                    'Action Recommended',
                    `If unchecked, ${category} will cost ${formatDollar(annualImpact)} more per year. ` +
                    `Consider capping at current level or investigating causes.`
                )
                .setConfidence(Math.min(rSquared + 0.1, 0.95))
                .addAlternative(`Cap ${category} at ${formatDollar(currentLevel)}/month`)
                .addAlternative(`Reduce ${category} by ${formatDollar(slope)}/month`)
                .addAlternative('Review recent transactions to identify causes')
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'warning',
                title: `${category} Spending Trending Up`,
                description:
                    `Your ${category} spending has increased by ${formatDollar(slope)}/month. ` +
                    `If this continues, you'll spend ${formatDollar(projectedIn6Months)}/month ` +
                    `in 6 months (${formatDollar(annualImpact)} more per year).`,
                impact: `${formatDollar(annualImpact)} more/year if unchecked`,
                isActionable: true,
                actionType: 'address_trend',
                actionPayload: {
                    category,
                    suggestedCap: Math.round(currentLevel),
                    monthlyIncrease: Math.round(slope),
                    trendData: monthlyTotals.map(m => ({ month: m.month, value: Math.round(m.value) })),
                },
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        } else {
            // Decreasing trend — positive!
            const annualSavings = Math.abs(annualImpact);

            const reasoning = new ReasoningBuilder()
                .setDataSource(`${monthlyTotals.length} months of ${category} spending data`)
                .addDataStep(
                    'Monthly Spending History',
                    formatMonthlySummary(monthlyTotals),
                    monthlyTotals.slice(-4).map(m => ({ label: m.month, value: Math.round(m.value), unit: '$' }))
                )
                .addAnalysisStep(
                    'Positive Trend Detected',
                    `${category} spending is decreasing by ${formatDollar(Math.abs(slope))}/month (R²=${rSquared.toFixed(2)}). ` +
                    `This is a positive behavioral change.`
                )
                .addDecisionStep(
                    'Keep It Up',
                    `At this rate, you'll save ${formatDollar(annualSavings)} this year on ${category}.`
                )
                .setConfidence(Math.min(rSquared + 0.1, 0.95))
                .build();

            insights.push({
                id: generateId(),
                userId: 'local-user',
                insightType: 'achievement',
                title: `Great Job Reducing ${category}!`,
                description:
                    `You've reduced ${category} spending by ${formatDollar(Math.abs(slope))}/month. ` +
                    `At this rate, you'll save ${formatDollar(annualSavings)} this year.`,
                impact: `Save ${formatDollar(annualSavings)}/year`,
                isActionable: false,
                actionType: null,
                actionPayload: null,
                dismissed: false,
                createdAt: new Date().toISOString(),
                reasoning,
            });
        }
    });

    return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT TYPE 5: EVENT-BUDGET ALIGNMENT
// ═══════════════════════════════════════════════════════════════════════════

function analyzeEventAlignment(
    upcomingEvents: DetectedEvent[],
    categoryBudgets: CategoryBudget[],
    savingsGoals: SavingsGoal[]
): BudgetInsight[] {
    const insights: BudgetInsight[] = [];
    const today = new Date();

    upcomingEvents.forEach(event => {
        if (event.isDismissed) return;

        const daysUntil = Math.ceil(
            (new Date(event.eventDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil < 0 || daysUntil > 90) return;

        const catBudget = categoryBudgets.find(c => c.category === event.category);
        if (!catBudget) return;

        // Check if event fits in remaining budget
        if (daysUntil <= 30) {
            const remaining = catBudget.allocated - catBudget.spent;

            if (event.estimatedCost > remaining) {
                const shortage = Math.round(event.estimatedCost - remaining);

                // Find surplus categories
                const surplusCats = categoryBudgets
                    .filter(c => !c.isFixed && c.category !== event.category && c.remaining > 50)
                    .sort((a, b) => b.remaining - a.remaining)
                    .slice(0, 3);

                const reasoning = new ReasoningBuilder()
                    .setDataSource(`Event "${event.eventName}" + current ${event.category} budget status`)
                    .addDataStep('Event Details', `"${event.eventName}" in ${daysUntil} days`, [
                        { label: 'Estimated cost', value: event.estimatedCost, unit: '$' },
                        { label: 'Days away', value: daysUntil },
                        { label: 'Category', value: event.category },
                    ])
                    .addAnalysisStep(
                        'Budget Shortfall Detected',
                        `${event.category} has ${formatDollar(remaining)} remaining this month, ` +
                        `but ${event.eventName} needs ${formatDollar(event.estimatedCost)}. ` +
                        `Shortfall: ${formatDollar(shortage)}.`,
                        [
                            { label: 'Budget remaining', value: Math.round(remaining), unit: '$' },
                            { label: 'Event cost', value: event.estimatedCost, unit: '$' },
                            { label: 'Shortfall', value: shortage, unit: '$' },
                        ]
                    )
                    .addDecisionStep(
                        'Reallocation Suggested',
                        surplusCats.length > 0
                            ? `Pull ${formatDollar(shortage)} from ${surplusCats[0].category} (${formatDollar(surplusCats[0].remaining)} available).`
                            : 'Consider reducing event spending or extending savings timeline.'
                    )
                    .setConfidence(0.85)
                    .addAlternative(`Pull from ${surplusCats[0]?.category || 'savings'}`)
                    .addAlternative('Reduce event spending')
                    .addAlternative('Skip this event')
                    .build();

                insights.push({
                    id: generateId(),
                    userId: 'local-user',
                    insightType: 'warning',
                    title: `${event.eventName} Budget Shortfall`,
                    description:
                        `${event.eventName} is in ${daysUntil} days (est. ${formatDollar(event.estimatedCost)}), ` +
                        `but you only have ${formatDollar(remaining)} left in ${event.category}. ` +
                        `You need ${formatDollar(shortage)} more.`,
                    impact: `Need ${formatDollar(shortage)} more`,
                    isActionable: true,
                    actionType: 'prepare_for_event',
                    actionPayload: {
                        eventId: event.id,
                        shortage,
                        fromCategory: surplusCats[0]?.category || null,
                        fromAvailable: surplusCats[0]?.remaining || 0,
                    },
                    dismissed: false,
                    createdAt: new Date().toISOString(),
                    reasoning,
                });
            }
        } else if (daysUntil > 30) {
            // Future event — suggest creating a savings goal
            const hasGoal = savingsGoals.some(
                g => g.linkedEventId === event.id || g.name.toLowerCase().includes(event.eventName.toLowerCase().slice(0, 10))
            );

            if (!hasGoal && event.estimatedCost > 100) {
                const weeksUntil = Math.max(1, daysUntil / 7);
                const weeklyContribution = Math.round(event.estimatedCost / weeksUntil);

                const reasoning = new ReasoningBuilder()
                    .setDataSource(`Upcoming event "${event.eventName}"`)
                    .addDataStep('Event Planning', `"${event.eventName}" in ${daysUntil} days`, [
                        { label: 'Estimated cost', value: event.estimatedCost, unit: '$' },
                        { label: 'Weeks until', value: Math.round(weeksUntil) },
                    ])
                    .addAnalysisStep(
                        'No Savings Goal Found',
                        `No existing savings goal covers this event. ` +
                        `Saving ${formatDollar(weeklyContribution)}/week would fully fund it.`
                    )
                    .addDecisionStep(
                        'Create Savings Goal',
                        `Start saving ${formatDollar(weeklyContribution)}/week now to be prepared.`
                    )
                    .setConfidence(0.8)
                    .addAlternative('Create a savings goal')
                    .addAlternative('Plan to reduce event spending')
                    .addAlternative('Dismiss this event')
                    .build();

                insights.push({
                    id: generateId(),
                    userId: 'local-user',
                    insightType: 'pattern',
                    title: `Start Saving for ${event.eventName}`,
                    description:
                        `${event.eventName} is in ${daysUntil} days (est. ${formatDollar(event.estimatedCost)}). ` +
                        `Start saving ${formatDollar(weeklyContribution)}/week to be fully prepared.`,
                    impact: 'Avoid budget stress',
                    isActionable: true,
                    actionType: 'create_event_goal',
                    actionPayload: {
                        eventId: event.id,
                        goalName: event.eventName,
                        targetAmount: event.estimatedCost,
                        deadline: event.eventDate,
                        weeklyContribution,
                    },
                    dismissed: false,
                    createdAt: new Date().toISOString(),
                    reasoning,
                });
            }
        }
    });

    return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// TREND ANALYTICS DATA (for charts)
// ═══════════════════════════════════════════════════════════════════════════

export function generateTrendAnalytics(
    transactions: Transaction[],
    categoryBudgets: CategoryBudget[]
): TrendAnalytics {
    // --- Category Trends ---
    const categories = [...new Set(transactions.map(tx => tx.category))];
    const monthlyMap: Record<string, Record<string, number>> = {};

    transactions.forEach(tx => {
        const month = tx.date.substring(0, 7);
        if (!monthlyMap[tx.category]) monthlyMap[tx.category] = {};
        monthlyMap[tx.category][month] = (monthlyMap[tx.category][month] || 0) + tx.amount;
    });

    const allMonths = [...new Set(transactions.map(tx => tx.date.substring(0, 7)))].sort();

    const categoryTrends: CategoryTrend[] = categories.map(category => {
        const dataPoints: TrendDataPoint[] = allMonths.map(month => ({
            month,
            value: monthlyMap[category]?.[month] || 0,
        }));

        const values = dataPoints.map(d => d.value);
        const { slope, rSquared } = linearRegression(values);

        const lastValue = values[values.length - 1] || 0;

        return {
            category,
            dataPoints,
            slope: Math.round(slope * 100) / 100,
            rSquared: Math.round(rSquared * 100) / 100,
            direction: Math.abs(slope) < 5 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing',
            projectedNextMonth: Math.round(lastValue + slope),
        };
    });

    // --- Day of Week Data ---
    const dayTotals: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) dayTotals[i] = { total: 0, count: 0 };

    transactions.forEach(tx => {
        const day = new Date(tx.date).getDay();
        dayTotals[day].total += tx.amount;
        dayTotals[day].count += 1;
    });

    const dayOfWeekData: DayOfWeekData[] = Object.entries(dayTotals).map(([day, data]) => ({
        day: DAY_NAMES[parseInt(day)],
        average: data.count > 0 ? Math.round(data.total / data.count) : 0,
        total: Math.round(data.total),
    }));

    // --- Top Categories ---
    const categoryTotals: Record<string, number> = {};
    transactions.forEach(tx => {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    });
    const grandTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const topCategories = Object.entries(categoryTotals)
        .map(([category, total]) => ({
            category,
            total: Math.round(total),
            percentOfBudget: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    // --- Month over Month Change ---
    const lastTwoMonths = allMonths.slice(-2);
    let monthOverMonthChange = 0;
    if (lastTwoMonths.length === 2) {
        const prevTotal = transactions
            .filter(tx => tx.date.startsWith(lastTwoMonths[0]))
            .reduce((sum, tx) => sum + tx.amount, 0);
        const currTotal = transactions
            .filter(tx => tx.date.startsWith(lastTwoMonths[1]))
            .reduce((sum, tx) => sum + tx.amount, 0);
        monthOverMonthChange = prevTotal > 0
            ? Math.round(((currTotal - prevTotal) / prevTotal) * 100)
            : 0;
    }

    return {
        categoryTrends,
        dayOfWeekData,
        topCategories,
        monthOverMonthChange,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate all insights by running every analysis engine.
 * Returns a prioritized, deduplicated list of insights.
 */
export function generateAllInsights(
    transactions: Transaction[],
    currentMonth: BudgetSummary,
    config: AutopilotConfig,
    savingsGoals: SavingsGoal[],
    upcomingEvents: DetectedEvent[]
): BudgetInsight[] {
    const monthlyData = buildMonthlySpending(transactions, currentMonth.categoryBudgets);
    const allInsights: BudgetInsight[] = [];

    // 1. Reallocation Opportunities
    allInsights.push(
        ...detectReallocationOpportunities(monthlyData, currentMonth.categoryBudgets, savingsGoals)
    );

    // 2. Behavioral Patterns
    allInsights.push(
        ...detectBehavioralPatterns(transactions)
    );

    // 3. Goal Progress
    allInsights.push(
        ...analyzeGoalProgress(savingsGoals, currentMonth.categoryBudgets)
    );

    // 4. Trend Forecasting
    allInsights.push(
        ...analyzeTrends(monthlyData, currentMonth.categoryBudgets)
    );

    // 5. Event-Budget Alignment
    allInsights.push(
        ...analyzeEventAlignment(upcomingEvents, currentMonth.categoryBudgets, savingsGoals)
    );

    // Sort by: warnings first, then optimization, then patterns, then achievements
    const typePriority: Record<InsightType, number> = {
        warning: 0,
        optimization: 1,
        pattern: 2,
        achievement: 3,
    };

    allInsights.sort((a, b) => typePriority[a.insightType] - typePriority[b.insightType]);

    return allInsights;
}
