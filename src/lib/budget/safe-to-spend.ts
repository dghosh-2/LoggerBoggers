/**
 * Safe to Spend Calculator
 * 
 * Calculates how much a user can safely spend today while maintaining
 * their budget goals and accounting for upcoming bills.
 * 
 * Formula:
 * safeToSpend = accountBalance 
 *             - upcomingBills (next 7 days)
 *             - [(monthlyBudget - spentSoFar) / daysRemainingInMonth]
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface UpcomingBill {
    name: string;
    amount: number;
    dueDate: string;
    category: string;
}

interface SafeToSpendResult {
    amount: number;
    upcomingBillsCount: number;
    upcomingBillsTotal: number;
    upcomingBillNames: string[];
    dailyBudgetRemaining: number;
    daysRemaining: number;
    isNegative: boolean;
    warning: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// UPCOMING BILLS DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect recurring bills from transaction history
 * Looks for transactions with same merchant, similar amount, monthly pattern
 */
export function detectRecurringBills(
    transactions: Array<{ name: string; amount: number; date: string; category: string }>
): UpcomingBill[] {
    // Group transactions by merchant name (normalized)
    const merchantGroups: Record<string, typeof transactions> = {};

    transactions.forEach(tx => {
        const normalized = tx.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!merchantGroups[normalized]) {
            merchantGroups[normalized] = [];
        }
        merchantGroups[normalized].push(tx);
    });

    const bills: UpcomingBill[] = [];
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    Object.entries(merchantGroups).forEach(([, txs]) => {
        // Need at least 2 occurrences to detect pattern
        if (txs.length < 2) return;

        // Sort by date
        const sorted = txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Check if amounts are consistent (within 10%)
        const amounts = sorted.map(t => t.amount);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const isConsistent = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

        if (!isConsistent) return;

        // Check for monthly pattern (transactions ~30 days apart)
        const dates = sorted.map(t => new Date(t.date));
        let isMonthly = true;

        for (let i = 0; i < dates.length - 1; i++) {
            const daysDiff = Math.abs(dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff < 25 || daysDiff > 35) {
                isMonthly = false;
                break;
            }
        }

        if (!isMonthly) return;

        // Predict next due date
        const lastDate = dates[0];
        const dayOfMonth = lastDate.getDate();

        // Next occurrence is either this month or next
        let nextDueDate: Date;
        if (today.getDate() < dayOfMonth) {
            nextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
        } else {
            nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
        }

        // Only include if within next month
        if (nextDueDate <= nextMonth) {
            bills.push({
                name: sorted[0].name,
                amount: Math.round(avgAmount * 100) / 100,
                dueDate: nextDueDate.toISOString().split('T')[0],
                category: sorted[0].category,
            });
        }
    });

    return bills;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE TO SPEND CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate safe to spend amount for today
 */
export function calculateSafeToSpend(
    accountBalance: number,
    monthlyBudget: number,
    spentSoFar: number,
    upcomingBills: UpcomingBill[],
    lookAheadDays: number = 7
): SafeToSpendResult {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, endOfMonth.getDate() - today.getDate());

    // Filter bills due within lookAheadDays
    const upcomingBillsFiltered = upcomingBills.filter(bill => {
        const dueDate = new Date(bill.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= lookAheadDays;
    });

    const upcomingBillsTotal = upcomingBillsFiltered.reduce((sum, bill) => sum + bill.amount, 0);
    const upcomingBillNames = upcomingBillsFiltered.map(bill => bill.name);

    // Calculate remaining budget allocation per day
    const budgetRemaining = monthlyBudget - spentSoFar;
    const dailyBudgetRemaining = budgetRemaining / daysRemaining;

    // Safe to spend = balance - upcoming bills - daily budget buffer
    const safeToSpend = accountBalance - upcomingBillsTotal - dailyBudgetRemaining;
    const isNegative = safeToSpend < 0;

    // Generate warning if applicable
    let warning: string | null = null;
    if (isNegative) {
        warning = 'Your safe-to-spend is negative. Consider reducing discretionary spending.';
    } else if (safeToSpend < 50) {
        warning = 'Your safe-to-spend is low. Be careful with additional purchases.';
    } else if (upcomingBillsFiltered.length > 0) {
        warning = `You have ${upcomingBillsFiltered.length} bill${upcomingBillsFiltered.length > 1 ? 's' : ''} due soon.`;
    }

    return {
        amount: Math.max(0, Math.round(safeToSpend * 100) / 100),
        upcomingBillsCount: upcomingBillsFiltered.length,
        upcomingBillsTotal: Math.round(upcomingBillsTotal * 100) / 100,
        upcomingBillNames,
        dailyBudgetRemaining: Math.round(dailyBudgetRemaining * 100) / 100,
        daysRemaining,
        isNegative,
        warning,
    };
}

/**
 * Get formatted safe to spend message for display
 */
export function formatSafeToSpendMessage(result: SafeToSpendResult): string {
    if (result.upcomingBillsCount === 0) {
        return `$${result.amount.toLocaleString()} safe to spend today`;
    }

    const billsList = result.upcomingBillNames.slice(0, 2).join(', ');
    const remaining = result.upcomingBillsCount - 2;
    const billsText = remaining > 0
        ? `${billsList} +${remaining} more`
        : billsList;

    return `$${result.amount.toLocaleString()} after ${billsText}`;
}
