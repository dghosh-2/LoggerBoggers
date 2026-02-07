/**
 * Centralized category definitions for the application
 * This ensures consistency across all views (Breakdown, Analysis, Dashboard, etc.)
 * These match the categories used in transactions from the backend/mock data
 */

// Standard categories used throughout the application
// These must match the categories in fake-transaction-generator.ts and actual transaction data
// Master categories (single source of truth).
// Keep this list in sync with the `public.categories` seed and any UI color/icon maps.
export const STANDARD_CATEGORIES = [
    'Bills & Utilities',
    'Education',
    'Entertainment',
    'Food & Drink',
    'Health & Fitness',
    'Personal Care',
    'Shopping',
    'Transportation',
    'Travel',
    'Other',
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

export function isStandardCategory(value: string): value is Category {
    return (STANDARD_CATEGORIES as readonly string[]).includes(value);
}

// For legacy receipt item categories and other older values.
export function normalizeCategory(value: unknown): Category {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (isStandardCategory(trimmed)) return trimmed;

        // Legacy receipt categories -> master list
        const lower = trimmed.toLowerCase();
        if (lower === 'groceries' || lower === 'dining') return 'Food & Drink';
        if (lower === 'transport') return 'Transportation';
        if (lower === 'household') return 'Bills & Utilities';
        if (lower === 'health') return 'Health & Fitness';
        if (lower === 'tech') return 'Shopping';
    }
    return 'Other';
}
