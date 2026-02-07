// ============================================
// FINANCIAL TIME MACHINE ENGINE
// ============================================
// Enables counterfactual analysis: "What if I didn't make that purchase?"

import { MOCK_TRANSACTIONS } from './mock-data';

// ============================================
// TYPES
// ============================================

export interface FinancialEvent {
    id: string;
    type: 'TRANSACTION' | 'RECURRING' | 'BEHAVIOR_PATTERN' | 'INCOME' | 'SHOCK';
    date: string;
    amount: number;
    category: string;
    merchant: string;
    description: string;
    tags: ('habit' | 'one-off' | 'fixed' | 'discretionary')[];
    seriesId?: string; // For recurring/patterns
    originalTransaction?: any; // Reference to source
}

export interface MonthSnapshot {
    month: string; // "Jan 2026"
    monthIndex: number;
    income: number;
    expenses: number;
    savings: number;
    cumulativeBalance: number;
    events: FinancialEvent[];
}

export interface TimelineResult {
    months: MonthSnapshot[];
    netWorthToday: number;
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    goalProgress: number;
    riskScore: number;
    worstMonth: { month: string; deficit: number } | null;
    startingBalance: number;
}

export interface DeltaSummary {
    netWorthDelta: number;
    savingsDelta: number;
    goalTimeDelta: number; // months saved (positive = faster)
    riskDelta: number;
    expensesDelta: number;
    description: string;
    percentImprovement: number;
}

// Counterfactual operations
export type CounterfactualOp =
    | { type: 'REMOVE'; eventId: string; description?: string }
    | { type: 'REMOVE_SERIES'; seriesId: string; description?: string }
    | { type: 'REMOVE_CATEGORY_RANGE'; category: string; startDate: string; endDate: string; description?: string }
    | { type: 'SCALE'; eventId: string; factor: number; description?: string }
    | { type: 'SCALE_CATEGORY'; category: string; factor: number; description?: string }
    | { type: 'CAP'; category: string; monthlyLimit: number; description?: string }
    | { type: 'DELAY'; eventId: string; months: number; description?: string };

export interface RegretItem {
    rank: number;
    eventId: string;
    event: FinancialEvent;
    operation: CounterfactualOp;
    potentialSavings: number;
    goalTimeReduction: number; // months
    description: string;
    category: string;
}

// ============================================
// CONSTANTS
// ============================================

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHLY_INCOME = 9500; // Base monthly income
const STARTING_BALANCE = 5000;
const SAVINGS_GOAL = 50000;
const MONTHLY_GOAL_TARGET = 3000; // Target monthly savings

// Categories that are discretionary (can be "undone")
const DISCRETIONARY_CATEGORIES = ['Shopping', 'Entertainment', 'Food', 'Subscriptions', 'Coffee', 'Transport'];

// ============================================
// EVENT BUILDING
// ============================================

/**
 * Convert raw transactions into FinancialEvent objects
 */
export function buildEventsFromTransactions(
    transactions: typeof MOCK_TRANSACTIONS,
    startDate?: string,
    endDate?: string
): FinancialEvent[] {
    const start = startDate ? new Date(startDate) : new Date('2025-01-01');
    const end = endDate ? new Date(endDate) : new Date('2026-02-01');

    const events: FinancialEvent[] = [];

    transactions.forEach((tx, index) => {
        const txDate = new Date(tx.date);
        if (txDate < start || txDate > end) return;

        // Determine tags
        const tags: FinancialEvent['tags'] = [];

        if (DISCRETIONARY_CATEGORIES.includes(tx.category)) {
            tags.push('discretionary');
        } else {
            tags.push('fixed');
        }

        // Large one-off purchases
        if (tx.amount > 500 && !['Rent', 'Bills', 'Insurance'].includes(tx.category)) {
            tags.push('one-off');
        }

        // Regular habits
        if (['Food', 'Coffee', 'Transport', 'Groceries'].includes(tx.category)) {
            tags.push('habit');
        }

        events.push({
            id: tx.id || `tx-${index}-${tx.date}`,
            type: 'TRANSACTION',
            date: tx.date,
            amount: tx.amount,
            category: tx.category,
            merchant: tx.merchant || tx.category,
            description: `${tx.merchant || tx.category} - $${tx.amount.toFixed(2)}`,
            tags,
            originalTransaction: tx,
        });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Identify recurring expense series (rent, subscriptions, etc.)
 */
export function identifyRecurringSeries(events: FinancialEvent[]): Map<string, FinancialEvent[]> {
    const seriesMap = new Map<string, FinancialEvent[]>();

    // Group by merchant + approximate amount
    const merchantGroups = new Map<string, FinancialEvent[]>();

    events.forEach(event => {
        const key = `${event.merchant}-${Math.round(event.amount / 10) * 10}`;
        const group = merchantGroups.get(key) || [];
        group.push(event);
        merchantGroups.set(key, group);
    });

    // Series = same merchant, similar amount, monthly occurrence
    merchantGroups.forEach((group, key) => {
        if (group.length >= 3) {
            // Check if roughly monthly
            const dates = group.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
            const gaps = [];
            for (let i = 1; i < dates.length; i++) {
                gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
            }
            const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

            // If average gap is 25-35 days, it's monthly
            if (avgGap >= 25 && avgGap <= 35) {
                const seriesId = `series-${key}`;
                group.forEach(e => e.seriesId = seriesId);
                seriesMap.set(seriesId, group);
            }
        }
    });

    return seriesMap;
}

/**
 * Identify behavior patterns (spending habits by category)
 */
export function identifyBehaviorPatterns(events: FinancialEvent[]): Map<string, {
    category: string;
    avgMonthly: number;
    frequency: number;
    events: FinancialEvent[];
}> {
    const patterns = new Map<string, { category: string; avgMonthly: number; frequency: number; events: FinancialEvent[] }>();

    // Group by category
    const categoryEvents = new Map<string, FinancialEvent[]>();
    events.forEach(event => {
        const group = categoryEvents.get(event.category) || [];
        group.push(event);
        categoryEvents.set(event.category, group);
    });

    // Calculate patterns
    categoryEvents.forEach((catEvents, category) => {
        const total = catEvents.reduce((sum, e) => sum + e.amount, 0);
        const months = new Set(catEvents.map(e => e.date.substring(0, 7))).size;
        const avgMonthly = total / Math.max(months, 1);
        const frequency = catEvents.length / Math.max(months, 1);

        patterns.set(category, {
            category,
            avgMonthly: Math.round(avgMonthly),
            frequency: Math.round(frequency * 10) / 10,
            events: catEvents,
        });
    });

    return patterns;
}

// ============================================
// TIMELINE COMPUTATION
// ============================================

/**
 * Run baseline simulation from events
 */
export function runBaseline(
    events: FinancialEvent[],
    startingBalance: number = STARTING_BALANCE
): TimelineResult {
    // Group events by month
    const monthlyEvents = new Map<string, FinancialEvent[]>();

    events.forEach(event => {
        const date = new Date(event.date);
        const monthKey = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
        const group = monthlyEvents.get(monthKey) || [];
        group.push(event);
        monthlyEvents.set(monthKey, group);
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthlyEvents.keys()).sort((a, b) => {
        const parseMonth = (s: string) => {
            const [mon, year] = s.split(' ');
            return new Date(`${mon} 1, ${year}`).getTime();
        };
        return parseMonth(a) - parseMonth(b);
    });

    // Build timeline
    const months: MonthSnapshot[] = [];
    let cumulativeBalance = startingBalance;
    let worstMonth: { month: string; deficit: number } | null = null;
    let totalIncome = 0;
    let totalExpenses = 0;

    sortedMonths.forEach((monthKey, index) => {
        const monthEvents = monthlyEvents.get(monthKey) || [];
        const expenses = monthEvents.reduce((sum, e) => sum + e.amount, 0);
        const income = MONTHLY_INCOME;
        const savings = income - expenses;

        cumulativeBalance += savings;
        totalIncome += income;
        totalExpenses += expenses;

        // Track worst month
        if (savings < 0 && (!worstMonth || savings < worstMonth.deficit)) {
            worstMonth = { month: monthKey, deficit: savings };
        }

        months.push({
            month: monthKey,
            monthIndex: index,
            income,
            expenses: Math.round(expenses),
            savings: Math.round(savings),
            cumulativeBalance: Math.round(cumulativeBalance),
            events: monthEvents,
        });
    });

    // Calculate metrics
    const totalSavings = totalIncome - totalExpenses;
    const goalProgress = Math.min(100, (totalSavings / SAVINGS_GOAL) * 100);
    const negativeMonths = months.filter(m => m.savings < 0).length;
    const riskScore = Math.round((negativeMonths / Math.max(months.length, 1)) * 100);

    return {
        months,
        netWorthToday: Math.round(cumulativeBalance),
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        totalSavings: Math.round(totalSavings),
        goalProgress: Math.round(goalProgress),
        riskScore,
        worstMonth,
        startingBalance,
    };
}

/**
 * Apply counterfactual operations to events
 */
export function applyCounterfactual(
    events: FinancialEvent[],
    operations: CounterfactualOp[]
): FinancialEvent[] {
    let modifiedEvents = [...events];

    operations.forEach(op => {
        switch (op.type) {
            case 'REMOVE':
                modifiedEvents = modifiedEvents.filter(e => e.id !== op.eventId);
                break;

            case 'REMOVE_SERIES':
                modifiedEvents = modifiedEvents.filter(e => e.seriesId !== op.seriesId);
                break;

            case 'REMOVE_CATEGORY_RANGE':
                modifiedEvents = modifiedEvents.filter(e => {
                    if (e.category !== op.category) return true;
                    const eventDate = new Date(e.date);
                    const start = new Date(op.startDate);
                    const end = new Date(op.endDate);
                    return eventDate < start || eventDate > end;
                });
                break;

            case 'SCALE':
                modifiedEvents = modifiedEvents.map(e => {
                    if (e.id === op.eventId) {
                        return { ...e, amount: Math.round(e.amount * op.factor * 100) / 100 };
                    }
                    return e;
                });
                break;

            case 'SCALE_CATEGORY':
                modifiedEvents = modifiedEvents.map(e => {
                    if (e.category === op.category) {
                        return { ...e, amount: Math.round(e.amount * op.factor * 100) / 100 };
                    }
                    return e;
                });
                break;

            case 'CAP':
                // Group by month, then cap
                const monthlyTotals = new Map<string, number>();
                modifiedEvents.forEach(e => {
                    if (e.category === op.category) {
                        const monthKey = e.date.substring(0, 7);
                        const current = monthlyTotals.get(monthKey) || 0;
                        monthlyTotals.set(monthKey, current + e.amount);
                    }
                });

                // Apply proportional reduction if over cap
                modifiedEvents = modifiedEvents.map(e => {
                    if (e.category === op.category) {
                        const monthKey = e.date.substring(0, 7);
                        const total = monthlyTotals.get(monthKey) || 0;
                        if (total > op.monthlyLimit) {
                            const factor = op.monthlyLimit / total;
                            return { ...e, amount: Math.round(e.amount * factor * 100) / 100 };
                        }
                    }
                    return e;
                });
                break;

            case 'DELAY':
                modifiedEvents = modifiedEvents.map(e => {
                    if (e.id === op.eventId) {
                        const newDate = new Date(e.date);
                        newDate.setMonth(newDate.getMonth() + op.months);
                        return { ...e, date: newDate.toISOString().split('T')[0] };
                    }
                    return e;
                });
                break;
        }
    });

    return modifiedEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Run branch timeline with counterfactual operations
 */
export function runBranch(
    events: FinancialEvent[],
    operations: CounterfactualOp[],
    startingBalance: number = STARTING_BALANCE
): TimelineResult {
    const modifiedEvents = applyCounterfactual(events, operations);
    return runBaseline(modifiedEvents, startingBalance);
}

/**
 * Compute delta between baseline and branch
 */
export function computeDelta(baseline: TimelineResult, branch: TimelineResult): DeltaSummary {
    const netWorthDelta = branch.netWorthToday - baseline.netWorthToday;
    const savingsDelta = branch.totalSavings - baseline.totalSavings;
    const expensesDelta = branch.totalExpenses - baseline.totalExpenses;

    // Estimate goal time change (months saved)
    const monthlyTarget = MONTHLY_GOAL_TARGET;
    const baselineMonthsToGoal = baseline.totalSavings > 0 ? SAVINGS_GOAL / (baseline.totalSavings / baseline.months.length) : Infinity;
    const branchMonthsToGoal = branch.totalSavings > 0 ? SAVINGS_GOAL / (branch.totalSavings / branch.months.length) : Infinity;
    const goalTimeDelta = Math.round((baselineMonthsToGoal - branchMonthsToGoal) * 10) / 10;

    const riskDelta = branch.riskScore - baseline.riskScore;
    const percentImprovement = baseline.totalExpenses > 0
        ? Math.round((-expensesDelta / baseline.totalExpenses) * 100 * 10) / 10
        : 0;

    // Generate description
    let description = '';
    if (netWorthDelta > 0) {
        description = `You'd have $${netWorthDelta.toLocaleString()} more today`;
    } else if (netWorthDelta < 0) {
        description = `You'd have $${Math.abs(netWorthDelta).toLocaleString()} less today`;
    } else {
        description = 'No change to net worth';
    }

    if (goalTimeDelta > 0.5) {
        description += ` and reach your goal ${goalTimeDelta.toFixed(1)} months sooner`;
    }

    return {
        netWorthDelta,
        savingsDelta,
        goalTimeDelta,
        riskDelta,
        expensesDelta,
        description,
        percentImprovement,
    };
}

// ============================================
// REGRET ANALYSIS
// ============================================

/**
 * Find top "regret" decisions - events that would have the biggest impact if undone
 */
export function findTopRegrets(
    events: FinancialEvent[],
    baseline: TimelineResult,
    limit: number = 10
): RegretItem[] {
    const candidates: RegretItem[] = [];

    // Focus on discretionary, high-value events
    const discretionaryEvents = events.filter(e =>
        e.tags.includes('discretionary') || e.tags.includes('one-off')
    );

    // Also find recurring series that could be cancelled
    const series = identifyRecurringSeries(events);
    const patterns = identifyBehaviorPatterns(events);

    // Evaluate individual large transactions
    const largeEvents = discretionaryEvents
        .filter(e => e.amount > 100)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 20);

    largeEvents.forEach(event => {
        const op: CounterfactualOp = { type: 'REMOVE', eventId: event.id };
        const branch = runBranch(events, [op], baseline.startingBalance);
        const delta = computeDelta(baseline, branch);

        if (delta.netWorthDelta > 0) {
            candidates.push({
                rank: 0,
                eventId: event.id,
                event,
                operation: op,
                potentialSavings: delta.netWorthDelta,
                goalTimeReduction: delta.goalTimeDelta,
                description: `Undo "${event.merchant}" ($${event.amount.toFixed(0)})`,
                category: event.category,
            });
        }
    });

    // Evaluate category reductions (20% less on category X)
    patterns.forEach((pattern, category) => {
        if (DISCRETIONARY_CATEGORIES.includes(category) && pattern.avgMonthly > 100) {
            const op: CounterfactualOp = {
                type: 'SCALE_CATEGORY',
                category,
                factor: 0.8,
                description: `Reduce ${category} by 20%`
            };
            const branch = runBranch(events, [op], baseline.startingBalance);
            const delta = computeDelta(baseline, branch);

            if (delta.netWorthDelta > 0) {
                candidates.push({
                    rank: 0,
                    eventId: `cat-${category}`,
                    event: pattern.events[0],
                    operation: op,
                    potentialSavings: delta.netWorthDelta,
                    goalTimeReduction: delta.goalTimeDelta,
                    description: `Reduce ${category} by 20%`,
                    category,
                });
            }
        }
    });

    // Evaluate subscription cancellations
    series.forEach((seriesEvents, seriesId) => {
        if (seriesEvents.length > 2) {
            const totalCost = seriesEvents.reduce((sum, e) => sum + e.amount, 0);
            if (totalCost > 50) {
                const op: CounterfactualOp = {
                    type: 'REMOVE_SERIES',
                    seriesId,
                    description: `Cancel ${seriesEvents[0].merchant}`
                };
                const branch = runBranch(events, [op], baseline.startingBalance);
                const delta = computeDelta(baseline, branch);

                if (delta.netWorthDelta > 0) {
                    candidates.push({
                        rank: 0,
                        eventId: seriesId,
                        event: seriesEvents[0],
                        operation: op,
                        potentialSavings: delta.netWorthDelta,
                        goalTimeReduction: delta.goalTimeDelta,
                        description: `Cancel ${seriesEvents[0].merchant} subscription`,
                        category: seriesEvents[0].category,
                    });
                }
            }
        }
    });

    // Sort by potential savings and assign ranks
    candidates.sort((a, b) => b.potentialSavings - a.potentialSavings);

    return candidates.slice(0, limit).map((c, i) => ({
        ...c,
        rank: i + 1,
    }));
}

// ============================================
// HELPER EXPORTS
// ============================================

export function getDefaultDateRange(): { start: string; end: string } {
    const end = new Date('2026-02-01');
    const start = new Date('2025-08-01'); // 6 months
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

export function getTransactions() {
    return MOCK_TRANSACTIONS;
}

export { MOCK_TRANSACTIONS };
