'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/modal';
import { useBudgetStore } from '@/stores/budgetStore';
import { Target, Calendar, Tag, Loader2 } from 'lucide-react';

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
    'Electronics', 'Wedding', 'Holiday', 'Other'
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
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Goal Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Goal Name
                    </label>
                    <div className="relative">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Emergency Fund, Vacation"
                            className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Target Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target Amount
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            placeholder="5,000"
                            min="0"
                            step="0.01"
                            className="w-full pl-8 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Deadline */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Target Date <span className="text-gray-500">(optional)</span>
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={minDate}
                            className="w-full pl-11 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category <span className="text-gray-500">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategory(category === cat ? '' : cat)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${category === cat
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
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
                        className="flex-1 py-3 px-4 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
