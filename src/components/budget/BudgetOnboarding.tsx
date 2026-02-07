'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import {
    Target,
    Sparkles,
    PiggyBank,
    TrendingUp,
    Shield,
    ChevronRight,
    ChevronLeft,
    Loader2,
    MessageSquare,
    DollarSign,
    Calendar,
    Zap,
    CheckCircle,
} from 'lucide-react';
import type { BudgetPriority } from '@/types/budget';

interface BudgetOnboardingProps {
    onComplete: (preferences: BudgetPreferences) => void;
}

export interface BudgetPreferences {
    priority: BudgetPriority;
    monthlyIncome: number;
    savingsGoal: string;
    financialGoals: string;
    spendingConcerns: string;
    protectedCategories: string[];
}

const STEPS = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'priority', title: 'Priority' },
    { id: 'income', title: 'Income' },
    { id: 'goals', title: 'Goals' },
    { id: 'concerns', title: 'Concerns' },
    { id: 'protected', title: 'Protected' },
    { id: 'processing', title: 'Processing' },
];

const PRIORITY_OPTIONS: { value: BudgetPriority; label: string; description: string; icon: React.ElementType; color: string }[] = [
    {
        value: 'aggressive',
        label: 'Aggressive Saver',
        description: 'Maximize savings (30%+ of income). Cut discretionary spending aggressively.',
        icon: TrendingUp,
        color: 'from-emerald-500 to-teal-500',
    },
    {
        value: 'balanced',
        label: 'Balanced',
        description: 'Healthy savings (20% of income) while maintaining quality of life.',
        icon: Target,
        color: 'from-blue-500 to-indigo-500',
    },
    {
        value: 'lifestyle',
        label: 'Lifestyle First',
        description: 'Modest savings (10% of income). Prioritize experiences and comfort.',
        icon: Sparkles,
        color: 'from-purple-500 to-pink-500',
    },
];

const PROTECTED_CATEGORIES = [
    { id: 'rent', label: 'Rent/Mortgage', icon: '🏠' },
    { id: 'utilities', label: 'Utilities', icon: '💡' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️' },
    { id: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { id: 'groceries', label: 'Groceries', icon: '🛒' },
    { id: 'transportation', label: 'Transportation', icon: '🚗' },
    { id: 'childcare', label: 'Childcare', icon: '👶' },
    { id: 'education', label: 'Education', icon: '📚' },
];

export function BudgetOnboarding({ onComplete }: BudgetOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [preferences, setPreferences] = useState<BudgetPreferences>({
        priority: 'balanced',
        monthlyIncome: 0,
        savingsGoal: '',
        financialGoals: '',
        spendingConcerns: '',
        protectedCategories: ['rent', 'utilities', 'insurance'],
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            if (STEPS[currentStep + 1].id === 'processing') {
                handleComplete();
            } else {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = async () => {
        setCurrentStep(STEPS.length - 1); // Go to processing step
        setIsProcessing(true);
        
        // Store preferences in localStorage
        localStorage.setItem('budget_preferences', JSON.stringify(preferences));
        localStorage.setItem('budget_onboarding_complete', 'true');
        
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        setIsProcessing(false);
        onComplete(preferences);
    };

    const updatePreference = <K extends keyof BudgetPreferences>(key: K, value: BudgetPreferences[K]) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    };

    const toggleProtectedCategory = (categoryId: string) => {
        setPreferences(prev => ({
            ...prev,
            protectedCategories: prev.protectedCategories.includes(categoryId)
                ? prev.protectedCategories.filter(c => c !== categoryId)
                : [...prev.protectedCategories, categoryId],
        }));
    };

    const canProceed = () => {
        const step = STEPS[currentStep];
        switch (step.id) {
            case 'welcome':
                return true;
            case 'priority':
                return true;
            case 'income':
                return preferences.monthlyIncome > 0;
            case 'goals':
                return preferences.financialGoals.trim().length > 0;
            case 'concerns':
                return true; // Optional
            case 'protected':
                return preferences.protectedCategories.length > 0;
            default:
                return true;
        }
    };

    const renderStep = () => {
        const step = STEPS[currentStep];

        switch (step.id) {
            case 'welcome':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-6"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center"
                        >
                            <Sparkles className="w-12 h-12 text-emerald-400" />
                        </motion.div>
                        
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-3">
                                Budget Setup
                            </h2>
                            <p className="text-gray-400 max-w-md mx-auto">
                                Let's set up your budget based on your spending patterns
                                and preferences.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4">
                            {[
                                { icon: Target, label: 'Smart Allocation' },
                                { icon: Zap, label: 'Real-time Tracking' },
                                { icon: PiggyBank, label: 'Savings Goals' },
                                { icon: Shield, label: 'Protected Spending' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={feature.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="flex items-center gap-2 p-3 rounded-lg bg-white/5"
                                >
                                    <feature.icon className="w-5 h-5 text-emerald-400" />
                                    <span className="text-sm text-gray-300">{feature.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'priority':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                What's your budgeting style?
                            </h2>
                            <p className="text-gray-400">
                                This helps us tailor your budget to your financial personality.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {PRIORITY_OPTIONS.map((option) => (
                                <motion.button
                                    key={option.value}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => updatePreference('priority', option.value)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                        preferences.priority === option.value
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${option.color}`}>
                                            <option.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-white">{option.label}</span>
                                                {preferences.priority === option.value && (
                                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'income':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                What's your monthly income?
                            </h2>
                            <p className="text-gray-400">
                                This helps us calculate your budget allocations accurately.
                            </p>
                        </div>

                        <div className="max-w-sm mx-auto">
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                                <input
                                    type="number"
                                    value={preferences.monthlyIncome || ''}
                                    onChange={(e) => updatePreference('monthlyIncome', Number(e.target.value))}
                                    placeholder="5,000"
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-2xl font-semibold placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <p className="text-center text-sm text-gray-500 mt-3">
                                After taxes, per month
                            </p>
                        </div>

                        {preferences.monthlyIncome > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 max-w-sm mx-auto"
                            >
                                <p className="text-sm text-emerald-300 text-center">
                                    Based on your {preferences.priority} style, we'll target{' '}
                                    <span className="font-bold">
                                        ${(preferences.monthlyIncome * (preferences.priority === 'aggressive' ? 0.3 : preferences.priority === 'balanced' ? 0.2 : 0.1)).toLocaleString()}
                                    </span>{' '}
                                    in monthly savings.
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                );

            case 'goals':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                What are your financial goals?
                            </h2>
                            <p className="text-gray-400">
                                Tell us what you're working towards. We'll help you stay on track.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto">
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <textarea
                                    value={preferences.financialGoals}
                                    onChange={(e) => updatePreference('financialGoals', e.target.value)}
                                    placeholder="e.g., Save for a house down payment, build an emergency fund, pay off student loans, save for a vacation..."
                                    rows={4}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Be as specific as you'd like. We'll use this to personalize your insights.
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                            {['Emergency fund', 'House down payment', 'Vacation', 'Pay off debt', 'Retirement', 'New car'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => {
                                        const current = preferences.financialGoals;
                                        updatePreference('financialGoals', current ? `${current}, ${suggestion}` : suggestion);
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
                                >
                                    + {suggestion}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'concerns':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Any spending concerns?
                            </h2>
                            <p className="text-gray-400">
                                Tell us about areas where you'd like to cut back or improve.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto">
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <textarea
                                    value={preferences.spendingConcerns}
                                    onChange={(e) => updatePreference('spendingConcerns', e.target.value)}
                                    placeholder="e.g., I spend too much on dining out, subscriptions I don't use, impulse shopping..."
                                    rows={4}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Optional, but helps us give you better recommendations.
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                            {['Dining out', 'Subscriptions', 'Shopping', 'Entertainment', 'Coffee/drinks', 'Delivery fees'].map((concern) => (
                                <button
                                    key={concern}
                                    onClick={() => {
                                        const current = preferences.spendingConcerns;
                                        updatePreference('spendingConcerns', current ? `${current}, ${concern}` : concern);
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
                                >
                                    + {concern}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'protected':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Protected Categories
                            </h2>
                            <p className="text-gray-400">
                                Select expenses that should never be reduced by automatic adjustments.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                            {PROTECTED_CATEGORIES.map((category) => (
                                <motion.button
                                    key={category.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleProtectedCategory(category.id)}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        preferences.protectedCategories.includes(category.id)
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                                >
                                    <div className="text-2xl mb-2">{category.icon}</div>
                                    <span className="text-sm font-medium text-white">{category.label}</span>
                                    {preferences.protectedCategories.includes(category.id) && (
                                        <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto mt-2" />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                );

            case 'processing':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-6 py-8"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center"
                        >
                            <Sparkles className="w-10 h-10 text-emerald-400" />
                        </motion.div>
                        
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-3">
                                Creating Your Budget
                            </h2>
                            <p className="text-gray-400 max-w-md mx-auto">
                                We are analyzing your spending patterns and creating a personalized budget...
                            </p>
                        </div>

                        <div className="space-y-2 max-w-sm mx-auto">
                            {[
                                'Analyzing transaction history...',
                                'Calculating category allocations...',
                                'Setting up savings targets...',
                            ].map((step, i) => (
                                <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.5 }}
                                    className="flex items-center gap-3 text-left"
                                >
                                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                    <span className="text-sm text-gray-300">{step}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    const stepIndex = STEPS.findIndex(s => s.id === STEPS[currentStep].id);
    const progress = ((stepIndex + 1) / STEPS.length) * 100;

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl"
            >
                <GlassCard className="p-8">
                    {/* Progress Bar */}
                    {STEPS[currentStep].id !== 'processing' && (
                        <div className="mb-8">
                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                <span>Step {currentStep + 1} of {STEPS.length - 1}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step Content */}
                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>

                    {/* Navigation */}
                    {STEPS[currentStep].id !== 'processing' && (
                        <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                            <GlassButton
                                variant="secondary"
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                className={currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </GlassButton>

                            <GlassButton
                                onClick={handleNext}
                                disabled={!canProceed()}
                            >
                                {currentStep === STEPS.length - 2 ? 'Create Budget' : 'Continue'}
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </GlassButton>
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </div>
    );
}
