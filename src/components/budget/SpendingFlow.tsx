'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import { FinancialRiver } from '@/components/dashboard/FinancialRiver';

export function SpendingFlow() {
    const { currentMonth } = useBudgetStore();

    if (!currentMonth) return null;

    const flexibleCategories = currentMonth.categoryBudgets.filter(c => !c.isFixed);
    const flexibleSpending = flexibleCategories.reduce((sum, c) => sum + c.spent, 0);
    const categories = flexibleCategories.reduce<Record<string, number>>((acc, cat) => {
        acc[cat.category] = cat.spent;
        return acc;
    }, {});

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold text-foreground">Spending Flow</h2>
                <p className="text-xs text-foreground-muted">Where flexible spending goes this month</p>
            </div>

            <GlassCard className="p-4">
                <div className="h-[320px]">
                    <FinancialRiver
                        monthlyIncome={currentMonth.totalIncome}
                        monthlySpending={flexibleSpending}
                        categories={categories}
                        isConnected={true}
                    />
                </div>
            </GlassCard>
        </section>
    );
}
