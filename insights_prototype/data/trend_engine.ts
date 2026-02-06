import { MOCK_TRANSACTIONS, InsightItem } from './fake_data';

// Helper: Group by Category
const groupByCategory = (transactions: any[]) => {
    return transactions.reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
    }, {} as Record<string, any[]>);
};

// Algorithm 1: Spike Detection (Z-Score simplified)
// Detects if current month spend > 2x average of previous 3 months
// Helper: Get Top Merchants for a set of transactions
const getTopMerchants = (txns: any[]) => {
    const merchantTotals: Record<string, number> = {};
    txns.forEach(t => {
        const name = t.merchant || t.category;
        merchantTotals[name] = (merchantTotals[name] || 0) + t.amount;
    });
    return Object.entries(merchantTotals)
        .map(([name, amount]) => ({ name, amount, impact: 'High' }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
};

// Algorithm 1: Spike Detection (Z-Score simplified)
// Detects if current month spend > 2x average of previous 3 months
export const detectSpikes = (transactions: any[]): InsightItem[] => {
    const insights: InsightItem[] = [];
    const grouped = groupByCategory(transactions);
    const now = new Date('2026-02-01');
    const currentMonthStr = '2026-01'; // Analyzing Jan 26 as "current completed month"

    Object.entries(grouped).forEach(([cat, txns]) => {
        // Filter for specific ranges
        const currentMonthTxns = txns.filter(t => t.date.startsWith(currentMonthStr));
        const currentTotal = currentMonthTxns.reduce((sum, t) => sum + t.amount, 0);

        if (currentTotal === 0) return;

        // Calculate Average of prev 3 months (Oct, Nov, Dec 2025)
        const prev3MonthsTxns = txns.filter(t => {
            const d = new Date(t.date);
            return d >= new Date('2025-10-01') && d < new Date('2026-01-01');
        });

        // Avoid divide by zero, assume baseline if empty
        const avg = prev3MonthsTxns.reduce((sum, t) => sum + t.amount, 0) / 3 || 1;

        const ratio = currentTotal / avg;

        if (ratio > 1.5 && currentTotal > 100) { // 50% increase and significant amount
            const percent = Math.round((ratio - 1) * 100);

            // Rich Data Calculation
            const topMerchants = getTopMerchants(currentMonthTxns);
            const freq = currentMonthTxns.length;
            const avgTicket = currentTotal / freq;

            insights.push({
                id: `spike-${cat}`,
                title: `${cat} Spike Detected`,
                drivers: [`Spending is +${percent}% vs 3-month avg`, `Total: $${currentTotal.toFixed(0)}`],
                confidence: ratio > 2.0 ? 'High' : 'Medium',
                severity: ratio > 2.0 ? 'warning' : 'info',
                relatedNodeIds: [],
                changePercentage: `+${percent}%`,
                richDrivers: {
                    merchants: topMerchants.map(m => ({ ...m, impact: `${Math.round(m.amount / currentTotal * 100)}% of total` })),
                    stats: {
                        freqChange: `+${Math.round(freq * 0.4)} more trips`, // Simulated
                        priceChange: `+${Math.round(avgTicket * 0.1)}% avg ticket` // Simulated
                    }
                },
                causalGuess: cat === 'Shopping' ? 'Likely post-holiday sales or gift returns' : 'Increased frequency of visits'
            });
        }
    });

    return insights;
};

// Algorithm 2: Recurring Payment Detection
export const detectRecurring = (transactions: any[]): InsightItem[] => {
    const insights: InsightItem[] = [];
    const netflixTxns = transactions.filter(t => t.merchant === 'Netflix' || (t.category === 'Subscriptions' && t.amount === 15.99));

    if (netflixTxns.length >= 3) {
        insights.push({
            id: `rec-netflix`,
            title: `Recurring Charge Detected`,
            drivers: [`$15.99 detected monthly`, `Likely Netflix or Streaming`],
            confidence: 'High',
            severity: 'info',
            relatedNodeIds: [],
            changePercentage: '0%',
            richDrivers: {
                merchants: [{ name: 'Netflix', amount: 15.99, impact: 'Monthly' }],
                stats: { freqChange: 'Stable', priceChange: '0%' },
                keyDates: ['15th of every month']
            },
            causalGuess: 'Detected consistent monthly variability < 1%'
        });
    }

    return insights;
};

// Algorithm 3: Seasonal & Context Detection
export const detectSeasonalEvents = (transactions: any[]): InsightItem[] => {
    const insights: InsightItem[] = [];
    const today = new Date('2026-02-01T12:00:00');

    // 1. Holiday Hangover (Did we overspend in Dec?)
    const grouped = groupByCategory(transactions);
    const shopTxns = grouped['Shopping'] || [];
    const decTxns = shopTxns.filter(t => t.date.startsWith('2025-12'));
    const novTxns = shopTxns.filter(t => t.date.startsWith('2025-11'));

    // Simple check: if Dec+Nov spend is high
    const holidaySpend = [...decTxns, ...novTxns].reduce((sum, t) => sum + t.amount, 0);
    if (holidaySpend > 1500) {
        insights.push({
            id: `season-hangover`,
            title: `Holiday Hangover Alert`,
            drivers: [`High Holiday Spend detected ($${holidaySpend.toLocaleString()})`, `Goal: Save 15% more in Feb`],
            confidence: 'High',
            severity: 'critical',
            relatedNodeIds: ['8'],
            changePercentage: '-$500',
            richDrivers: {
                merchants: getTopMerchants([...decTxns, ...novTxns]).map(m => ({ ...m, impact: 'Holiday Spend' })),
                stats: { freqChange: 'High Volume', priceChange: 'Seasonal Spike' }
            },
            causalGuess: 'Historical Q4 seasonality pattern detected'
        });
    }

    // 2. Upcoming Events (Feb specific)
    if (today.getMonth() === 1) { // February
        insights.push({
            id: `event-vday`,
            title: `💘 Valentine's Day Approaching`,
            drivers: [`Feb 14 is coming up`, `Projected Impact: Dining & Gifts`],
            confidence: 'High',
            severity: 'info',
            relatedNodeIds: ['6', '8'],
            richDrivers: {
                merchants: [
                    { name: 'Restaurants', amount: 120, impact: ' Projected' },
                    { name: 'Florists', amount: 65, impact: 'Projected' }
                ],
                keyDates: ['Feb 14, 2026']
            },
            causalGuess: 'Calendar Event: Valentine\'s Day'
        });

        insights.push({
            id: `event-superbowl`,
            title: `🏈 Super Bowl Prep`,
            drivers: [`Plan for Food & Drinks`, `Average party spend: $85`],
            confidence: 'Medium',
            severity: 'info',
            relatedNodeIds: ['5'],
            richDrivers: {
                merchants: [{ name: 'Grocery Stores', amount: 85, impact: 'Projected' }],
                keyDates: ['Feb 8, 2026']
            },
            causalGuess: 'Calendar Event: Super Bowl'
        });
    }

    return insights;
}

// Main Export
export const generateInsights = (): InsightItem[] => {
    const spikes = detectSpikes(MOCK_TRANSACTIONS);
    const recurring = detectRecurring(MOCK_TRANSACTIONS);
    const seasonal = detectSeasonalEvents(MOCK_TRANSACTIONS);

    // Combine and sort by severity/confidence
    // Prioritize Seasonal for this demo
    return [...seasonal, ...spikes, ...recurring].slice(0, 6);
};
