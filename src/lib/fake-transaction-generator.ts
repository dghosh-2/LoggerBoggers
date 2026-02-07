import { Transaction, Income } from './supabase';

// Realistic merchant data with categories
const MERCHANTS = {
    'Food & Drink': [
        { name: 'Starbucks', avgAmount: 7.50, hasTipTax: true },
        { name: 'Chipotle', avgAmount: 14.00, hasTipTax: true },
        { name: 'McDonald\'s', avgAmount: 12.00, hasTipTax: true },
        { name: 'Chick-fil-A', avgAmount: 11.00, hasTipTax: true },
        { name: 'Panera Bread', avgAmount: 15.00, hasTipTax: true },
        { name: 'Dunkin\'', avgAmount: 6.00, hasTipTax: true },
        { name: 'Subway', avgAmount: 10.00, hasTipTax: true },
        { name: 'Domino\'s Pizza', avgAmount: 22.00, hasTipTax: true },
        { name: 'Olive Garden', avgAmount: 45.00, hasTipTax: true },
        { name: 'Applebee\'s', avgAmount: 35.00, hasTipTax: true },
        { name: 'Buffalo Wild Wings', avgAmount: 30.00, hasTipTax: true },
        { name: 'Taco Bell', avgAmount: 9.00, hasTipTax: true },
        { name: 'Wendy\'s', avgAmount: 10.00, hasTipTax: true },
        { name: 'Panda Express', avgAmount: 12.00, hasTipTax: true },
        { name: 'Five Guys', avgAmount: 18.00, hasTipTax: true },
        { name: 'DoorDash', avgAmount: 35.00, hasTipTax: true },
        { name: 'Uber Eats', avgAmount: 32.00, hasTipTax: true },
        { name: 'Grubhub', avgAmount: 28.00, hasTipTax: true },
    ],
    'Transportation': [
        { name: 'Uber', avgAmount: 18.00, hasTipTax: false },
        { name: 'Lyft', avgAmount: 16.00, hasTipTax: false },
        { name: 'Shell Gas Station', avgAmount: 45.00, hasTipTax: false },
        { name: 'Chevron', avgAmount: 50.00, hasTipTax: false },
        { name: 'ExxonMobil', avgAmount: 48.00, hasTipTax: false },
        { name: 'BP Gas', avgAmount: 42.00, hasTipTax: false },
        { name: 'Parking - Downtown', avgAmount: 15.00, hasTipTax: false },
        { name: 'Metro Transit', avgAmount: 2.50, hasTipTax: false },
    ],
    'Shopping': [
        { name: 'Amazon', avgAmount: 45.00, hasTipTax: false },
        { name: 'Target', avgAmount: 65.00, hasTipTax: false },
        { name: 'Walmart', avgAmount: 85.00, hasTipTax: false },
        { name: 'Costco', avgAmount: 150.00, hasTipTax: false },
        { name: 'Best Buy', avgAmount: 120.00, hasTipTax: false },
        { name: 'Apple Store', avgAmount: 200.00, hasTipTax: false },
        { name: 'Nike', avgAmount: 95.00, hasTipTax: false },
        { name: 'H&M', avgAmount: 55.00, hasTipTax: false },
        { name: 'Zara', avgAmount: 75.00, hasTipTax: false },
        { name: 'Nordstrom', avgAmount: 130.00, hasTipTax: false },
        { name: 'Home Depot', avgAmount: 85.00, hasTipTax: false },
        { name: 'IKEA', avgAmount: 180.00, hasTipTax: false },
        { name: 'Trader Joe\'s', avgAmount: 75.00, hasTipTax: false },
        { name: 'Whole Foods', avgAmount: 95.00, hasTipTax: false },
        { name: 'Kroger', avgAmount: 110.00, hasTipTax: false },
        { name: 'CVS Pharmacy', avgAmount: 25.00, hasTipTax: false },
        { name: 'Walgreens', avgAmount: 22.00, hasTipTax: false },
    ],
    'Entertainment': [
        { name: 'Netflix', avgAmount: 15.99, hasTipTax: false },
        { name: 'Spotify', avgAmount: 10.99, hasTipTax: false },
        { name: 'Disney+', avgAmount: 13.99, hasTipTax: false },
        { name: 'HBO Max', avgAmount: 15.99, hasTipTax: false },
        { name: 'AMC Theatres', avgAmount: 18.00, hasTipTax: false },
        { name: 'Regal Cinemas', avgAmount: 16.00, hasTipTax: false },
        { name: 'Steam Games', avgAmount: 35.00, hasTipTax: false },
        { name: 'PlayStation Store', avgAmount: 60.00, hasTipTax: false },
        { name: 'Xbox Game Pass', avgAmount: 14.99, hasTipTax: false },
        { name: 'YouTube Premium', avgAmount: 13.99, hasTipTax: false },
        { name: 'Apple Music', avgAmount: 10.99, hasTipTax: false },
        { name: 'Hulu', avgAmount: 12.99, hasTipTax: false },
    ],
    'Bills & Utilities': [
        { name: 'AT&T Wireless', avgAmount: 85.00, hasTipTax: false },
        { name: 'Verizon', avgAmount: 90.00, hasTipTax: false },
        { name: 'T-Mobile', avgAmount: 75.00, hasTipTax: false },
        { name: 'Comcast/Xfinity', avgAmount: 120.00, hasTipTax: false },
        { name: 'Electric Company', avgAmount: 95.00, hasTipTax: false },
        { name: 'Water Utility', avgAmount: 45.00, hasTipTax: false },
        { name: 'Gas Company', avgAmount: 65.00, hasTipTax: false },
    ],
    'Health & Fitness': [
        { name: 'Planet Fitness', avgAmount: 24.99, hasTipTax: false },
        { name: 'LA Fitness', avgAmount: 34.99, hasTipTax: false },
        { name: 'Equinox', avgAmount: 185.00, hasTipTax: false },
        { name: 'CVS Pharmacy - Rx', avgAmount: 35.00, hasTipTax: false },
        { name: 'Walgreens - Rx', avgAmount: 28.00, hasTipTax: false },
        { name: 'Doctor\'s Office Copay', avgAmount: 30.00, hasTipTax: false },
        { name: 'Dental Cleaning', avgAmount: 50.00, hasTipTax: false },
    ],
    'Travel': [
        { name: 'United Airlines', avgAmount: 350.00, hasTipTax: false },
        { name: 'Delta Airlines', avgAmount: 380.00, hasTipTax: false },
        { name: 'Southwest Airlines', avgAmount: 250.00, hasTipTax: false },
        { name: 'Marriott Hotels', avgAmount: 180.00, hasTipTax: false },
        { name: 'Hilton Hotels', avgAmount: 165.00, hasTipTax: false },
        { name: 'Airbnb', avgAmount: 150.00, hasTipTax: false },
        { name: 'Enterprise Rent-A-Car', avgAmount: 85.00, hasTipTax: false },
        { name: 'Hertz', avgAmount: 95.00, hasTipTax: false },
    ],
    'Personal Care': [
        { name: 'Great Clips', avgAmount: 22.00, hasTipTax: true },
        { name: 'Supercuts', avgAmount: 25.00, hasTipTax: true },
        { name: 'Ulta Beauty', avgAmount: 55.00, hasTipTax: false },
        { name: 'Sephora', avgAmount: 65.00, hasTipTax: false },
        { name: 'Massage Envy', avgAmount: 80.00, hasTipTax: true },
    ],
    'Education': [
        { name: 'Coursera', avgAmount: 49.00, hasTipTax: false },
        { name: 'Udemy', avgAmount: 15.00, hasTipTax: false },
        { name: 'LinkedIn Learning', avgAmount: 29.99, hasTipTax: false },
        { name: 'Barnes & Noble', avgAmount: 35.00, hasTipTax: false },
        { name: 'Amazon Books', avgAmount: 20.00, hasTipTax: false },
    ],
};

// Income sources
const INCOME_SOURCES = [
    { name: 'Tech Company Inc.', source: 'salary', amount: 4500, frequency: 'biweekly' },
    { name: 'Freelance Project', source: 'freelance', amount: 800, frequency: 'monthly' },
];

function randomVariation(base: number, variance: number = 0.3): number {
    const multiplier = 1 + (Math.random() - 0.5) * 2 * variance;
    return Math.round(base * multiplier * 100) / 100;
}

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

// Generate transactions for a specific month
function generateMonthTransactions(year: number, month: number): Transaction[] {
    const transactions: Transaction[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Food & Drink: 15-25 transactions per month
    const foodCount = 15 + Math.floor(Math.random() * 10);
    for (let i = 0; i < foodCount; i++) {
        const merchants = MERCHANTS['Food & Drink'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        const baseAmount = randomVariation(merchant.avgAmount);
        const tip = merchant.hasTipTax ? Math.round(baseAmount * (0.15 + Math.random() * 0.1) * 100) / 100 : null;
        const tax = merchant.hasTipTax ? Math.round(baseAmount * 0.08 * 100) / 100 : null;
        
        transactions.push({
            amount: baseAmount + (tip || 0) + (tax || 0),
            category: 'Food & Drink',
            name: merchant.name,
            tip,
            tax,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Transportation: 8-15 transactions per month
    const transportCount = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < transportCount; i++) {
        const merchants = MERCHANTS['Transportation'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Transportation',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Shopping: 5-12 transactions per month
    const shoppingCount = 5 + Math.floor(Math.random() * 7);
    for (let i = 0; i < shoppingCount; i++) {
        const merchants = MERCHANTS['Shopping'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Shopping',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Entertainment: 3-6 subscriptions + occasional purchases
    const entertainmentMerchants = MERCHANTS['Entertainment'];
    // Monthly subscriptions
    const subscriptions = entertainmentMerchants.slice(0, 4);
    subscriptions.forEach(merchant => {
        if (Math.random() > 0.2) { // 80% chance of having each subscription
            transactions.push({
                amount: merchant.avgAmount,
                category: 'Entertainment',
                name: merchant.name,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, 1 + Math.floor(Math.random() * 5))),
                source: 'generated',
                merchant_name: merchant.name,
            });
        }
    });
    // Occasional entertainment
    const occasionalCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < occasionalCount; i++) {
        const merchant = entertainmentMerchants[4 + Math.floor(Math.random() * (entertainmentMerchants.length - 4))];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Entertainment',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Bills & Utilities: Monthly bills
    MERCHANTS['Bills & Utilities'].forEach(merchant => {
        if (Math.random() > 0.3) { // 70% chance of each bill
            transactions.push({
                amount: randomVariation(merchant.avgAmount, 0.15),
                category: 'Bills & Utilities',
                name: merchant.name,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, 1 + Math.floor(Math.random() * 10))),
                source: 'generated',
                merchant_name: merchant.name,
            });
        }
    });
    
    // Health & Fitness: 1-3 per month
    const healthCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < healthCount; i++) {
        const merchants = MERCHANTS['Health & Fitness'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Health & Fitness',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Travel: Occasional (0-1 per month, more in summer)
    const isSummer = month >= 5 && month <= 8;
    if (Math.random() < (isSummer ? 0.4 : 0.15)) {
        const merchants = MERCHANTS['Travel'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Travel',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Personal Care: 1-2 per month
    if (Math.random() > 0.3) {
        const merchants = MERCHANTS['Personal Care'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        const baseAmount = randomVariation(merchant.avgAmount);
        const tip = merchant.hasTipTax ? Math.round(baseAmount * 0.2 * 100) / 100 : null;
        
        transactions.push({
            amount: baseAmount + (tip || 0),
            category: 'Personal Care',
            name: merchant.name,
            tip,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    // Education: Occasional
    if (Math.random() < 0.2) {
        const merchants = MERCHANTS['Education'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        
        transactions.push({
            amount: randomVariation(merchant.avgAmount),
            category: 'Education',
            name: merchant.name,
            tip: null,
            tax: null,
            date: formatDate(new Date(year, month, day)),
            source: 'generated',
            merchant_name: merchant.name,
        });
    }
    
    return transactions;
}

// Generate 5 years of transactions
export function generateFiveYearsOfTransactions(): Transaction[] {
    const allTransactions: Transaction[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    let currentDate = new Date(startDate);
    
    // Include current month by checking year/month, not just date
    while (currentDate.getFullYear() < endYear || 
           (currentDate.getFullYear() === endYear && currentDate.getMonth() <= endMonth)) {
        const monthTransactions = generateMonthTransactions(
            currentDate.getFullYear(),
            currentDate.getMonth()
        );
        allTransactions.push(...monthTransactions);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return allTransactions;
}

// Generate 5 years of income
export function generateFiveYearsOfIncome(): Income[] {
    const allIncome: Income[] = [];
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 5);
    
    let currentDate = new Date(startDate);
    
    // Include current month
    while (currentDate.getFullYear() < endYear || 
           (currentDate.getFullYear() === endYear && currentDate.getMonth() <= endMonth)) {
        // Biweekly salary (2 per month)
        const salary = INCOME_SOURCES[0];
        const salaryAmount = randomVariation(salary.amount, 0.05); // Small variation for raises over time
        
        // First paycheck around 15th
        allIncome.push({
            amount: salaryAmount,
            source: salary.source,
            name: salary.name,
            date: formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 15)),
            recurring: true,
            frequency: salary.frequency,
        });
        
        // Second paycheck around end of month
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        allIncome.push({
            amount: salaryAmount,
            source: salary.source,
            name: salary.name,
            date: formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), lastDay)),
            recurring: true,
            frequency: salary.frequency,
        });
        
        // Occasional freelance income (30% chance per month)
        if (Math.random() < 0.3) {
            const freelance = INCOME_SOURCES[1];
            allIncome.push({
                amount: randomVariation(freelance.amount, 0.5),
                source: freelance.source,
                name: freelance.name,
                date: formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 10 + Math.floor(Math.random() * 15))),
                recurring: false,
                frequency: 'one-time',
            });
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return allIncome;
}
