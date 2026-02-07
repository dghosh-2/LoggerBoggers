import { MOCK_TRANSACTIONS } from './fake_data';

// ============================================
// SIMULATION ENGINE
// Algorithms for budget tracking and spending reduction scenarios
// ============================================

export interface ReductionSimulation {
    category: string;
    currentSpend: number;
    reductionPercent: number;
    newSpend: number;
    monthlySavings: number;
    annualSavings: number;
    percentOfTotalBudget: number;
}

export interface BudgetTracking {
    category: string;
    budgetAmount: number;
    currentSpend: number;
    remaining: number;
    daysInMonth: number;
    daysElapsed: number;
    dailyBurnRate: number;
    projectedEndSpend: number;
    variance: number;
    status: 'safe' | 'warning' | 'critical' | 'over';
    variancePercent: number;
}

/**
 * Simulate the impact of reducing spending in a category by a percentage
 */
export function simulateReduction(
    category: string,
    currentSpend: number,
    reductionPercent: number = 10,
    totalMonthlyBudget: number = 5000 // Default assumption
): ReductionSimulation {
    const newSpend = currentSpend * (1 - reductionPercent / 100);
    const monthlySavings = currentSpend - newSpend;
    const annualSavings = monthlySavings * 12;
    const percentOfTotalBudget = (monthlySavings / totalMonthlyBudget) * 100;

    return {
        category,
        currentSpend,
        reductionPercent,
        newSpend: Math.round(newSpend * 100) / 100,
        monthlySavings: Math.round(monthlySavings * 100) / 100,
        annualSavings: Math.round(annualSavings * 100) / 100,
        percentOfTotalBudget: Math.round(percentOfTotalBudget * 100) / 100,
    };
}

/**
 * Calculate budget tracking status for a category
 */
export function calculateBudgetTracking(
    category: string,
    budgetAmount: number,
    year: number = 2026,
    month: number = 1 // 0-indexed
): BudgetTracking {
    const today = new Date('2026-02-05'); // Mock current date
    const targetMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate days elapsed (for current month) or use full month for past
    let daysElapsed = daysInMonth;
    if (targetMonth.getMonth() === today.getMonth() && targetMonth.getFullYear() === today.getFullYear()) {
        daysElapsed = today.getDate();
    } else if (targetMonth > today) {
        daysElapsed = 0; // Future month
    }

    // Get actual spending for this category in target month
    const monthTransactions = MOCK_TRANSACTIONS.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year && t.category === category;
    });

    const currentSpend = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const remaining = budgetAmount - currentSpend;

    // Calculate burn rate and projection
    const dailyBurnRate = daysElapsed > 0 ? currentSpend / daysElapsed : 0;
    const projectedEndSpend = dailyBurnRate * daysInMonth;
    const variance = budgetAmount - projectedEndSpend;
    const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

    // Determine status
    let status: 'safe' | 'warning' | 'critical' | 'over';
    if (currentSpend > budgetAmount) {
        status = 'over';
    } else if (projectedEndSpend > budgetAmount * 1.1) {
        status = 'critical'; // Projected to go 10%+ over
    } else if (projectedEndSpend > budgetAmount) {
        status = 'warning'; // Projected to go over
    } else {
        status = 'safe';
    }

    return {
        category,
        budgetAmount,
        currentSpend: Math.round(currentSpend * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        daysInMonth,
        daysElapsed,
        dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
        projectedEndSpend: Math.round(projectedEndSpend * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status,
    };
}

/**
 * Project annual impact of a spending change across all categories
 */
export function projectAnnualImpact(
    categoryChanges: Record<string, number> // category -> % reduction
): {
    totalAnnualSavings: number;
    categoryBreakdown: Array<{ category: string; savings: number }>;
} {
    const breakdown: Array<{ category: string; savings: number }> = [];
    let totalAnnualSavings = 0;

    // Calculate current monthly spend per category
    const now = new Date('2026-02-05');
    const currentMonthTxns = MOCK_TRANSACTIONS.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const categorySpend: Record<string, number> = {};
    currentMonthTxns.forEach(t => {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
    });

    // Apply reductions and calculate savings
    Object.keys(categoryChanges).forEach(cat => {
        const currentSpend = categorySpend[cat] || 0;
        const reductionPercent = categoryChanges[cat];
        const monthlySavings = currentSpend * (reductionPercent / 100);
        const annualSavings = monthlySavings * 12;

        breakdown.push({ category: cat, savings: Math.round(annualSavings * 100) / 100 });
        totalAnnualSavings += annualSavings;
    });

    return {
        totalAnnualSavings: Math.round(totalAnnualSavings * 100) / 100,
        categoryBreakdown: breakdown,
    };
}
