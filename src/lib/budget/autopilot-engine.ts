/**
 * Autopilot Engine
 * 
 * Core budget calculation logic including:
 * - Income analysis from transaction history
 * - Fixed cost detection (recurring patterns)
 * - Discretionary pool allocation
 * - Priority-based savings targets
 */

import type {
    BudgetPriority,
    CategoryBudget,
    BudgetSummary,
    AutopilotConfig
} from '@/types/budget';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SAVINGS_RATES: Record<BudgetPriority, number> = {
    aggressive: 0.30,
    balanced: 0.20,
    lifestyle: 0.10,
};

const FIXED_CATEGORIES = ['Rent', 'Insurance', 'Utilities', 'Subscriptions'];

// Rent and Insurance are ALWAYS protected and can never be reduced or reallocated.
// These are enforced regardless of any user configuration.
export const ALWAYS_PROTECTED_CATEGORIES = ['Rent', 'Insurance'];

const WARNING_THRESHOLD = 0.75;
const DANGER_THRESHOLD = 0.95;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Transaction {
    amount: number;
    category: string;
    date: string;
    name: string;
}

interface Income {
    amount: number;
    date: string;
}

interface CategorySpending {
    category: string;
    total: number;
    transactions: Transaction[];
    monthlyAverage: number;
    variance: number;
    isFixed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// INCOME ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate average monthly income from income records
 * Uses conservative estimate (80th percentile) if income varies significantly
 */
export function calculateMonthlyIncome(incomeRecords: Income[]): number {
    if (incomeRecords.length === 0) return 0;

    // Group by month
    const monthlyTotals: Record<string, number> = {};

    incomeRecords.forEach(record => {
        const month = record.date.substring(0, 7); // YYYY-MM
        monthlyTotals[month] = (monthlyTotals[month] || 0) + record.amount;
    });

    const values = Object.values(monthlyTotals);
    if (values.length === 0) return 0;

    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Check variance
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / average;

    // If income varies >20%, use 80th percentile (conservative)
    if (coefficientOfVariation > 0.2) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * 0.8);
        return sorted[index];
    }

    return average;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPENDING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze spending by category with variance calculation
 */
export function analyzeSpendingByCategory(
    transactions: Transaction[],
    monthsOfData: number = 6
): CategorySpending[] {
    // Group transactions by category
    const categoryMap: Record<string, Transaction[]> = {};

    transactions.forEach(tx => {
        if (!categoryMap[tx.category]) {
            categoryMap[tx.category] = [];
        }
        categoryMap[tx.category].push(tx);
    });

    // Calculate stats for each category
    return Object.entries(categoryMap).map(([category, txs]) => {
        const total = txs.reduce((sum, tx) => sum + tx.amount, 0);

        // Group by month for variance calculation
        const monthlyTotals: Record<string, number> = {};
        txs.forEach(tx => {
            const month = tx.date.substring(0, 7);
            monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amount;
        });

        const monthlyValues = Object.values(monthlyTotals);
        const monthlyAverage = monthlyValues.length > 0
            ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
            : 0;

        // Calculate variance
        const variance = monthlyValues.length > 1
            ? monthlyValues.reduce((sum, val) => sum + Math.pow(val - monthlyAverage, 2), 0) / monthlyValues.length
            : 0;

        // Determine if fixed (low variance, in fixed categories)
        const isFixed = FIXED_CATEGORIES.includes(category) ||
            (variance < monthlyAverage * 0.1 && monthlyAverage > 0);

        return {
            category,
            total,
            transactions: txs,
            monthlyAverage,
            variance,
            isFixed,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate budget allocations based on priority and spending patterns
 */
export function calculateBudgetAllocations(
    monthlyIncome: number,
    categorySpending: CategorySpending[],
    priority: BudgetPriority,
    nonNegotiableCategories: string[]
): CategoryBudget[] {
    const savingsRate = SAVINGS_RATES[priority];

    // Merge user non-negotiables with always-protected categories
    const allProtected = Array.from(new Set([
        ...ALWAYS_PROTECTED_CATEGORIES,
        ...nonNegotiableCategories,
    ]));

    // Calculate fixed costs
    const fixedCosts = categorySpending
        .filter(c => c.isFixed || allProtected.includes(c.category))
        .reduce((sum, c) => sum + c.monthlyAverage, 0);

    // Calculate discretionary pool
    const discretionaryPool = monthlyIncome - fixedCosts;
    const savingsTarget = discretionaryPool * savingsRate;
    const spendingPool = discretionaryPool - savingsTarget;

    // Get total discretionary spending for ratio calculation
    const discretionarySpending = categorySpending
        .filter(c => !c.isFixed && !allProtected.includes(c.category))
        .reduce((sum, c) => sum + c.monthlyAverage, 0);

    // Allocate to each category
    return categorySpending.map(cs => {
        let allocated: number;

        if (cs.isFixed || allProtected.includes(cs.category)) {
            // Fixed categories get their average (no reduction)
            allocated = cs.monthlyAverage;
        } else if (discretionarySpending > 0) {
            // Discretionary categories get proportional share
            const ratio = cs.monthlyAverage / discretionarySpending;
            allocated = spendingPool * ratio;

            // Add buffer for high-variance categories
            if (cs.variance > cs.monthlyAverage * 0.3) {
                allocated *= 1.1; // 10% buffer
            }
        } else {
            allocated = 0;
        }

        const spent = 0; // Will be filled with current month data
        const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

        return {
            category: cs.category,
            allocated: Math.round(allocated * 100) / 100,
            spent,
            remaining: allocated,
            percentUsed,
            isFixed: cs.isFixed || allProtected.includes(cs.category),
            status: 'healthy' as const,
        };
    });
}

/**
 * Update category budgets with current spending
 */
export function updateBudgetWithSpending(
    budgets: CategoryBudget[],
    currentMonthTransactions: Transaction[]
): CategoryBudget[] {
    // Calculate current month spending by category
    const spendingByCategory: Record<string, number> = {};

    currentMonthTransactions.forEach(tx => {
        spendingByCategory[tx.category] = (spendingByCategory[tx.category] || 0) + tx.amount;
    });

    return budgets.map(budget => {
        const spent = spendingByCategory[budget.category] || 0;
        const remaining = budget.allocated - spent;
        const percentUsed = budget.allocated > 0 ? (spent / budget.allocated) * 100 : 0;

        let status: 'healthy' | 'warning' | 'danger';
        if (percentUsed >= DANGER_THRESHOLD * 100) {
            status = 'danger';
        } else if (percentUsed >= WARNING_THRESHOLD * 100) {
            status = 'warning';
        } else {
            status = 'healthy';
        }

        return {
            ...budget,
            spent: Math.round(spent * 100) / 100,
            remaining: Math.round(remaining * 100) / 100,
            percentUsed: Math.round(percentUsed * 10) / 10,
            status,
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate complete budget summary for a month
 */
export function generateBudgetSummary(
    config: AutopilotConfig,
    categoryBudgets: CategoryBudget[],
    accountBalance: number,
    upcomingBills: number
): BudgetSummary {
    const now = new Date();
    const month = now.toISOString().substring(0, 7);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate();

    const totalBudget = categoryBudgets.reduce((sum, c) => sum + c.allocated, 0);
    const totalSpent = categoryBudgets.reduce((sum, c) => sum + c.spent, 0);
    const fixedCosts = categoryBudgets
        .filter(c => c.isFixed)
        .reduce((sum, c) => sum + c.allocated, 0);

    const savingsTarget = config.monthlyIncome * (config.savingsTargetPercentage / 100);
    const savingsActual = config.monthlyIncome - totalSpent - fixedCosts;

    // Calculate safe to spend
    const budgetRemaining = totalBudget - totalSpent;
    const dailyBudget = daysRemaining > 0 ? budgetRemaining / daysRemaining : 0;
    const safeToSpend = Math.max(0,
        accountBalance - upcomingBills - dailyBudget
    );

    return {
        month,
        totalIncome: config.monthlyIncome,
        fixedCosts,
        savingsTarget,
        savingsActual: Math.max(0, savingsActual),
        totalBudget,
        totalSpent,
        safeToSpend: Math.round(safeToSpend * 100) / 100,
        daysRemaining,
        categoryBudgets,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize budget system for a new user
 */
export async function initializeBudget(
    transactions: Transaction[],
    incomeRecords: Income[],
    priority: BudgetPriority,
    nonNegotiableCategories: string[]
): Promise<{
    config: Omit<AutopilotConfig, 'userId' | 'activatedAt' | 'updatedAt'>;
    categoryBudgets: CategoryBudget[];
}> {
    // Always enforce Rent and Insurance as protected
    const enforced = Array.from(new Set([
        ...ALWAYS_PROTECTED_CATEGORIES,
        ...nonNegotiableCategories,
    ]));

    // Calculate monthly income
    const monthlyIncome = calculateMonthlyIncome(incomeRecords);

    // Analyze spending patterns
    const categorySpending = analyzeSpendingByCategory(transactions);

    // Calculate budget allocations
    const categoryBudgets = calculateBudgetAllocations(
        monthlyIncome,
        categorySpending,
        priority,
        enforced
    );

    const config = {
        priority,
        autoAdjustEnabled: true,
        nonNegotiableCategories: enforced,
        monthlyIncome,
        savingsTargetPercentage: SAVINGS_RATES[priority] * 100,
    };

    return { config, categoryBudgets };
}
