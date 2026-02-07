import { STANDARD_CATEGORIES } from './categories';

// Updated Mock Data with User-Specified Categories - Now Synced with Single Source of Truth
export const CATEGORIES = [...STANDARD_CATEGORIES];

// Generator for realistic transaction history
const generateTransactions = () => {
    const transactions: any[] = [];
    const endDate = new Date('2026-02-01');
    const startDate = new Date('2025-01-01');

    // 1. Recurring Monthly Bills (Fixed dates)
    const recurring = [
        { cat: 'Bills & Utilities', merchant: 'Landlord', amount: 2450, day: 1, variance: 0 },
        { cat: 'Bills & Utilities', merchant: 'Netflix', amount: 15.99, day: 15, variance: 0 },
        { cat: 'Bills & Utilities', merchant: 'Comcast Internet', amount: 79.99, day: 20, variance: 0 },
        { cat: 'Bills & Utilities', merchant: 'Verizon Phone', amount: 45.00, day: 25, variance: 5 }, // slight variance
    ];

    // 2. Weekly/Frequent Habits (Random days in week)
    const habits = [
        { cat: 'Food & Drink', min: 80, max: 200, freq: 0.2 }, // 20% daily chance
        { cat: 'Food & Drink', min: 15, max: 60, freq: 0.4 }, // 40% daily chance
        { cat: 'Food & Drink', min: 5, max: 12, freq: 0.6 },
        { cat: 'Transportation', min: 20, max: 50, freq: 0.3 },
    ];

    // 3. One-off Events / Anomalies (Hardcoded for detection)
    const anomalies = [
        { date: '2026-01-15', cat: 'Shopping', amount: 1200 }, // Big spree
        { date: '2025-11-28', cat: 'Shopping', amount: 850 }, // Black Friday
        { date: '2025-07-04', cat: 'Entertainment', amount: 400 }, // July 4th
    ];

    // Iterate day by day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const day = d.getDate();

        // Add Recurring
        recurring.forEach(r => {
            if (day === r.day) {
                const amt = r.amount + (Math.random() * r.variance * 2 - r.variance);
                transactions.push({
                    date: dateStr,
                    amount: parseFloat(amt.toFixed(2)),
                    category: r.cat,
                    merchant: r.merchant,
                    id: `rec-${dateStr}-${r.cat}`
                });
            }
        });

        // Add Habits
        habits.forEach(h => {
            // Holiday Multiplier (Nov/Dec)
            let multiplier = 1;
            const month = d.getMonth(); // 0-11
            if ((month === 10 || month === 11) && ['Shopping', 'Food & Drink'].includes(h.cat)) {
                multiplier = 1.5 + Math.random(); // 1.5x to 2.5x normal spend
            }

            if (Math.random() < h.freq) {
                const amt = (h.min + Math.random() * (h.max - h.min)) * multiplier;
                transactions.push({
                    date: dateStr,
                    amount: parseFloat(amt.toFixed(2)),
                    category: h.cat,
                    merchant: h.cat, // Habit name as merchant
                    id: `hab-${dateStr}-${h.cat}-${Math.random()}`
                });
            }
        });
    }

    // Inject Anomalies
    anomalies.forEach(a => {
        transactions.push({ date: a.date, amount: a.amount, category: a.cat, merchant: 'Unknown Merchant' });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const MOCK_TRANSACTIONS = generateTransactions();

export const MOCK_SPEND_TREND = [
    { date: 'Jan 1', amount: 50 },
    { date: 'Jan 5', amount: 2450 },
    { date: 'Jan 10', amount: 300 },
    { date: 'Jan 15', amount: 800 },
    { date: 'Jan 20', amount: 1200 },
    { date: 'Jan 25', amount: 2900 },
    { date: 'Jan 30', amount: 3400, forecast: 3400 }, // Overlap point
    { date: 'Feb 5', forecast: 3800 },
    { date: 'Feb 10', forecast: 4500 },
    { date: 'Feb 15', forecast: 5200 },
];

// React Flow Graph Data -- Modernized
// Types: 'income', 'account', 'expense'
export const INITIAL_NODES = [
    // Level 1: Income
    {
        id: '1',
        type: 'custom',
        position: { x: 350, y: 0 },
        data: { label: 'Salary', amount: '$8,400', type: 'income', icon: 'Wallet' }
    },

    // Level 2: Accounts
    {
        id: '2',
        type: 'custom',
        position: { x: 200, y: 180 },
        data: { label: 'Checking', amount: '$12,450', type: 'account', icon: 'CreditCard' }
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 500, y: 180 },
        data: { label: 'Savings', amount: '$34,000', type: 'account', icon: 'PiggyBank' }
    },

    // Level 3: Expenses (Categories)
    { id: '4', type: 'custom', position: { x: 0, y: 400 }, data: { label: 'Bills & Utilities', amount: '-$2,450', type: 'expense', icon: 'Zap' } },
    { id: '5', type: 'custom', position: { x: 150, y: 400 }, data: { label: 'Food & Drink', amount: '-$620', type: 'expense', icon: 'Utensils' } },
    { id: '6', type: 'custom', position: { x: 300, y: 400 }, data: { label: 'Transportation', amount: '-$450', type: 'expense', icon: 'Car' } },
    { id: '7', type: 'custom', position: { x: 450, y: 400 }, data: { label: 'Entertainment', amount: '-$120', type: 'expense', icon: 'Tv' } },
    { id: '8', type: 'custom', position: { x: 600, y: 400 }, data: { label: 'Shopping', amount: '-$340', type: 'expense', icon: 'ShoppingBag' } },
    { id: '9', type: 'custom', position: { x: 750, y: 400 }, data: { label: 'Other', amount: '-$280', type: 'expense', icon: 'MoreHorizontal' } },
];

export const INITIAL_EDGES = [
    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#22c55e' } },

    { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#3f3f46' } },
    { id: 'e2-5', source: '2', target: '5', animated: true, style: { stroke: '#3f3f46' } },
    { id: 'e2-6', source: '2', target: '6', animated: true, style: { stroke: '#3f3f46' } },
    { id: 'e2-7', source: '2', target: '7', animated: true, style: { stroke: '#3f3f46' } },
    { id: 'e2-8', source: '2', target: '8', animated: true, style: { stroke: '#3f3f46' } },
    { id: 'e2-9', source: '2', target: '9', animated: true, style: { stroke: '#3f3f46' } },
];

export type InsightConfidence = 'High' | 'Medium' | 'Low';
export interface InsightItem {
    id: string;
    title: string;
    drivers: string[];
    confidence: InsightConfidence;
    severity: 'critical' | 'warning' | 'info';
    relatedNodeIds: string[];
    changePercentage?: string;
    // New fields for Deep Explorations
    richDrivers?: {
        merchants: { name: string, impact: string, amount: number }[];
        stats?: { freqChange?: string, priceChange?: string };
        keyDates?: string[];
    };
    causalGuess?: string;
}

export const MOCK_INSIGHTS: InsightItem[] = [
    {
        id: 'i1',
        title: 'Food & Drink +18% MoM',
        drivers: ['Whole Foods (+$120)', 'Trader Joes (+$45)'],
        confidence: 'High',
        severity: 'warning',
        relatedNodeIds: ['5'],
        changePercentage: '+18%'
    },
    {
        id: 'i2',
        title: 'Unused Subscription',
        drivers: ['MasterClass ($180/yr) - 0 usage'],
        confidence: 'High',
        severity: 'info',
        relatedNodeIds: ['7'],
    },
    {
        id: 'i3',
        title: 'Rent Hike Detected',
        drivers: ['Predicted +5% next renewal'],
        confidence: 'Medium',
        severity: 'critical',
        relatedNodeIds: ['4'],
    },
    {
        id: 'i4',
        title: 'High Shopping Volume',
        drivers: ['Amazon Prime Day'],
        confidence: 'Low',
        severity: 'info',
        relatedNodeIds: ['8'],
    },
];

export const MOCK_COPILOT_HISTORY = [
    {
        role: 'assistant',
        content: 'I noticed your grocery spending is up 18% this month. Want to see the breakdown?',
        actions: [{ label: 'Show Drivers', action: 'show_drivers' }]
    }
];

export const MOCK_DNA_DATA = [
    { subject: 'Needs', A: 80, fullMark: 100 },
    { subject: 'Wants', A: 45, fullMark: 100 },
    { subject: 'Social', A: 90, fullMark: 100 },
    { subject: 'Self', A: 60, fullMark: 100 },
    { subject: 'Digital', A: 85, fullMark: 100 },
    { subject: 'Stability', A: 30, fullMark: 100 },
];

export const MOCK_BURN_RATE = [
    { name: 'Safe Limit', value: 100, fill: '#3f3f46' },
    { name: 'Current Burn', value: 75, fill: '#ef4444' }
];

export const MOCK_TREEMAP_DATA = [
    { name: 'Bills & Utilities', size: 2450, fill: '#22c55e' },
    { name: 'Food & Drink', size: 620, fill: '#16a34a' },
    { name: 'Transportation', size: 450, fill: '#15803d' },
    { name: 'Shopping', size: 340, fill: '#166534' },
    { name: 'Other', size: 280, fill: '#14532d' },
    { name: 'Entertainment', size: 120, fill: '#3f3f46' },
];
