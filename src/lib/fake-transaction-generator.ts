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

// Income sources with locations - more realistic salary (~$75k/year = ~$2,885 biweekly after taxes)
const INCOME_SOURCES = [
    { name: 'Tech Company Inc.', source: 'salary', amount: 2885, frequency: 'biweekly', location: '5000 Forbes Ave, Pittsburgh, PA 15213' },
    { name: 'Freelance Project', source: 'freelance', amount: 500, frequency: 'monthly', location: '4720 Forbes Ave, Pittsburgh, PA 15213' },
];

// Large occasional purchases that happen randomly
const LARGE_PURCHASES = [
    { name: 'Car Repair - Brake Service', category: 'Transportation', amount: 450, frequency: 0.08 }, // ~once per year
    { name: 'Car Repair - Oil Change', category: 'Transportation', amount: 75, frequency: 0.25 }, // ~3x per year
    { name: 'Emergency Room Visit', category: 'Health & Fitness', amount: 350, frequency: 0.05 }, // rare
    { name: 'Dentist - Filling', category: 'Health & Fitness', amount: 200, frequency: 0.08 },
    { name: 'Eye Exam & Glasses', category: 'Health & Fitness', amount: 280, frequency: 0.08 },
    { name: 'Home Appliance Repair', category: 'Bills & Utilities', amount: 180, frequency: 0.06 },
    { name: 'New Tires', category: 'Transportation', amount: 600, frequency: 0.04 }, // every 2-3 years
    { name: 'Furniture Purchase', category: 'Shopping', amount: 450, frequency: 0.06 },
    { name: 'Electronics Upgrade', category: 'Shopping', amount: 350, frequency: 0.08 },
    { name: 'Annual Insurance Premium', category: 'Bills & Utilities', amount: 1200, frequency: 0.08 },
];

// Holiday spending multipliers by month (0 = January, 11 = December)
const HOLIDAY_MULTIPLIERS: Record<number, number> = {
    0: 0.85,  // January - post-holiday recovery
    1: 0.90,  // February - Valentine's day
    2: 0.95,  // March
    3: 1.00,  // April
    4: 1.00,  // May
    5: 1.10,  // June - summer starts
    6: 1.15,  // July - summer peak
    7: 1.10,  // August - back to school
    8: 1.00,  // September
    9: 1.05,  // October - Halloween
    10: 1.20, // November - Black Friday, Thanksgiving
    11: 1.40, // December - Holiday shopping
};

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

// Calculate years from start for gradual spending increase (inflation/lifestyle)
function getYearMultiplier(year: number, startYear: number): number {
    const yearsElapsed = year - startYear;
    // 3% annual increase in spending (inflation + lifestyle creep)
    return Math.pow(1.03, yearsElapsed);
}

// Generate transactions for a specific month
function generateMonthTransactions(year: number, month: number, startYear: number = 2021): Transaction[] {
    const transactions: Transaction[] = [];
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    
    // For current month, only generate up to today's date
    // For past months, use full month
    const maxDay = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Scale transaction counts for partial months
    const dayRatio = maxDay / daysInMonth;
    
    // Get multipliers for realistic variation
    const yearMultiplier = getYearMultiplier(year, startYear);
    const holidayMultiplier = HOLIDAY_MULTIPLIERS[month] || 1.0;
    const combinedMultiplier = yearMultiplier * holidayMultiplier;
    
    // Food & Drink: 15-25 transactions per month (scaled for partial month)
    const foodCount = Math.round((15 + Math.floor(Math.random() * 10)) * holidayMultiplier * dayRatio);
    for (let i = 0; i < foodCount; i++) {
        const merchants = MERCHANTS['Food & Drink'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        const baseAmount = randomVariation(merchant.avgAmount) * yearMultiplier;
        const tip = merchant.hasTipTax ? Math.round(baseAmount * (0.15 + Math.random() * 0.1) * 100) / 100 : null;
        const tax = merchant.hasTipTax ? Math.round(baseAmount * 0.08 * 100) / 100 : null;
        
        transactions.push({
            amount: Math.round((baseAmount + (tip || 0) + (tax || 0)) * 100) / 100,
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
    
    // Transportation: 8-15 transactions per month (scaled for partial month)
    const transportCount = Math.round((8 + Math.floor(Math.random() * 7)) * dayRatio);
    for (let i = 0; i < transportCount; i++) {
        const merchants = MERCHANTS['Transportation'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        
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
    
    // Shopping: 5-12 transactions per month (more during holidays, scaled for partial month)
    const shoppingCount = Math.round((5 + Math.floor(Math.random() * 7)) * holidayMultiplier * dayRatio);
    for (let i = 0; i < shoppingCount; i++) {
        const merchants = MERCHANTS['Shopping'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        
        transactions.push({
            amount: Math.round(randomVariation(merchant.avgAmount) * combinedMultiplier * 100) / 100,
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
    // Monthly subscriptions (usually charge early in month)
    const subscriptions = entertainmentMerchants.slice(0, 4);
    const subscriptionDay = Math.min(5, maxDay); // Subscriptions charge around day 1-5
    subscriptions.forEach(merchant => {
        if (Math.random() > 0.2 && subscriptionDay >= 1) { // 80% chance of having each subscription
            transactions.push({
                amount: merchant.avgAmount,
                category: 'Entertainment',
                name: merchant.name,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, 1 + Math.floor(Math.random() * subscriptionDay))),
                source: 'generated',
                merchant_name: merchant.name,
                location: getRandomLocation(merchant.locations),
            });
        }
    });
    // Occasional entertainment (scaled for partial month)
    const occasionalCount = Math.round(Math.floor(Math.random() * 3) * dayRatio);
    for (let i = 0; i < occasionalCount; i++) {
        const merchant = entertainmentMerchants[4 + Math.floor(Math.random() * (entertainmentMerchants.length - 4))];
        const day = 1 + Math.floor(Math.random() * maxDay);
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
    
    // Bills & Utilities: Monthly bills (usually charge early in month)
    const billDay = Math.min(10, maxDay);
    MERCHANTS['Bills & Utilities'].forEach(merchant => {
        if (Math.random() > 0.3 && billDay >= 1) { // 70% chance of each bill
            transactions.push({
                amount: randomVariation(merchant.avgAmount, 0.15),
                category: 'Bills & Utilities',
                name: merchant.name,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, 1 + Math.floor(Math.random() * billDay))),
                source: 'generated',
                merchant_name: merchant.name,
                location: getRandomLocation(merchant.locations),
            });
        }
    });
    
    // Health & Fitness: 1-3 per month (scaled for partial month)
    const healthCount = Math.max(1, Math.round((1 + Math.floor(Math.random() * 2)) * dayRatio));
    for (let i = 0; i < healthCount; i++) {
        const merchants = MERCHANTS['Health & Fitness'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        
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
    if (Math.random() < (isSummer ? 0.4 : 0.15) * dayRatio) {
        const merchants = MERCHANTS['Travel'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        
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
    if (Math.random() > 0.3 * (1 / dayRatio)) { // Adjust probability for partial month
        const merchants = MERCHANTS['Personal Care'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
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
    if (Math.random() < 0.2 * dayRatio) {
        const merchants = MERCHANTS['Education'];
        const merchant = merchants[Math.floor(Math.random() * merchants.length)];
        const day = 1 + Math.floor(Math.random() * maxDay);
        
        transactions.push({
            amount: Math.round(randomVariation(merchant.avgAmount) * yearMultiplier * 100) / 100,
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
    
    // Large occasional purchases (car repairs, medical, etc.)
    for (const purchase of LARGE_PURCHASES) {
        if (Math.random() < (purchase.frequency / 12) * dayRatio) { // Convert annual frequency to monthly, scaled
            const day = 1 + Math.floor(Math.random() * maxDay);
            const locationMap: Record<string, string[]> = {
                'Transportation': ADDRESSES.transportation,
                'Health & Fitness': ADDRESSES.healthcare,
                'Bills & Utilities': ADDRESSES.pittsburgh,
                'Shopping': ADDRESSES.retail,
            };
            const locations = locationMap[purchase.category] || ADDRESSES.pittsburgh;
            
            transactions.push({
                amount: Math.round(randomVariation(purchase.amount, 0.2) * yearMultiplier * 100) / 100,
                category: purchase.category,
                name: purchase.name,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, day)),
                source: 'generated',
                merchant_name: purchase.name,
                location: getRandomLocation(locations),
            });
        }
    }
    
    // Holiday-specific purchases
    // Holiday-specific purchases (December - gift shopping)
    if (month === 11 && maxDay >= 1) {
        const giftMaxDay = Math.min(24, maxDay); // Before Christmas, but respect current date
        const giftCount = Math.round((3 + Math.floor(Math.random() * 5)) * (giftMaxDay / 24));
        for (let i = 0; i < giftCount; i++) {
            const merchants = MERCHANTS['Shopping'];
            const merchant = merchants[Math.floor(Math.random() * merchants.length)];
            const day = 1 + Math.floor(Math.random() * giftMaxDay);
            
            transactions.push({
                amount: Math.round(randomVariation(merchant.avgAmount * 1.5) * yearMultiplier * 100) / 100,
                category: 'Shopping',
                name: `${merchant.name} - Holiday Gift`,
                tip: null,
                tax: null,
                date: formatDate(new Date(year, month, day)),
                source: 'generated',
                merchant_name: merchant.name,
                location: getRandomLocation(merchant.locations),
            });
        }
    }
    
    // Back to school (August)
    if (month === 7 && maxDay >= 10) {
        const schoolMaxDay = Math.min(25, maxDay);
        const schoolItems = [
            { name: 'Target - School Supplies', amount: 85 },
            { name: 'Amazon - Textbooks', amount: 150 },
            { name: 'Best Buy - Laptop/Electronics', amount: 450 },
        ];
        for (const item of schoolItems) {
            if (Math.random() < 0.4 * dayRatio) {
                const day = Math.min(10 + Math.floor(Math.random() * 15), schoolMaxDay);
                transactions.push({
                    amount: Math.round(randomVariation(item.amount, 0.25) * yearMultiplier * 100) / 100,
                    category: 'Shopping',
                    name: item.name,
                    tip: null,
                    tax: null,
                    date: formatDate(new Date(year, month, day)),
                    source: 'generated',
                    merchant_name: item.name.split(' - ')[0],
                    location: getRandomLocation(ADDRESSES.retail),
                });
            }
        }
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
    const startYear = startDate.getFullYear();
    
    let currentDate = new Date(startDate);
    
    // Include current month by checking year/month, not just date
    while (currentDate.getFullYear() < endYear || 
           (currentDate.getFullYear() === endYear && currentDate.getMonth() <= endMonth)) {
        const monthTransactions = generateMonthTransactions(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            startYear
        );
        allTransactions.push(...monthTransactions);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log(`Generated ${allTransactions.length} transactions over 5 years`);
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

// Realistic stock holdings for portfolio
const STOCK_HOLDINGS = [
    { symbol: 'AAPL', name: 'Apple Inc.', avgPrice: 178.50, shares: 25, costBasisMultiplier: 0.75 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', avgPrice: 141.80, shares: 15, costBasisMultiplier: 0.65 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', avgPrice: 378.90, shares: 20, costBasisMultiplier: 0.70 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', avgPrice: 178.25, shares: 18, costBasisMultiplier: 0.80 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', avgPrice: 495.20, shares: 10, costBasisMultiplier: 0.45 },
    { symbol: 'TSLA', name: 'Tesla Inc.', avgPrice: 248.50, shares: 12, costBasisMultiplier: 0.90 },
    { symbol: 'META', name: 'Meta Platforms Inc.', avgPrice: 505.75, shares: 8, costBasisMultiplier: 0.55 },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', avgPrice: 198.40, shares: 15, costBasisMultiplier: 0.85 },
    { symbol: 'V', name: 'Visa Inc.', avgPrice: 279.30, shares: 10, costBasisMultiplier: 0.80 },
    { symbol: 'JNJ', name: 'Johnson & Johnson', avgPrice: 156.80, shares: 20, costBasisMultiplier: 0.95 },
];

// ETF holdings for diversification
const ETF_HOLDINGS = [
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', avgPrice: 458.20, shares: 30, costBasisMultiplier: 0.82 },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', avgPrice: 438.50, shares: 15, costBasisMultiplier: 0.75 },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', avgPrice: 252.30, shares: 25, costBasisMultiplier: 0.85 },
    { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', avgPrice: 78.40, shares: 40, costBasisMultiplier: 0.88 },
];

export interface Holding {
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    value: number;
    cost_basis: number;
    gain_loss: number;
    gain_loss_percent: number;
    location: string;
}

// Generate realistic investment holdings
export function generateHoldings(): Holding[] {
    const holdings: Holding[] = [];
    
    // Add 5-7 random stocks from the list
    const numStocks = 5 + Math.floor(Math.random() * 3);
    const shuffledStocks = [...STOCK_HOLDINGS].sort(() => Math.random() - 0.5);
    const selectedStocks = shuffledStocks.slice(0, numStocks);
    
    for (const stock of selectedStocks) {
        // Add some variance to shares and price
        const shares = Math.round(stock.shares * (0.7 + Math.random() * 0.6));
        const currentPrice = stock.avgPrice * (0.9 + Math.random() * 0.2);
        const costBasis = currentPrice * stock.costBasisMultiplier * (0.9 + Math.random() * 0.2);
        const value = shares * currentPrice;
        const totalCostBasis = shares * costBasis;
        const gainLoss = value - totalCostBasis;
        const gainLossPercent = ((value - totalCostBasis) / totalCostBasis) * 100;
        
        holdings.push({
            symbol: stock.symbol,
            name: stock.name,
            quantity: shares,
            price: Math.round(currentPrice * 100) / 100,
            value: Math.round(value * 100) / 100,
            cost_basis: Math.round(totalCostBasis * 100) / 100,
            gain_loss: Math.round(gainLoss * 100) / 100,
            gain_loss_percent: Math.round(gainLossPercent * 100) / 100,
            location: '1 PPG Pl, Pittsburgh, PA 15222', // Investment firm location
        });
    }
    
    // Add 2-3 ETFs
    const numETFs = 2 + Math.floor(Math.random() * 2);
    const shuffledETFs = [...ETF_HOLDINGS].sort(() => Math.random() - 0.5);
    const selectedETFs = shuffledETFs.slice(0, numETFs);
    
    for (const etf of selectedETFs) {
        const shares = Math.round(etf.shares * (0.7 + Math.random() * 0.6));
        const currentPrice = etf.avgPrice * (0.95 + Math.random() * 0.1);
        const costBasis = currentPrice * etf.costBasisMultiplier * (0.95 + Math.random() * 0.1);
        const value = shares * currentPrice;
        const totalCostBasis = shares * costBasis;
        const gainLoss = value - totalCostBasis;
        const gainLossPercent = ((value - totalCostBasis) / totalCostBasis) * 100;
        
        holdings.push({
            symbol: etf.symbol,
            name: etf.name,
            quantity: shares,
            price: Math.round(currentPrice * 100) / 100,
            value: Math.round(value * 100) / 100,
            cost_basis: Math.round(totalCostBasis * 100) / 100,
            gain_loss: Math.round(gainLoss * 100) / 100,
            gain_loss_percent: Math.round(gainLossPercent * 100) / 100,
            location: '1 PPG Pl, Pittsburgh, PA 15222',
        });
    }
    
    return holdings;
}
