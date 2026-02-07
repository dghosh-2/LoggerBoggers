/**
 * Centralized category definitions for the application
 * This ensures consistency across all views (Breakdown, Analysis, Dashboard, etc.)
 * These match the categories used in transactions from the backend/mock data
 */

// Standard categories used throughout the application
// These must match the categories in fake-transaction-generator.ts and actual transaction data
export const STANDARD_CATEGORIES = [
    'Food & Drink',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Health & Fitness',
    'Travel',
    'Personal Care',
    'Education'
] as const;

export type Category = typeof STANDARD_CATEGORIES[number];

// Maximum number of categories to display before grouping into "Other"
// Increased to 10 to ensure all 9 standard categories are displayed distinctively
export const MAX_DISPLAYED_CATEGORIES = 10;

/**
 * Get the top N categories from transactions and group the rest into "Other"
 */
export function getTopCategories(
    categoryTotals: Record<string, number>,
    maxCategories: number = MAX_DISPLAYED_CATEGORIES
): string[] {
    return Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxCategories)
        .map(([name]) => name);
}

/**
 * Determine if a category should be grouped into "Other"
 */
export function isOtherCategory(category: string, topCategories: string[]): boolean {
    return !topCategories.includes(category);
}
