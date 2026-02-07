/**
 * Spending Analyzer
 * 
 * Detects patterns in spending behavior:
 * - Day-of-week patterns (weekend vs weekday)
 * - Time-of-month patterns (post-payday spikes)
 * - Seasonal patterns
 * - Impulse purchase detection
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Transaction {
    amount: number;
    category: string;
    date: string;
    name: string;
}

export interface SpendingPattern {
    type: 'day-of-week' | 'time-of-month' | 'seasonal' | 'impulse';
    description: string;
    category: string | null;
    metric: number; // Percentage or multiplier
    insight: string;
    savingsOpportunity: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DAY OF WEEK ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze spending patterns by day of week
 */
export function analyzeDayOfWeekPatterns(transactions: Transaction[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Group spending by day of week
    const daySpending: Record<number, number[]> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], // Sun-Sat
    };

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const day = date.getDay();
        daySpending[day].push(tx.amount);
    });

    // Calculate averages
    const dayAverages = Object.entries(daySpending).map(([day, amounts]) => ({
        day: parseInt(day),
        average: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
        total: amounts.reduce((a, b) => a + b, 0),
        count: amounts.length,
    }));

    const overallAverage = dayAverages.reduce((sum, d) => sum + d.average, 0) / 7;

    // Check for weekend vs weekday pattern
    const weekdayAvg = dayAverages
        .filter(d => d.day >= 1 && d.day <= 5)
        .reduce((sum, d) => sum + d.average, 0) / 5;

    const weekendAvg = dayAverages
        .filter(d => d.day === 0 || d.day === 6)
        .reduce((sum, d) => sum + d.average, 0) / 2;

    if (weekendAvg > weekdayAvg * 1.3) {
        const weekendMultiplier = Math.round((weekendAvg / weekdayAvg) * 100) / 100;
        const extraWeekendSpending = (weekendAvg - weekdayAvg) * 8; // 8 weekends per month

        patterns.push({
            type: 'day-of-week',
            description: `Weekend spending is ${weekendMultiplier}x higher than weekdays`,
            category: null,
            metric: weekendMultiplier,
            insight: `Your spending spikes ${Math.round((weekendMultiplier - 1) * 100)}% on weekends. Consider meal prepping on Fridays or setting a weekend budget.`,
            savingsOpportunity: Math.round(extraWeekendSpending * 0.3), // 30% reduction potential
        });
    }

    // Check for specific high-spending days by category
    const categoryDaySpending: Record<string, Record<number, number>> = {};

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const day = date.getDay();

        if (!categoryDaySpending[tx.category]) {
            categoryDaySpending[tx.category] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        }
        categoryDaySpending[tx.category][day] += tx.amount;
    });

    Object.entries(categoryDaySpending).forEach(([category, daySums]) => {
        const values = Object.values(daySums);
        const avg = values.reduce((a, b) => a + b, 0) / 7;
        const max = Math.max(...values);
        const maxDay = Object.entries(daySums).find(([, v]) => v === max)?.[0];

        if (max > avg * 1.5 && maxDay) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            patterns.push({
                type: 'day-of-week',
                description: `${category} spending peaks on ${dayNames[parseInt(maxDay)]}s`,
                category,
                metric: Math.round((max / avg) * 100) / 100,
                insight: `Your ${category} spending is ${Math.round((max / avg - 1) * 100)}% higher on ${dayNames[parseInt(maxDay)]}s.`,
                savingsOpportunity: Math.round((max - avg) * 0.25),
            });
        }
    });

    return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIME OF MONTH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze spending patterns by time of month (post-payday effect)
 */
export function analyzeTimeOfMonthPatterns(transactions: Transaction[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Divide month into quarters
    const quarterSpending: Record<number, number[]> = {
        1: [], // Days 1-7
        2: [], // Days 8-14
        3: [], // Days 15-21
        4: [], // Days 22-31
    };

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const dayOfMonth = date.getDate();

        let quarter: number;
        if (dayOfMonth <= 7) quarter = 1;
        else if (dayOfMonth <= 14) quarter = 2;
        else if (dayOfMonth <= 21) quarter = 3;
        else quarter = 4;

        quarterSpending[quarter].push(tx.amount);
    });

    const quarterAverages = Object.entries(quarterSpending).map(([q, amounts]) => ({
        quarter: parseInt(q),
        average: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
        total: amounts.reduce((a, b) => a + b, 0),
    }));

    const overallAverage = quarterAverages.reduce((sum, q) => sum + q.average, 0) / 4;

    // Check for post-payday spike (assuming 1st and 15th are common paydays)
    const earlyMonthAvg = quarterAverages[0].average;
    const lateMonthAvg = quarterAverages[3].average;

    if (earlyMonthAvg > overallAverage * 1.25) {
        const spikeMultiplier = Math.round((earlyMonthAvg / overallAverage) * 100) / 100;

        patterns.push({
            type: 'time-of-month',
            description: `Spending spikes ${Math.round((spikeMultiplier - 1) * 100)}% in the first week of the month`,
            category: null,
            metric: spikeMultiplier,
            insight: 'You spend more right after payday. Consider waiting 48 hours before non-essential purchases.',
            savingsOpportunity: Math.round((earlyMonthAvg - overallAverage) * 4 * 0.3),
        });
    }

    // Check for mid-month spike (15th payday pattern)
    const midMonthAvg = quarterAverages[2].average;
    if (midMonthAvg > overallAverage * 1.2) {
        patterns.push({
            type: 'time-of-month',
            description: `Mid-month spending increase detected`,
            category: null,
            metric: Math.round((midMonthAvg / overallAverage) * 100) / 100,
            insight: 'Your spending picks up mid-month. This might indicate a second payday effect.',
            savingsOpportunity: Math.round((midMonthAvg - overallAverage) * 4 * 0.2),
        });
    }

    return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPULSE PURCHASE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect potential impulse purchases
 * Looks for transactions significantly above category median
 */
export function detectImpulsePurchases(transactions: Transaction[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Group by category
    const categoryTransactions: Record<string, number[]> = {};

    transactions.forEach(tx => {
        if (!categoryTransactions[tx.category]) {
            categoryTransactions[tx.category] = [];
        }
        categoryTransactions[tx.category].push(tx.amount);
    });

    Object.entries(categoryTransactions).forEach(([category, amounts]) => {
        if (amounts.length < 10) return; // Need enough data

        // Calculate median and std dev
        const sorted = [...amounts].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        // Find outliers (>2.5 std dev above median)
        const outliers = amounts.filter(a => a > median + 2.5 * stdDev);

        if (outliers.length > 0) {
            const outlierTotal = outliers.reduce((a, b) => a + b, 0);
            const outlierPercentage = (outliers.length / amounts.length) * 100;

            patterns.push({
                type: 'impulse',
                description: `${outliers.length} potential impulse purchases detected in ${category}`,
                category,
                metric: outlierPercentage,
                insight: `${Math.round(outlierPercentage)}% of your ${category} transactions are significantly above your typical spending. These may be impulse purchases.`,
                savingsOpportunity: Math.round(outlierTotal * 0.5), // Assume 50% could be avoided
            });
        }
    });

    return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEASONAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect seasonal spending patterns
 */
export function analyzeSeasonalPatterns(transactions: Transaction[]): SpendingPattern[] {
    const patterns: SpendingPattern[] = [];

    // Group by month
    const monthSpending: Record<number, number> = {};
    const monthCounts: Record<number, number> = {};

    transactions.forEach(tx => {
        const month = new Date(tx.date).getMonth();
        monthSpending[month] = (monthSpending[month] || 0) + tx.amount;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const monthlyAverages = Object.entries(monthSpending).map(([m, total]) => ({
        month: parseInt(m),
        average: total / (monthCounts[parseInt(m)] || 1),
    }));

    const overallAverage = monthlyAverages.reduce((sum, m) => sum + m.average, 0) /
        (monthlyAverages.length || 1);

    // Holiday season (Nov-Dec)
    const holidayAvg = monthlyAverages
        .filter(m => m.month === 10 || m.month === 11)
        .reduce((sum, m) => sum + m.average, 0) / 2;

    if (holidayAvg > overallAverage * 1.4) {
        patterns.push({
            type: 'seasonal',
            description: `Holiday season spending is ${Math.round((holidayAvg / overallAverage) * 100 - 100)}% above average`,
            category: null,
            metric: Math.round((holidayAvg / overallAverage) * 100) / 100,
            insight: 'Your spending increases significantly during the holiday season. Start saving in September to avoid financial stress.',
            savingsOpportunity: Math.round((holidayAvg - overallAverage) * 2 * 0.2),
        });
    }

    // Summer (Jun-Aug)
    const summerAvg = monthlyAverages
        .filter(m => m.month >= 5 && m.month <= 7)
        .reduce((sum, m) => sum + m.average, 0) / 3;

    if (summerAvg > overallAverage * 1.25) {
        patterns.push({
            type: 'seasonal',
            description: `Summer spending is ${Math.round((summerAvg / overallAverage) * 100 - 100)}% above average`,
            category: null,
            metric: Math.round((summerAvg / overallAverage) * 100) / 100,
            insight: 'You spend more during summer months. Plan ahead for vacations and activities.',
            savingsOpportunity: Math.round((summerAvg - overallAverage) * 3 * 0.15),
        });
    }

    return patterns;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all spending pattern analyses
 */
export function analyzeAllSpendingPatterns(transactions: Transaction[]): SpendingPattern[] {
    const allPatterns: SpendingPattern[] = [];

    allPatterns.push(...analyzeDayOfWeekPatterns(transactions));
    allPatterns.push(...analyzeTimeOfMonthPatterns(transactions));
    allPatterns.push(...detectImpulsePurchases(transactions));
    allPatterns.push(...analyzeSeasonalPatterns(transactions));

    // Sort by savings opportunity (highest first)
    allPatterns.sort((a, b) => b.savingsOpportunity - a.savingsOpportunity);

    return allPatterns;
}

/**
 * Get top insights from spending patterns
 */
export function getTopSpendingInsights(
    patterns: SpendingPattern[],
    limit: number = 5
): SpendingPattern[] {
    return patterns.slice(0, limit);
}
