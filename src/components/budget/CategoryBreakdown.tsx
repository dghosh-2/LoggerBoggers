'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    ChevronDown,
    ChevronRight,
    Lock,
    Settings,
    ShoppingBag,
    Home,
    Car,
    Utensils,
    Film,
    Zap,
    Heart,
    MoreHorizontal,
} from 'lucide-react';
import type { CategoryBudget } from '@/types/budget';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Rent': <Home className="w-4 h-4" />,
    'Housing': <Home className="w-4 h-4" />,
    'Groceries': <ShoppingBag className="w-4 h-4" />,
    'Dining': <Utensils className="w-4 h-4" />,
    'Transportation': <Car className="w-4 h-4" />,
    'Entertainment': <Film className="w-4 h-4" />,
    'Utilities': <Zap className="w-4 h-4" />,
    'Healthcare': <Heart className="w-4 h-4" />,
    'Shopping': <ShoppingBag className="w-4 h-4" />,
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
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Budget Breakdown</h2>
                <button
                    onClick={onAdjustBudgets}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm"
                >
                    <Settings className="w-4 h-4" />
                    Adjust Budgets
                </button>
            </div>

            {/* Fixed Expenses */}
            <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-400" />
                        <h3 className="font-medium text-gray-300">Fixed Expenses</h3>
                        <span className="ml-auto text-sm text-gray-500">
                            ${fixedCategories.reduce((sum, c) => sum + c.allocated, 0).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-gray-700/30">
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
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No fixed expenses configured
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Flexible Expenses */}
            <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <h3 className="font-medium text-gray-300">Flexible Expenses</h3>
                        <span className="ml-auto text-sm text-gray-500">
                            ${flexibleCategories.reduce((sum, c) => sum + c.allocated, 0).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-gray-700/30">
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
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No flexible expenses yet
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
    const icon = CATEGORY_ICONS[category.category] || <MoreHorizontal className="w-4 h-4" />;

    const statusColors = {
        healthy: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
    };

    return (
        <div>
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
            >
                {/* Icon */}
                <div className="p-2 rounded-lg bg-gray-700/50 text-gray-400">
                    {icon}
                </div>

                {/* Category Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{category.category}</span>
                            {category.isFixed && (
                                <Lock className="w-3 h-3 text-gray-500" />
                            )}
                        </div>
                        <div className="text-right">
                            <span className="text-white font-medium">
                                ${category.spent.toLocaleString()}
                            </span>
                            <span className="text-gray-500"> / ${category.allocated.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(category.percentUsed, 100)}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={`h-full rounded-full ${statusColors[category.status]}`}
                        />
                    </div>
                </div>

                {/* Expand Icon */}
                <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                </motion.div>
            </motion.button>

            {/* Expanded Content */}
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
                            <div className="p-4 rounded-xl bg-gray-800/50 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Spent this month</span>
                                    <span className="text-white">${category.spent.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Budget allocated</span>
                                    <span className="text-white">${category.allocated.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Remaining</span>
                                    <span className={category.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        ${category.remaining.toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-700/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Usage</span>
                                        <span className={`font-medium ${category.status === 'danger' ? 'text-red-400' :
                                                category.status === 'warning' ? 'text-amber-400' :
                                                    'text-emerald-400'
                                            }`}>
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
