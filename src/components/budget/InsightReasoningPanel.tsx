'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, BarChart3, CheckCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import type { InsightReasoning, ReasoningStep } from '@/types/budget';

interface InsightReasoningPanelProps {
    reasoning: InsightReasoning;
    isExpanded: boolean;
    onToggle: () => void;
}

const PHASE_CONFIG: Record<string, {
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    data: {
        icon: <Database className="w-4 h-4" />,
        label: 'Data Used',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    analysis: {
        icon: <BarChart3 className="w-4 h-4" />,
        label: 'Analysis',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
    },
    decision: {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Decision',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
};

function StepCard({ step, index }: { step: ReasoningStep; index: number }) {
    const config = PHASE_CONFIG[step.phase];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
        >
            {/* Step Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className={config.color}>{config.icon}</div>
                <span className={`text-xs font-medium uppercase tracking-wide ${config.color}`}>
                    {config.label}
                </span>
            </div>

            {/* Title + Detail */}
            <p className="text-sm font-medium text-white mb-1">{step.title}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{step.detail}</p>

            {/* Data Points */}
            {step.dataPoints && step.dataPoints.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {step.dataPoints.map((dp, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between px-2 py-1 rounded bg-black/20 text-xs"
                        >
                            <span className="text-gray-500 truncate mr-2">{dp.label}</span>
                            <span className="text-gray-300 font-mono whitespace-nowrap">
                                {dp.unit === '$' ? `$${dp.value}` : dp.value}{dp.unit && dp.unit !== '$' ? ` ${dp.unit}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export function InsightReasoningPanel({ reasoning, isExpanded, onToggle }: InsightReasoningPanelProps) {
    return (
        <div className="mt-2">
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors group"
            >
                <Shield className="w-3 h-3" />
                <span>View Reasoning</span>
                {isExpanded ? (
                    <ChevronUp className="w-3 h-3 transition-transform" />
                ) : (
                    <ChevronDown className="w-3 h-3 transition-transform" />
                )}
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 space-y-2">
                            {/* Data Source */}
                            <p className="text-xs text-gray-600 italic">
                                Source: {reasoning.dataSourceDescription}
                            </p>

                            {/* Reasoning Steps */}
                            {reasoning.steps.map((step, i) => (
                                <StepCard key={i} step={step} index={i} />
                            ))}

                            {/* Confidence Badge */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-16 rounded-full bg-gray-700 overflow-hidden`}>
                                        <div
                                            className={`h-full rounded-full ${
                                                reasoning.confidence >= 0.8 ? 'bg-emerald-500' :
                                                reasoning.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${reasoning.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {Math.round(reasoning.confidence * 100)}% confidence
                                    </span>
                                </div>
                            </div>

                            {/* Alternative Actions */}
                            {reasoning.alternativeActions.length > 0 && (
                                <div className="pt-1">
                                    <p className="text-xs text-gray-600 mb-1">Other options:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {reasoning.alternativeActions.map((alt, i) => (
                                            <span
                                                key={i}
                                                className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
                                            >
                                                {alt}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
