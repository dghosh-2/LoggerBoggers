import { MOCK_TRANSACTIONS } from './mock-data';

export interface ProjectionResult {
    total: number;
    breakdown: {
        fixed: number;
        variable: number;
        events: number;
    };
    isFuture: boolean;
    confidence: 'High' | 'Medium' | 'Low';
    drivers: string[];
    detailedDrivers?: {
        name: string;
        amount: number;
        type: 'actual' | 'projected';
    }[];
}

// Fixed costs based on our mock data (Rent, Subs, Bills)
const FIXED_ITEMS = [
    { cat: 'Rent', amount: 2450 },
    { cat: 'Subscriptions', amount: 15.99 + 12 }, // Netflix + Spotify
    { cat: 'Bills', amount: 80 + 45 }, // Internet + Phone
];

// Helper to get average spend for a category over last 3 months
const getAvgCategorySpend = (category: string, refDate: Date): number => {
    let total = 0;
    let count = 0;

    // Scan previous 3 months
    for (let i = 1; i <= 3; i++) {
        const d = new Date(refDate);
        d.setMonth(d.getMonth() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${yyyy}-${mm}`;

        const monthTxns = MOCK_TRANSACTIONS.filter(t => t.date.startsWith(monthPrefix) && t.category === category);
        if (monthTxns.length > 0) {
            total += monthTxns.reduce((sum, t) => sum + t.amount, 0);
            count++;
        }
    }

    return count > 0 ? total / count : 0;
};

export const calculateMonthlyProjection = (
    year: number,
    monthIdx: number,
    reductionGoals?: Record<string, number> // category -> reduction %
): ProjectionResult => {
    const today = new Date('2026-02-01'); // Mock Today
    const targetDate = new Date(year, monthIdx, 1);

    // Check if Future
    const isFuture = targetDate > today || (targetDate.getMonth() === today.getMonth() && targetDate.getFullYear() === today.getFullYear());

    // 1. Calculate Fixed Costs (Rent, Subs, Bills) with reduction goals
    let fixedTotal = 0;
    FIXED_ITEMS.forEach(item => {
        let amount = item.amount;
        // Apply reduction goal if present
        if (reductionGoals && reductionGoals[item.cat]) {
            const reduction = reductionGoals[item.cat];
            amount = amount * (1 - reduction / 100);
        }
        fixedTotal += amount;
    });

    // 2. Calculate Variable Costs (Groceries, Food, Shopping, Transport)
    const variableCats = ['Groceries', 'Food', 'Shopping', 'Transport', 'Coffee', 'Entertainment'];
    let variableTotal = 0;
    const drivers: string[] = [];

    variableCats.forEach(cat => {
        let avg = getAvgCategorySpend(cat, today);

        // Seasonality Adjustments (Hardcoded for demo logic)
        if (monthIdx === 10 || monthIdx === 11) {
            if (cat === 'Shopping') avg *= 1.5;
            if (cat === 'Food') avg *= 1.2;
        }

        // Apply reduction goals if present
        if (reductionGoals && reductionGoals[cat]) {
            const reduction = reductionGoals[cat];
            avg = avg * (1 - reduction / 100);
            drivers.push(`${cat} reduced by ${reduction}%`);
        }

        variableTotal += avg;
    });

    // 3. Event Specific Adjustments
    let eventTotal = 0;
    const detailedDrivers: { name: string, amount: number, type: 'actual' | 'projected' }[] = [];

    // Add Fixed Items to drivers list
    FIXED_ITEMS.forEach(item => {
        const isReduced = reductionGoals && reductionGoals[item.cat];
        let amount = item.amount;

        if (isReduced) {
            const reduction = reductionGoals[item.cat];
            amount = amount * (1 - reduction / 100);
            drivers.push(`${item.cat} reduced by ${reduction}%`);
        }

        const type = (isFuture || (monthIdx === today.getMonth() && today.getDate() < 1)) ? 'projected' : 'actual';
        detailedDrivers.push({ name: item.cat, amount: amount, type });
    });

    if (monthIdx === 1) { // Feb
        eventTotal += 200; // Valentine's + Super Bowl
        drivers.push(`Valentine's Day (+$120)`);
        drivers.push(`Super Bowl Party (+$80)`);
        detailedDrivers.push({ name: "Valentine's Day", amount: 120, type: 'projected' });
        detailedDrivers.push({ name: "Super Bowl Party", amount: 80, type: 'projected' });
    } else if (monthIdx === 11) { // Dec
        eventTotal += 600; // Holidays
        drivers.push(`Holiday Gifts (+$600)`);
        detailedDrivers.push({ name: "Holiday Gifts", amount: 600, type: 'projected' });
    } else if (monthIdx === 6) { // Jul
        eventTotal += 300; // July 4th
        drivers.push(`July 4th BBQ (+$300)`);
        detailedDrivers.push({ name: "July 4th BBQ", amount: 300, type: 'projected' });
    }

    const total = fixedTotal + variableTotal + eventTotal;

    return {
        total: Math.round(total),
        breakdown: {
            fixed: Math.round(fixedTotal),
            variable: Math.round(variableTotal),
            events: eventTotal
        },
        isFuture,
        confidence: isFuture ? 'Medium' : 'High',
        drivers,
        detailedDrivers
    };
};
