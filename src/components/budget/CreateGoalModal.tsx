'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/modal';
import { GlassButton } from '@/components/ui/glass-button';
import { useBudgetStore } from '@/stores/budgetStore';
import { Target, Calendar, Loader2 } from 'lucide-react';

interface CreateGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefill?: {
        name?: string;
        amount?: number;
        deadline?: string;
        category?: string;
    };
}

const CATEGORIES = [
    'Travel', 'Emergency', 'Home', 'Car', 'Education',
    'Electronics', 'Wedding', 'Holiday', 'Other',
];

export function CreateGoalModal({ isOpen, onClose, prefill }: CreateGoalModalProps) {
    const [name, setName] = useState(prefill?.name || '');
    const [targetAmount, setTargetAmount] = useState(prefill?.amount?.toString() || '');
    const [deadline, setDeadline] = useState(prefill?.deadline || '');
    const [category, setCategory] = useState(prefill?.category || '');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { createSavingsGoal } = useBudgetStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Please enter a goal name');
            return;
        }

        const amount = parseFloat(targetAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid target amount');
            return;
        }

        setIsSubmitting(true);

        try {
            await createSavingsGoal({
                name: name.trim(),
                targetAmount: amount,
                deadline: deadline || undefined,
                category: category || undefined,
            });

            // Reset form
            setName('');
            setTargetAmount('');
            setDeadline('');
            setCategory('');
            onClose();
        } catch (err) {
            setError('Failed to create goal. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const minDate = new Date().toISOString().split('T')[0];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Savings Goal"
            subtitle="Set a target and we'll help you get there"
        >
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        {error}
                    </div>
                )}

                {/* Goal Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Goal Name
                    </label>
                    <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Emergency Fund, Vacation"
                            className="w-full pl-11 pr-4 py-3 input-elegant text-foreground placeholder:text-foreground-muted"
                        />
                    </div>
                </div>

                {/* Target Amount */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Target Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted font-medium">$</span>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            placeholder="5,000"
                            min="0"
                            step="0.01"
                            className="w-full pl-8 pr-4 py-3 input-elegant text-foreground placeholder:text-foreground-muted"
                        />
                    </div>
                </div>

                {/* Deadline */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Target Date <span className="text-foreground-muted">(optional)</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={minDate}
                            className="w-full pl-11 pr-4 py-3 input-elegant text-foreground"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Category <span className="text-foreground-muted">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(category === cat ? '' : cat)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${category === cat
                                        ? 'bg-primary/10 text-primary border-primary/30'
                                        : 'bg-secondary text-foreground-muted border-border hover:border-border-strong'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

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
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-md btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Goal'
                        )}
                    </motion.button>
                </div>
            </form>
        </Modal>
    );
}
