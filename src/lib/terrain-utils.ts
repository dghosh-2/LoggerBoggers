// Terrain utilities - accepts transaction data as parameters

// ============================================
// TYPES
// ============================================

export interface TerrainDataPoint {
    date: Date;
    balance: number;
    income: number;
    expenses: number;
    dominantCategory: string;
    categoryBreakdown: Map<string, number>;
    events: TerrainEvent[];
}

export interface TerrainEvent {
    id: string;
    type: "income" | "expense" | "milestone" | "warning";
    amount: number;
    description: string;
    category: string;
    date: Date;
}

export interface HeightMapData {
    width: number;
    depth: number;
    heights: Float32Array;
    colors: Float32Array;
    events: TerrainEvent[];
    minBalance: number;
    maxBalance: number;
}

// ============================================
// CATEGORY COLORS
// ============================================

export const CATEGORY_COLORS: Record<string, [number, number, number]> = {
    Rent: [0.545, 0.451, 0.333],      // Brown #8B7355
    Bills: [0.627, 0.510, 0.427],     // Light Brown #A0826D
    Groceries: [0.831, 0.647, 0.455], // Tan #D4A574
    Food: [1.0, 0.420, 0.420],        // Coral Red #FF6B6B
    Dining: [1.0, 0.420, 0.420],      // Coral Red #FF6B6B
    Entertainment: [0.655, 0.545, 0.980], // Purple #A78BFA
    Shopping: [0.957, 0.447, 0.714],  // Pink #F472B6
    Transport: [0.984, 0.573, 0.235], // Orange #FB923C
    Income: [0.204, 0.827, 0.600],    // Green #34D399
    Savings: [0.376, 0.647, 0.980],   // Blue #60A5FA
    Subscriptions: [0.506, 0.549, 0.973], // Indigo #818CF8
    Coffee: [0.627, 0.510, 0.427],    // Light Brown
    Other: [0.5, 0.5, 0.5],           // Gray
};

// ============================================
// DATA AGGREGATION
// ============================================

// Transaction type for terrain utilities
export interface TerrainTransaction {
    date: string;
    amount: number;
    category: string;
    description?: string;
}

export function aggregateTransactionsByWeek(
    transactions: TerrainTransaction[],
    startDate: Date,
    endDate: Date,
    activeCategories: Set<string>,
    monthlyIncome: number = 0 // Pass monthly income as parameter
): TerrainDataPoint[] {
    const dataPoints: TerrainDataPoint[] = [];
    let runningBalance = 5000; // Starting balance

    // Group transactions by week
    const weeklyData = new Map<string, {
        income: number;
        expenses: number;
        categoryTotals: Map<string, number>;
        transactions: TerrainTransaction[];
    }>();

    // Filter and group transactions
    transactions
        .filter(t => {
            const date = new Date(t.date);
            return date >= startDate && date <= endDate;
        })
        .forEach(t => {
            const date = new Date(t.date);
            const weekStart = getWeekStart(date);
            const weekKey = weekStart.toISOString().split("T")[0];

            if (!weeklyData.has(weekKey)) {
                weeklyData.set(weekKey, {
                    income: 0,
                    expenses: 0,
                    categoryTotals: new Map(),
                    transactions: [],
                });
            }

            const week = weeklyData.get(weekKey)!;

            // Check if category is active
            if (activeCategories.has(t.category)) {
                week.expenses += t.amount;
                const currentCat = week.categoryTotals.get(t.category) || 0;
                week.categoryTotals.set(t.category, currentCat + t.amount);
            }

            week.transactions.push(t);
        });

    // Add income for each week (simplified - add monthly income distributed weekly)
    const weeklyIncome = monthlyIncome / 4;

    // Convert to sorted array
    const sortedWeeks = Array.from(weeklyData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

    sortedWeeks.forEach(([weekKey, data]) => {
        const date = new Date(weekKey);

        // Determine dominant category
        let dominantCategory = "Other";
        let maxAmount = 0;
        data.categoryTotals.forEach((amount, category) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                dominantCategory = category;
            }
        });

        // Calculate balance
        const netChange = weeklyIncome - data.expenses;
        runningBalance += netChange;

        // Detect events
        const events: TerrainEvent[] = [];
        data.transactions.forEach(t => {
            if (t.amount > 500) {
                events.push({
                    id: `${weekKey}-${t.description || t.category}`,
                    type: "expense",
                    amount: t.amount,
                    description: t.description || t.category,
                    category: t.category,
                    date: new Date(t.date),
                });
            }
        });

        // Check for milestones
        if (runningBalance > 10000 && runningBalance - netChange <= 10000) {
            events.push({
                id: `milestone-10k-${weekKey}`,
                type: "milestone",
                amount: 10000,
                description: "Balance reached $10,000!",
                category: "Savings",
                date,
            });
        }

        dataPoints.push({
            date,
            balance: runningBalance,
            income: weeklyIncome,
            expenses: data.expenses,
            dominantCategory,
            categoryBreakdown: data.categoryTotals,
            events,
        });
    });

    return dataPoints;
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// ============================================
// HEIGHT MAP GENERATION
// ============================================

export function generateHeightMap(
    dataPoints: TerrainDataPoint[],
    width: number = 64,
    depth: number = 32
): HeightMapData {
    const heights = new Float32Array(width * depth);
    const colors = new Float32Array(width * depth * 3);
    const allEvents: TerrainEvent[] = [];

    if (dataPoints.length === 0) {
        return {
            width,
            depth,
            heights,
            colors,
            events: [],
            minBalance: 0,
            maxBalance: 10000,
        };
    }

    // Find min/max balance for normalization
    const balances = dataPoints.map(d => d.balance);
    const minBalance = Math.min(...balances);
    const maxBalance = Math.max(...balances);
    const balanceRange = maxBalance - minBalance || 1;

    // Generate terrain
    for (let x = 0; x < width; x++) {
        // Map x to data point
        const dataIndex = Math.floor((x / width) * dataPoints.length);
        const point = dataPoints[Math.min(dataIndex, dataPoints.length - 1)];

        // Normalized height (0-1)
        const normalizedHeight = (point.balance - minBalance) / balanceRange;

        // Get category color
        const catColor = CATEGORY_COLORS[point.dominantCategory] || CATEGORY_COLORS.Other;

        for (let z = 0; z < depth; z++) {
            const index = x * depth + z;

            // Add variation along depth (z-axis) with simple noise
            const zFactor = Math.sin(z * 0.3) * 0.05;
            const noise = (Math.random() - 0.5) * 0.02;

            heights[index] = normalizedHeight * 3 + zFactor + noise; // Scale to reasonable height

            // Set vertex colors
            const colorIndex = index * 3;
            colors[colorIndex] = catColor[0];
            colors[colorIndex + 1] = catColor[1];
            colors[colorIndex + 2] = catColor[2];
        }

        // Collect events
        point.events.forEach(e => allEvents.push(e));
    }

    return {
        width,
        depth,
        heights,
        colors,
        events: allEvents,
        minBalance,
        maxBalance,
    };
}

// ============================================
// SIMPLIFIED NOISE (for organic terrain)
// ============================================

export function applyTerrainSmoothing(heights: Float32Array, width: number, depth: number): void {
    const temp = new Float32Array(heights);

    for (let x = 1; x < width - 1; x++) {
        for (let z = 1; z < depth - 1; z++) {
            const index = x * depth + z;
            const avg = (
                temp[(x - 1) * depth + z] +
                temp[(x + 1) * depth + z] +
                temp[x * depth + (z - 1)] +
                temp[x * depth + (z + 1)] +
                temp[index]
            ) / 5;
            heights[index] = avg;
        }
    }
}
