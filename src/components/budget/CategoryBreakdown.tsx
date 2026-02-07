'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    ChevronRight,
    Lock,
    Settings,
    ShoppingBag,
    Car,
    Utensils,
    Film,
    Zap,
    Heart,
    MoreHorizontal,
} from 'lucide-react';
import type { CategoryBudget } from '@/types/budget';
import { normalizeCategory } from '@/lib/categories';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Bills & Utilities': <Zap className="w-4 h-4" />,
    'Education': <Settings className="w-4 h-4" />,
    'Entertainment': <Film className="w-4 h-4" />,
    'Food & Drink': <Utensils className="w-4 h-4" />,
    'Health & Fitness': <Heart className="w-4 h-4" />,
    'Personal Care': <Settings className="w-4 h-4" />,
    'Shopping': <ShoppingBag className="w-4 h-4" />,
    'Transportation': <Car className="w-4 h-4" />,
    'Travel': <Car className="w-4 h-4" />,
    'Other': <MoreHorizontal className="w-4 h-4" />,
};

interface CategoryBreakdownProps {
    onAdjustBudgets?: () => void;
}

export function CategoryBreakdown({ onAdjustBudgets }: CategoryBreakdownProps) {
    const { currentMonth } = useBudgetStore();
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    if (!currentMonth) return null;

    const fixedCategories = currentMonth.categoryBudgets.filter(c => c.isFixed);
    const flexibleCategories = currentMonth.categoryBudgets.filter(c => !c.isFixed);

    const toggleExpand = (category: string) => {
        setExpandedCategory(prev => prev === category ? null : category);
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Categories</h2>
                    <p className="text-xs text-foreground-muted">Fixed and flexible spending</p>
                </div>
                <GlassButton
                    onClick={onAdjustBudgets}
                    variant="secondary"
                    size="sm"
                >
                    <Settings className="w-4 h-4" />
                    Adjust
                </GlassButton>
            </div>

            <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-foreground-muted" />
                        <h3 className="font-medium text-foreground">Fixed</h3>
                        <span className="ml-auto text-sm text-foreground-muted">
                            ${fixedCategories.reduce((sum, c) => sum + c.allocated, 0).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-border">
                    {fixedCategories.map((category, index) => (
                        <CategoryRow
                            key={category.category}
                            category={category}
                            index={index}
                            isExpanded={expandedCategory === category.category}
                            onToggle={() => toggleExpand(category.category)}
                        />
                    ))}
                    {fixedCategories.length === 0 && (
                        <div className="p-4 text-center text-foreground-muted text-sm">
                            No fixed categories configured
                        </div>
                    )}
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-foreground-muted" />
                        <h3 className="font-medium text-foreground">Flexible</h3>
                        <span className="ml-auto text-sm text-foreground-muted">
                            ${flexibleCategories.reduce((sum, c) => sum + c.allocated, 0).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-border">
                    {flexibleCategories.map((category, index) => (
                        <CategoryRow
                            key={category.category}
                            category={category}
                            index={index}
                            isExpanded={expandedCategory === category.category}
                            onToggle={() => toggleExpand(category.category)}
                        />
                    ))}
                    {flexibleCategories.length === 0 && (
                        <div className="p-4 text-center text-foreground-muted text-sm">
                            No flexible categories yet
                        </div>
                    )}
                </div>
            </GlassCard>
        </section>
    );
}

interface CategoryRowProps {
    category: CategoryBudget;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
}

function CategoryRow({ category, index, isExpanded, onToggle }: CategoryRowProps) {
    const icon = CATEGORY_ICONS[normalizeCategory(category.category)] || <MoreHorizontal className="w-4 h-4" />;
<<<<<<< HEAD

    const statusColors = {
        healthy: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
    };
=======
>>>>>>> abhinav-changes

    return (
        <div>
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-4 hover:bg-secondary transition-colors"
            >
                <div className="p-2 rounded-lg bg-secondary text-foreground-muted">
                    {icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{category.category}</span>
                            {category.isFixed && (
                                <Lock className="w-3 h-3 text-foreground-muted" />
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-foreground font-medium">
                                ${category.spent.toLocaleString()}
                            </span>
                            <span className="text-foreground-muted"> / ${category.allocated.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(category.percentUsed, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="h-full rounded-full bg-primary"
                        />
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight className="w-5 h-5 text-foreground-muted" />
                </motion.div>
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-0">
                            <div className="p-4 rounded-lg bg-secondary/60 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground-muted">Spent this month</span>
                                    <span className="text-foreground">${category.spent.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground-muted">Budget allocated</span>
                                    <span className="text-foreground">${category.allocated.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground-muted">Remaining</span>
                                    <span className={category.remaining >= 0 ? 'text-foreground' : 'text-destructive'}>
                                        ${category.remaining.toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-border">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-foreground-muted">Usage</span>
                                        <span className="font-medium text-foreground">
                                            {category.percentUsed.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
