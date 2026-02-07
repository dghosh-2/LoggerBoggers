'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/ui/modal';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Sliders,
    Loader2,
    Lock,
    AlertTriangle,
    TrendingDown,
    TrendingUp,
    Wallet,
    PiggyBank,
    ArrowRight,
} from 'lucide-react';
import type { CategoryBudget, BudgetSimulationResult, BudgetSummary, AutopilotConfig } from '@/types/budget';
import { simulateBudgetChanges } from '@/lib/budget/autopilot-engine';

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

    // Calculate values (hooks must be called unconditionally)
    const flexibleCategories = currentMonth?.categoryBudgets.filter(c => !c.isFixed) || [];
    const fixedTotal = currentMonth?.categoryBudgets
        .filter(c => c.isFixed)
        .reduce((sum, c) => sum + c.allocated, 0) || 0;

    const currentTotal = Object.values(adjustments).reduce((sum, val) => sum + val, 0);
    const originalTotal = currentMonth?.categoryBudgets.reduce((sum, c) => sum + c.allocated, 0) || 0;
    const difference = currentTotal - originalTotal;

    // Live simulation of budget changes (must be called unconditionally)
    const simulation: BudgetSimulationResult | null = useMemo(() => {
        if (!currentMonth || !config || Math.abs(difference) < 0.01) return null;

        // Only include changed categories
        const changes: Record<string, number> = {};
        Object.entries(adjustments).forEach(([category, newAmount]) => {
            const original = currentMonth.categoryBudgets.find(c => c.category === category);
            if (original && Math.abs(original.allocated - newAmount) > 0.01) {
                changes[category] = newAmount;
            }
        });

        if (Object.keys(changes).length === 0) return null;

        return simulateBudgetChanges(currentMonth, config, changes, 0, 0);
    }, [adjustments, currentMonth, config, difference]);

    // Early return AFTER all hooks
    if (!currentMonth || !config) return null;

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
            title="Adjust Caps"
            subtitle="Reallocate your spending categories"
        >
            <div className="space-y-5 p-6">
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        {error}
                    </div>
                )}

                {/* Live Preview Panel */}
                <LivePreviewPanel
                    currentMonth={currentMonth}
                    simulation={simulation}
                    difference={difference}
                    config={config}
                />

                {/* Fixed Categories Notice */}
                {config?.nonNegotiableCategories && config.nonNegotiableCategories.length > 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <p className="text-sm text-foreground">
                            Protected categories: {config.nonNegotiableCategories.join(', ')}
                        </p>
                    </div>
                )}

                {/* Category Sliders */}
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {flexibleCategories.map((cat) => (
                        <CategorySlider
                            key={cat.category}
                            category={cat}
                            value={adjustments[cat.category] || cat.allocated}
                            onChange={(value) => handleSliderChange(cat.category, value)}
                            simulation={simulation}
                        />
                    ))}
                </div>

                {/* Warnings */}
                <AnimatePresence>
                    {simulation && simulation.warnings.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            {simulation.warnings.map((warning, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2"
                                >
                                    <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-foreground">{warning}</p>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-md btn-secondary"
                    >
                        Cancel
                    </button>
                    <motion.button
                        onClick={handleSubmit}
                        disabled={isSubmitting || Math.abs(difference) < 0.01}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-md btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
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

// ═══════════════════════════════════════════════════════════════════════════
// LIVE PREVIEW PANEL
// ═══════════════════════════════════════════════════════════════════════════

interface LivePreviewPanelProps {
    currentMonth: BudgetSummary;
    simulation: BudgetSimulationResult | null;
    difference: number;
    config: AutopilotConfig;
}

function LivePreviewPanel({ currentMonth, simulation, difference, config }: LivePreviewPanelProps) {
    const hasChanges = Math.abs(difference) > 0.01;

    return (
        <div className="p-4 rounded-lg bg-secondary/60 border border-border space-y-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">Budget Impact Preview</span>
                {hasChanges && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        difference > 0 ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
                    }`}>
                        {difference > 0 ? '+' : ''}{difference.toFixed(0)} change
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Total Budget */}
                <MetricPreview
                    icon={<TrendingDown className="w-3.5 h-3.5 text-primary" />}
                    label="Total Budget"
                    current={currentMonth.totalBudget}
                    projected={simulation?.newTotalBudget ?? null}
                />

                {/* Safe to Spend */}
                <MetricPreview
                    icon={<Wallet className="w-3.5 h-3.5 text-success" />}
                    label="Safe to Spend"
                    current={currentMonth.safeToSpend}
                    projected={simulation?.newSafeToSpend ?? null}
                />

                {/* Savings Target */}
                <MetricPreview
                    icon={<PiggyBank className="w-3.5 h-3.5 text-primary" />}
                    label="Savings"
                    current={currentMonth.savingsActual}
                    projected={simulation?.newSavingsActual ?? null}
                />

                {/* Status Changes */}
                {simulation && simulation.categoryStatuses.some(cs => cs.oldStatus !== cs.newStatus) ? (
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                        <p className="text-xs text-foreground-muted mb-1">Status Changes</p>
                        <div className="space-y-1">
                            {simulation.categoryStatuses
                                .filter(cs => cs.oldStatus !== cs.newStatus)
                                .slice(0, 2)
                                .map(cs => (
                                    <div key={cs.category} className="flex items-center gap-1 text-xs">
                                        <span className="text-foreground-muted truncate">{cs.category}</span>
                                        <ArrowRight className="w-3 h-3 text-foreground-muted flex-shrink-0" />
                                        <StatusBadge status={cs.newStatus} />
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                ) : (
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                        <p className="text-xs text-foreground-muted mb-1">Income</p>
                        <p className="text-sm font-semibold text-foreground">
                            ${config.monthlyIncome.toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricPreview({
    icon,
    label,
    current,
    projected,
}: {
    icon: React.ReactNode;
    label: string;
    current: number;
    projected: number | null;
}) {
    const hasChange = projected !== null && Math.abs(projected - current) > 0.5;
    const diff = projected !== null ? projected - current : 0;

    return (
        <div className="p-2.5 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <p className="text-xs text-foreground-muted">{label}</p>
            </div>
            <div className="flex items-baseline gap-2">
                <p className={`text-sm font-semibold ${hasChange ? 'text-foreground-muted line-through' : 'text-foreground'}`}>
                    ${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                {hasChange && (
                    <motion.p
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`text-sm font-semibold ${diff > 0 ? 'text-success' : 'text-warning'}`}
                    >
                        ${(projected!).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </motion.p>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        healthy: 'text-success bg-success-soft',
        warning: 'text-warning bg-warning-soft',
        danger: 'text-destructive bg-destructive/10',
    };

    return (
        <span className={`text-xs px-1.5 py-0.5 rounded ${colors[status] || 'text-foreground-muted bg-secondary'}`}>
            {status}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY SLIDER
// ═══════════════════════════════════════════════════════════════════════════

interface CategorySliderProps {
    category: CategoryBudget;
    value: number;
    onChange: (value: number) => void;
    simulation: BudgetSimulationResult | null;
}

function CategorySlider({ category, value, onChange, simulation }: CategorySliderProps) {
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
    const isChanged = Math.abs(value - category.allocated) > 0.01;

    // Check if this category changed status
    const statusChange = simulation?.categoryStatuses.find(
        cs => cs.category === category.category && cs.oldStatus !== cs.newStatus
    );

    return (
        <div className={`p-4 rounded-lg border transition-all ${
            isChanged
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-secondary/40'
        }`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{category.category}</span>
                    {statusChange && (
                        <StatusBadge status={statusChange.newStatus} />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-foreground-muted">$</span>
                    <input
                        type="number"
                        value={inputValue}
                        onChange={handleInputChange}
                        className="w-20 px-2 py-1 input-elegant text-foreground text-right"
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
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${(value / maxValue) * 100}%, var(--border) ${(value / maxValue) * 100}%, var(--border) 100%)`,
                }}
            />

            {/* Stats */}
            <div className="flex justify-between text-xs text-foreground-muted mt-2">
                <span>Spent: ${category.spent.toLocaleString()}</span>
                <span className={percentUsed >= 100 ? 'text-destructive' : percentUsed >= 75 ? 'text-warning' : 'text-foreground-muted'}>
                    {percentUsed.toFixed(0)}% used
                </span>
            </div>

            {/* Change indicator */}
            {isChanged && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-xs"
                >
                    <span className={value > category.allocated ? 'text-warning' : 'text-success'}>
                        {value > category.allocated ? '+' : ''}{(value - category.allocated).toFixed(0)} from ${category.allocated.toFixed(0)}
                    </span>
                </motion.div>
            )}
        </div>
    );
}
