import { Transaction, Income } from './supabase';

// Realistic addresses for different types of locations
const ADDRESSES = {
    // Pittsburgh area addresses (primary location)
    pittsburgh: [
        '4720 Forbes Ave, Pittsburgh, PA 15213',
        '5000 Forbes Ave, Pittsburgh, PA 15213',
        '100 S Craig St, Pittsburgh, PA 15213',
        '3800 Forbes Ave, Pittsburgh, PA 15213',
        '200 S Craig St, Pittsburgh, PA 15213',
        '4600 Henry St, Pittsburgh, PA 15213',
        '300 S Bouquet St, Pittsburgh, PA 15213',
        '3990 Fifth Ave, Pittsburgh, PA 15213',
        '120 Meyran Ave, Pittsburgh, PA 15213',
        '3601 Fifth Ave, Pittsburgh, PA 15213',
        '4200 Fifth Ave, Pittsburgh, PA 15213',
        '5801 Forbes Ave, Pittsburgh, PA 15217',
        '2100 Murray Ave, Pittsburgh, PA 15217',
        '5500 Walnut St, Pittsburgh, PA 15232',
        '5820 Ellsworth Ave, Pittsburgh, PA 15232',
        '1 PPG Pl, Pittsburgh, PA 15222',
        '600 Grant St, Pittsburgh, PA 15219',
        '525 William Penn Pl, Pittsburgh, PA 15219',
        '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
        '100 Art Rooney Ave, Pittsburgh, PA 15212',
    ],
    // Shopping malls and retail areas
    retail: [
        '100 Robinson Centre Dr, Pittsburgh, PA 15205',
        '200 Mall Circle Dr, Monroeville, PA 15146',
        '301 Mall Blvd, King of Prussia, PA 19406',
        '1000 Ross Park Mall Dr, Pittsburgh, PA 15237',
        '400 Waterfront Dr, Homestead, PA 15120',
        '2000 Park Manor Blvd, Pittsburgh, PA 15205',
        '7001 McKnight Rd, Pittsburgh, PA 15237',
        '1500 Washington Rd, Pittsburgh, PA 15228',
    ],
    // Gas stations and transportation
    transportation: [
        '4501 Baum Blvd, Pittsburgh, PA 15213',
        '3900 Bigelow Blvd, Pittsburgh, PA 15213',
        '5100 Centre Ave, Pittsburgh, PA 15232',
        '2801 Liberty Ave, Pittsburgh, PA 15222',
        '1001 Liberty Ave, Pittsburgh, PA 15222',
        '500 Grant St Garage, Pittsburgh, PA 15219',
        '1 Station Square Dr, Pittsburgh, PA 15219',
        'Pittsburgh International Airport, Pittsburgh, PA 15231',
    ],
    // Gyms and fitness
    fitness: [
        '171 N Craig St, Pittsburgh, PA 15213',
        '5996 Centre Ave, Pittsburgh, PA 15206',
        '2015 Murray Ave, Pittsburgh, PA 15217',
        '100 S Commons, Pittsburgh, PA 15212',
        '1601 E Carson St, Pittsburgh, PA 15203',
    ],
    // Medical and healthcare
    healthcare: [
        '3550 Terrace St, Pittsburgh, PA 15213',
        '200 Lothrop St, Pittsburgh, PA 15213',
        '4815 Liberty Ave, Pittsburgh, PA 15224',
        '100 Delafield Rd, Pittsburgh, PA 15215',
        '532 S Aiken Ave, Pittsburgh, PA 15232',
    ],
    // Hotels and travel
    hotels: [
        '1000 Penn Ave, Pittsburgh, PA 15222',
        '530 William Penn Pl, Pittsburgh, PA 15219',
        '112 Washington Pl, Pittsburgh, PA 15219',
        '510 Market St, Pittsburgh, PA 15222',
        '620 William Penn Pl, Pittsburgh, PA 15219',
    ],
    // Online/Digital (use HQ addresses)
    online: [
        '410 Terry Ave N, Seattle, WA 98109', // Amazon
        '1 Apple Park Way, Cupertino, CA 95014', // Apple
        '100 Winchester Cir, Los Gatos, CA 95032', // Netflix
        '150 Greenwich St, New York, NY 10006', // Spotify
        '500 S Buena Vista St, Burbank, CA 91521', // Disney
        '2300 Traverwood Dr, Ann Arbor, MI 48105', // Google/YouTube
        '1 Hacker Way, Menlo Park, CA 94025', // Meta
        '10900 NE 8th St, Bellevue, WA 98004', // Valve/Steam
    ],
    // Employer offices
    employer: [
        '5000 Forbes Ave, Pittsburgh, PA 15213', // CMU area
        '4200 Fifth Ave, Pittsburgh, PA 15213', // Oakland
        '600 Grant St, Pittsburgh, PA 15219', // Downtown
        '1 PPG Pl, Pittsburgh, PA 15222', // PPG Place
        '500 Grant St, Pittsburgh, PA 15219', // US Steel Tower
    ],
};

// Realistic merchant data with categories and locations
const MERCHANTS = {
    'Food & Drink': [
        { name: 'Starbucks', avgAmount: 7.50, hasTipTax: true, locations: ['4720 Forbes Ave, Pittsburgh, PA 15213', '100 S Craig St, Pittsburgh, PA 15213', '3990 Fifth Ave, Pittsburgh, PA 15213', '1 PPG Pl, Pittsburgh, PA 15222'] },
        { name: 'Chipotle', avgAmount: 14.00, hasTipTax: true, locations: ['3800 Forbes Ave, Pittsburgh, PA 15213', '200 S Craig St, Pittsburgh, PA 15213', '5801 Forbes Ave, Pittsburgh, PA 15217'] },
        { name: 'McDonald\'s', avgAmount: 12.00, hasTipTax: true, locations: ['4600 Henry St, Pittsburgh, PA 15213', '2100 Murray Ave, Pittsburgh, PA 15217', '100 Robinson Centre Dr, Pittsburgh, PA 15205'] },
        { name: 'Chick-fil-A', avgAmount: 11.00, hasTipTax: true, locations: ['300 S Bouquet St, Pittsburgh, PA 15213', '200 Mall Circle Dr, Monroeville, PA 15146', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Panera Bread', avgAmount: 15.00, hasTipTax: true, locations: ['120 Meyran Ave, Pittsburgh, PA 15213', '5500 Walnut St, Pittsburgh, PA 15232', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Dunkin\'', avgAmount: 6.00, hasTipTax: true, locations: ['3601 Fifth Ave, Pittsburgh, PA 15213', '4200 Fifth Ave, Pittsburgh, PA 15213', '600 Grant St, Pittsburgh, PA 15219'] },
        { name: 'Subway', avgAmount: 10.00, hasTipTax: true, locations: ['4720 Forbes Ave, Pittsburgh, PA 15213', '525 William Penn Pl, Pittsburgh, PA 15219', '400 Waterfront Dr, Homestead, PA 15120'] },
        { name: 'Domino\'s Pizza', avgAmount: 22.00, hasTipTax: true, locations: ['4501 Baum Blvd, Pittsburgh, PA 15213', '2801 Liberty Ave, Pittsburgh, PA 15222', '5996 Centre Ave, Pittsburgh, PA 15206'] },
        { name: 'Olive Garden', avgAmount: 45.00, hasTipTax: true, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '200 Mall Circle Dr, Monroeville, PA 15146', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Applebee\'s', avgAmount: 35.00, hasTipTax: true, locations: ['2000 Park Manor Blvd, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Buffalo Wild Wings', avgAmount: 30.00, hasTipTax: true, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Taco Bell', avgAmount: 9.00, hasTipTax: true, locations: ['4600 Henry St, Pittsburgh, PA 15213', '5100 Centre Ave, Pittsburgh, PA 15232', '2000 Park Manor Blvd, Pittsburgh, PA 15205'] },
        { name: 'Wendy\'s', avgAmount: 10.00, hasTipTax: true, locations: ['3900 Bigelow Blvd, Pittsburgh, PA 15213', '2100 Murray Ave, Pittsburgh, PA 15217', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Panda Express', avgAmount: 12.00, hasTipTax: true, locations: ['5000 Forbes Ave, Pittsburgh, PA 15213', '400 Waterfront Dr, Homestead, PA 15120', '100 Robinson Centre Dr, Pittsburgh, PA 15205'] },
        { name: 'Five Guys', avgAmount: 18.00, hasTipTax: true, locations: ['5820 Ellsworth Ave, Pittsburgh, PA 15232', '1500 Washington Rd, Pittsburgh, PA 15228', '200 Mall Circle Dr, Monroeville, PA 15146'] },
        { name: 'DoorDash', avgAmount: 35.00, hasTipTax: true, locations: ADDRESSES.pittsburgh },
        { name: 'Uber Eats', avgAmount: 32.00, hasTipTax: true, locations: ADDRESSES.pittsburgh },
        { name: 'Grubhub', avgAmount: 28.00, hasTipTax: true, locations: ADDRESSES.pittsburgh },
    ],
    'Transportation': [
        { name: 'Uber', avgAmount: 18.00, hasTipTax: false, locations: ADDRESSES.pittsburgh },
        { name: 'Lyft', avgAmount: 16.00, hasTipTax: false, locations: ADDRESSES.pittsburgh },
        { name: 'Shell Gas Station', avgAmount: 45.00, hasTipTax: false, locations: ['4501 Baum Blvd, Pittsburgh, PA 15213', '5100 Centre Ave, Pittsburgh, PA 15232', '2801 Liberty Ave, Pittsburgh, PA 15222'] },
        { name: 'Chevron', avgAmount: 50.00, hasTipTax: false, locations: ['3900 Bigelow Blvd, Pittsburgh, PA 15213', '7001 McKnight Rd, Pittsburgh, PA 15237', '1500 Washington Rd, Pittsburgh, PA 15228'] },
        { name: 'ExxonMobil', avgAmount: 48.00, hasTipTax: false, locations: ['4501 Baum Blvd, Pittsburgh, PA 15213', '2000 Park Manor Blvd, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120'] },
        { name: 'BP Gas', avgAmount: 42.00, hasTipTax: false, locations: ['5100 Centre Ave, Pittsburgh, PA 15232', '100 Robinson Centre Dr, Pittsburgh, PA 15205', '200 Mall Circle Dr, Monroeville, PA 15146'] },
        { name: 'Parking - Downtown', avgAmount: 15.00, hasTipTax: false, locations: ['500 Grant St Garage, Pittsburgh, PA 15219', '1 PPG Pl, Pittsburgh, PA 15222', '420 Fort Duquesne Blvd, Pittsburgh, PA 15222'] },
        { name: 'Metro Transit', avgAmount: 2.50, hasTipTax: false, locations: ['1 Station Square Dr, Pittsburgh, PA 15219', '600 Grant St, Pittsburgh, PA 15219', '5000 Forbes Ave, Pittsburgh, PA 15213'] },
    ],
    'Shopping': [
        { name: 'Amazon', avgAmount: 45.00, hasTipTax: false, locations: ['410 Terry Ave N, Seattle, WA 98109'] },
        { name: 'Target', avgAmount: 65.00, hasTipTax: false, locations: ['5801 Forbes Ave, Pittsburgh, PA 15217', '400 Waterfront Dr, Homestead, PA 15120', '100 Robinson Centre Dr, Pittsburgh, PA 15205'] },
        { name: 'Walmart', avgAmount: 85.00, hasTipTax: false, locations: ['2000 Park Manor Blvd, Pittsburgh, PA 15205', '200 Mall Circle Dr, Monroeville, PA 15146', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Costco', avgAmount: 150.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '200 Mall Circle Dr, Monroeville, PA 15146', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Best Buy', avgAmount: 120.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Apple Store', avgAmount: 200.00, hasTipTax: false, locations: ['5500 Walnut St, Pittsburgh, PA 15232', '100 Robinson Centre Dr, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Nike', avgAmount: 95.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'H&M', avgAmount: 55.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Zara', avgAmount: 75.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Nordstrom', avgAmount: 130.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Home Depot', avgAmount: 85.00, hasTipTax: false, locations: ['2000 Park Manor Blvd, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'IKEA', avgAmount: 180.00, hasTipTax: false, locations: ['2001 Park Manor Blvd, Pittsburgh, PA 15205'] },
        { name: 'Trader Joe\'s', avgAmount: 75.00, hasTipTax: false, locations: ['5820 Ellsworth Ave, Pittsburgh, PA 15232', '1500 Washington Rd, Pittsburgh, PA 15228'] },
        { name: 'Whole Foods', avgAmount: 95.00, hasTipTax: false, locations: ['5820 Ellsworth Ave, Pittsburgh, PA 15232', '1 PPG Pl, Pittsburgh, PA 15222'] },
        { name: 'Kroger', avgAmount: 110.00, hasTipTax: false, locations: ['5801 Forbes Ave, Pittsburgh, PA 15217', '2100 Murray Ave, Pittsburgh, PA 15217', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'CVS Pharmacy', avgAmount: 25.00, hasTipTax: false, locations: ['4720 Forbes Ave, Pittsburgh, PA 15213', '5500 Walnut St, Pittsburgh, PA 15232', '600 Grant St, Pittsburgh, PA 15219'] },
        { name: 'Walgreens', avgAmount: 22.00, hasTipTax: false, locations: ['3800 Forbes Ave, Pittsburgh, PA 15213', '2100 Murray Ave, Pittsburgh, PA 15217', '525 William Penn Pl, Pittsburgh, PA 15219'] },
    ],
    'Entertainment': [
        { name: 'Netflix', avgAmount: 15.99, hasTipTax: false, locations: ['100 Winchester Cir, Los Gatos, CA 95032'] },
        { name: 'Spotify', avgAmount: 10.99, hasTipTax: false, locations: ['150 Greenwich St, New York, NY 10006'] },
        { name: 'Disney+', avgAmount: 13.99, hasTipTax: false, locations: ['500 S Buena Vista St, Burbank, CA 91521'] },
        { name: 'HBO Max', avgAmount: 15.99, hasTipTax: false, locations: ['30 Hudson Yards, New York, NY 10001'] },
        { name: 'AMC Theatres', avgAmount: 18.00, hasTipTax: false, locations: ['400 Waterfront Dr, Homestead, PA 15120', '100 Robinson Centre Dr, Pittsburgh, PA 15205', '200 Mall Circle Dr, Monroeville, PA 15146'] },
        { name: 'Regal Cinemas', avgAmount: 16.00, hasTipTax: false, locations: ['1000 Ross Park Mall Dr, Pittsburgh, PA 15237', '2000 Park Manor Blvd, Pittsburgh, PA 15205'] },
        { name: 'Steam Games', avgAmount: 35.00, hasTipTax: false, locations: ['10900 NE 8th St, Bellevue, WA 98004'] },
        { name: 'PlayStation Store', avgAmount: 60.00, hasTipTax: false, locations: ['2207 Bridgepointe Pkwy, San Mateo, CA 94404'] },
        { name: 'Xbox Game Pass', avgAmount: 14.99, hasTipTax: false, locations: ['1 Microsoft Way, Redmond, WA 98052'] },
        { name: 'YouTube Premium', avgAmount: 13.99, hasTipTax: false, locations: ['901 Cherry Ave, San Bruno, CA 94066'] },
        { name: 'Apple Music', avgAmount: 10.99, hasTipTax: false, locations: ['1 Apple Park Way, Cupertino, CA 95014'] },
        { name: 'Hulu', avgAmount: 12.99, hasTipTax: false, locations: ['2500 Broadway, Santa Monica, CA 90404'] },
    ],
    'Bills & Utilities': [
        { name: 'AT&T Wireless', avgAmount: 85.00, hasTipTax: false, locations: ['208 S Akard St, Dallas, TX 75202'] },
        { name: 'Verizon', avgAmount: 90.00, hasTipTax: false, locations: ['1 Verizon Way, Basking Ridge, NJ 07920'] },
        { name: 'T-Mobile', avgAmount: 75.00, hasTipTax: false, locations: ['12920 SE 38th St, Bellevue, WA 98006'] },
        { name: 'Comcast/Xfinity', avgAmount: 120.00, hasTipTax: false, locations: ['1701 JFK Blvd, Philadelphia, PA 19103'] },
        { name: 'Electric Company', avgAmount: 95.00, hasTipTax: false, locations: ['411 7th Ave, Pittsburgh, PA 15219'] },
        { name: 'Water Utility', avgAmount: 45.00, hasTipTax: false, locations: ['1200 Penn Ave, Pittsburgh, PA 15222'] },
        { name: 'Gas Company', avgAmount: 65.00, hasTipTax: false, locations: ['625 Liberty Ave, Pittsburgh, PA 15222'] },
    ],
    'Health & Fitness': [
        { name: 'Planet Fitness', avgAmount: 24.99, hasTipTax: false, locations: ['171 N Craig St, Pittsburgh, PA 15213', '5996 Centre Ave, Pittsburgh, PA 15206', '2000 Park Manor Blvd, Pittsburgh, PA 15205'] },
        { name: 'LA Fitness', avgAmount: 34.99, hasTipTax: false, locations: ['2015 Murray Ave, Pittsburgh, PA 15217', '100 Robinson Centre Dr, Pittsburgh, PA 15205', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Equinox', avgAmount: 185.00, hasTipTax: false, locations: ['1 PPG Pl, Pittsburgh, PA 15222'] },
        { name: 'CVS Pharmacy - Rx', avgAmount: 35.00, hasTipTax: false, locations: ['4720 Forbes Ave, Pittsburgh, PA 15213', '5500 Walnut St, Pittsburgh, PA 15232', '600 Grant St, Pittsburgh, PA 15219'] },
        { name: 'Walgreens - Rx', avgAmount: 28.00, hasTipTax: false, locations: ['3800 Forbes Ave, Pittsburgh, PA 15213', '2100 Murray Ave, Pittsburgh, PA 15217', '525 William Penn Pl, Pittsburgh, PA 15219'] },
        { name: 'Doctor\'s Office Copay', avgAmount: 30.00, hasTipTax: false, locations: ['3550 Terrace St, Pittsburgh, PA 15213', '200 Lothrop St, Pittsburgh, PA 15213', '4815 Liberty Ave, Pittsburgh, PA 15224'] },
        { name: 'Dental Cleaning', avgAmount: 50.00, hasTipTax: false, locations: ['532 S Aiken Ave, Pittsburgh, PA 15232', '100 Delafield Rd, Pittsburgh, PA 15215', '5500 Walnut St, Pittsburgh, PA 15232'] },
    ],
    'Travel': [
        { name: 'United Airlines', avgAmount: 350.00, hasTipTax: false, locations: ['Pittsburgh International Airport, Pittsburgh, PA 15231', '233 S Wacker Dr, Chicago, IL 60606'] },
        { name: 'Delta Airlines', avgAmount: 380.00, hasTipTax: false, locations: ['Pittsburgh International Airport, Pittsburgh, PA 15231', '1030 Delta Blvd, Atlanta, GA 30354'] },
        { name: 'Southwest Airlines', avgAmount: 250.00, hasTipTax: false, locations: ['Pittsburgh International Airport, Pittsburgh, PA 15231', '2702 Love Field Dr, Dallas, TX 75235'] },
        { name: 'Marriott Hotels', avgAmount: 180.00, hasTipTax: false, locations: ['112 Washington Pl, Pittsburgh, PA 15219', '10400 Fernwood Rd, Bethesda, MD 20817'] },
        { name: 'Hilton Hotels', avgAmount: 165.00, hasTipTax: false, locations: ['600 Commonwealth Pl, Pittsburgh, PA 15222', '7930 Jones Branch Dr, McLean, VA 22102'] },
        { name: 'Airbnb', avgAmount: 150.00, hasTipTax: false, locations: ADDRESSES.pittsburgh },
        { name: 'Enterprise Rent-A-Car', avgAmount: 85.00, hasTipTax: false, locations: ['Pittsburgh International Airport, Pittsburgh, PA 15231', '600 Corporate Dr, St. Louis, MO 63105'] },
        { name: 'Hertz', avgAmount: 95.00, hasTipTax: false, locations: ['Pittsburgh International Airport, Pittsburgh, PA 15231', '8501 Williams Rd, Estero, FL 33928'] },
    ],
    'Personal Care': [
        { name: 'Great Clips', avgAmount: 22.00, hasTipTax: true, locations: ['5801 Forbes Ave, Pittsburgh, PA 15217', '2000 Park Manor Blvd, Pittsburgh, PA 15205', '7001 McKnight Rd, Pittsburgh, PA 15237'] },
        { name: 'Supercuts', avgAmount: 25.00, hasTipTax: true, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '200 Mall Circle Dr, Monroeville, PA 15146'] },
        { name: 'Ulta Beauty', avgAmount: 55.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '400 Waterfront Dr, Homestead, PA 15120', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Sephora', avgAmount: 65.00, hasTipTax: false, locations: ['100 Robinson Centre Dr, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237', '5500 Walnut St, Pittsburgh, PA 15232'] },
        { name: 'Massage Envy', avgAmount: 80.00, hasTipTax: true, locations: ['5820 Ellsworth Ave, Pittsburgh, PA 15232', '2000 Park Manor Blvd, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
    ],
    'Education': [
        { name: 'Coursera', avgAmount: 49.00, hasTipTax: false, locations: ['381 E Evelyn Ave, Mountain View, CA 94041'] },
        { name: 'Udemy', avgAmount: 15.00, hasTipTax: false, locations: ['600 Harrison St, San Francisco, CA 94107'] },
        { name: 'LinkedIn Learning', avgAmount: 29.99, hasTipTax: false, locations: ['1000 W Maude Ave, Sunnyvale, CA 94085'] },
        { name: 'Barnes & Noble', avgAmount: 35.00, hasTipTax: false, locations: ['5500 Walnut St, Pittsburgh, PA 15232', '100 Robinson Centre Dr, Pittsburgh, PA 15205', '1000 Ross Park Mall Dr, Pittsburgh, PA 15237'] },
        { name: 'Amazon Books', avgAmount: 20.00, hasTipTax: false, locations: ['410 Terry Ave N, Seattle, WA 98109'] },
    ],
};

// Income sources with locations
const INCOME_SOURCES = [
    { name: 'Tech Company Inc.', source: 'salary', amount: 4500, frequency: 'biweekly', location: '5000 Forbes Ave, Pittsburgh, PA 15213' },
    { name: 'Freelance Project', source: 'freelance', amount: 800, frequency: 'monthly', location: '4720 Forbes Ave, Pittsburgh, PA 15213' },
];

// Helper to get a random location for a merchant
function getRandomLocation(locations: string[]): string {
    return locations[Math.floor(Math.random() * locations.length)];
}

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
            location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
                location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
                location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
            location: getRandomLocation(merchant.locations),
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
            location: salary.location,
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
            location: salary.location,
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
                location: freelance.location,
            });
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return allIncome;
}
