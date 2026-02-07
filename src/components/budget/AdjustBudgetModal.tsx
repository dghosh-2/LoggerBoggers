'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/modal';
import { useBudgetStore } from '@/stores/budgetStore';
import { Sliders, Loader2, Lock, AlertTriangle } from 'lucide-react';
import type { CategoryBudget } from '@/types/budget';

interface AdjustBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AdjustBudgetModal({ isOpen, onClose }: AdjustBudgetModalProps) {
    const { currentMonth, adjustCategoryBudget, config } = useBudgetStore();
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize adjustments from current budgets
    useEffect(() => {
        if (currentMonth?.categoryBudgets) {
            const initial: Record<string, number> = {};
            currentMonth.categoryBudgets.forEach(cat => {
                initial[cat.category] = cat.allocated;
            });
            setAdjustments(initial);
        }
    }, [currentMonth?.categoryBudgets]);

    if (!currentMonth) return null;

    const flexibleCategories = currentMonth.categoryBudgets.filter(c => !c.isFixed);
    const fixedTotal = currentMonth.categoryBudgets
        .filter(c => c.isFixed)
        .reduce((sum, c) => sum + c.allocated, 0);

    const currentTotal = Object.values(adjustments).reduce((sum, val) => sum + val, 0);
    const originalTotal = currentMonth.categoryBudgets.reduce((sum, c) => sum + c.allocated, 0);
    const difference = currentTotal - originalTotal;

    const handleSliderChange = (category: string, value: number) => {
        setAdjustments(prev => ({
            ...prev,
            [category]: value,
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Find categories that changed
            const changes = Object.entries(adjustments).filter(([category, newAmount]) => {
                const original = currentMonth.categoryBudgets.find(c => c.category === category);
                return original && Math.abs(original.allocated - newAmount) > 0.01;
            });

            // Apply each change
            for (const [category, newAmount] of changes) {
                await adjustCategoryBudget(category, newAmount);
            }

            onClose();
        } catch (err) {
            setError('Failed to save adjustments. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Adjust Budgets"
            subtitle="Reallocate your spending categories"
        >
            <div className="space-y-5">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400">Total Monthly Budget</span>
                        <span className={`text-lg font-bold ${difference > 0 ? 'text-amber-400' : difference < 0 ? 'text-emerald-400' : 'text-white'
                            }`}>
                            ${currentTotal.toLocaleString()}
                        </span>
                    </div>
                    {difference !== 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className={`w-4 h-4 ${difference > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
                            <span className={difference > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(2)} from original
                            </span>
                        </div>
                    )}
                </div>

                {/* Fixed Categories Notice */}
                {config?.nonNegotiableCategories && config.nonNegotiableCategories.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-blue-400" />
                        <p className="text-sm text-blue-300">
                            Protected categories: {config.nonNegotiableCategories.join(', ')}
                        </p>
                    </div>
                )}

                {/* Category Sliders */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {flexibleCategories.map((cat) => (
                        <CategorySlider
                            key={cat.category}
                            category={cat}
                            value={adjustments[cat.category] || cat.allocated}
                            onChange={(value) => handleSliderChange(cat.category, value)}
                        />
                    ))}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={isSubmitting || difference === 0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Sliders className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </Modal>
    );
}

interface CategorySliderProps {
    category: CategoryBudget;
    value: number;
    onChange: (value: number) => void;
}

function CategorySlider({ category, value, onChange }: CategorySliderProps) {
    const [inputValue, setInputValue] = useState(value.toFixed(0));

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        const numVal = parseFloat(val);
        if (!isNaN(numVal) && numVal >= 0) {
            onChange(numVal);
        }
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        onChange(newValue);
        setInputValue(newValue.toFixed(0));
    };

    // Update input when value prop changes
    useEffect(() => {
        setInputValue(value.toFixed(0));
    }, [value]);

    const maxValue = Math.max(category.allocated * 2, 500);
    const percentUsed = value > 0 ? (category.spent / value) * 100 : 0;

    return (
        <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-white">{category.category}</span>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400">$</span>
                    <input
                        type="number"
                        value={inputValue}
                        onChange={handleInputChange}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
            </div>

            {/* Slider */}
            <input
                type="range"
                min="0"
                max={maxValue}
                step="10"
                value={value}
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                style={{
                    background: `linear-gradient(to right, rgb(16, 185, 129) 0%, rgb(16, 185, 129) ${(value / maxValue) * 100}%, rgb(55, 65, 81) ${(value / maxValue) * 100}%, rgb(55, 65, 81) 100%)`,
                }}
            />

            {/* Stats */}
            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Spent: ${category.spent.toLocaleString()}</span>
                <span className={percentUsed >= 100 ? 'text-red-400' : percentUsed >= 75 ? 'text-amber-400' : 'text-gray-500'}>
                    {percentUsed.toFixed(0)}% used
                </span>
            </div>
        </div>
    );
}
