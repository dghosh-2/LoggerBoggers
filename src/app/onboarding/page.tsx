'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IncomeAllocationStep,
    makeDefaultIncomeAllocation,
    getIncomeAllocationTotal,
    type IncomeAllocation,
} from '@/components/onboarding/IncomeAllocationStep';

const STEPS = [
    { id: 'age', label: 'What is your age?', type: 'number', placeholder: 'e.g., 21' },
    { id: 'location', label: 'Where are you located?', type: 'text', placeholder: 'City, Country' },
    { id: 'riskTolerance', label: 'What is your risk tolerance?', type: 'select', options: ['Low', 'Medium', 'High', 'Aggressive'] },
    { id: 'debtProfile', label: 'Tell us about your debt profile.', type: 'textarea', placeholder: 'e.g., Student loans, Credit card debt, None...' },
    { id: 'incomeStatus', label: 'What is your current income status?', type: 'textarea', placeholder: 'e.g., Student, Full-time, Self-employed...' },
    { id: 'allocation', label: 'How should we allocate your income?', type: 'allocation' },
    { id: 'customRequest', label: 'Any additional requests or custom needs?', type: 'textarea', placeholder: 'How can we help you win Tartanhacks? (Natural language input)' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<any>({
        age: '',
        location: '',
        riskTolerance: 'Medium',
        debtProfile: '',
        incomeStatus: '',
        allocation: makeDefaultIncomeAllocation(20) satisfies IncomeAllocation,
        customRequest: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                // Redirect to stocks page on success
                router.push('/stocks');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    const step = STEPS[currentStep];
    const isFirstStep = currentStep === 0;
    const allocationValid =
        step.id !== 'allocation' ||
        (formData?.allocation &&
            Math.abs(getIncomeAllocationTotal(formData.allocation) - 100) < 0.01);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="max-w-xl w-full p-10">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-500"
                            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="mb-10">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Step {currentStep + 1} of {STEPS.length}
                    </span>
                    <h1 className="text-4xl font-bold mt-2 text-gray-900">
                        {step.label}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="min-h-[120px]">
                        {step.type === 'number' && (
                            <input
                                type="number"
                                name={step.id}
                                value={formData[step.id]}
                                onChange={handleChange}
                                required
                                className="w-full bg-white border-2 border-gray-300 rounded-xl px-5 py-4 text-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder={step.placeholder}
                            />
                        )}
                        {step.type === 'text' && (
                            <input
                                type="text"
                                name={step.id}
                                value={formData[step.id]}
                                onChange={handleChange}
                                required
                                className="w-full bg-white border-2 border-gray-300 rounded-xl px-5 py-4 text-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder={step.placeholder}
                            />
                        )}
                        {step.type === 'select' && (
                            <select
                                name={step.id}
                                value={formData[step.id]}
                                onChange={handleChange}
                                className="w-full bg-white border-2 border-gray-300 rounded-xl px-5 py-4 text-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            >
                                {step.options?.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                        {step.type === 'textarea' && (
                            <textarea
                                name={step.id}
                                value={formData[step.id]}
                                onChange={handleChange}
                                rows={4}
                                required
                                className="w-full bg-white border-2 border-gray-300 rounded-xl px-5 py-4 text-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                placeholder={step.placeholder}
                            ></textarea>
                        )}

                        {step.type === 'allocation' && (
                            <div className="rounded-xl border-2 border-gray-200 p-5">
                                <IncomeAllocationStep
                                    value={formData.allocation}
                                    onChange={(next) =>
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            allocation: next,
                                        }))
                                    }
                                />
                            </div>
                        )}
                    </div>

                    {/* Navigation buttons - show on ALL steps */}
                    <div className="flex gap-4">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="flex-1 py-4 rounded-xl font-semibold text-gray-700 border-2 border-gray-300 hover:bg-gray-50 transition-all"
                            >
                                Back
                            </button>
                        )}

                        {currentStep < STEPS.length - 1 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!allocationValid}
                                className={`${currentStep > 0 ? 'flex-[2]' : 'w-full'} py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-emerald-700 transition-all shadow-lg active:scale-[0.98] ${!allocationValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-[2] py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-emerald-700 transition-all shadow-lg active:scale-[0.98] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Saving...' : 'Finish Setup'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
