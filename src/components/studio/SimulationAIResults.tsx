"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    Home,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    AlertTriangle,
    Sparkles,
    CheckSquare,
    DollarSign,
    ArrowRight
} from 'lucide-react';
import { SimulationOutput } from '@/lib/simulation-engine';
import { cn } from '@/lib/utils';

export interface KPI {
    label: string;
    value: number;
    change?: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    unit?: string;
    icon?: 'home' | 'cart' | 'dollar' | 'trending';
}

export interface Recommendation {
    description: string;
    adjustment?: {
        type: 'income' | 'expense';
        amount: number;
        category?: string;
    };
}

export interface StructuredAIResponse {
    headline: string;
    kpis: KPI[];
    recommendations: Recommendation[];
    risks: string[];
    opportunities: string[];
    rawText?: string;
}

export interface SimulationAIResultsProps {
    aiResponse: string | null;
    simulationResult: SimulationOutput | null;
    onApplyRecommendation?: (adjustment: { type: 'income' | 'expense'; amount: number; description: string }) => void;
}

const iconMap = {
    home: Home,
    cart: ShoppingCart,
    dollar: DollarSign,
    trending: TrendingUp,
};

// Helper function to clean markdown formatting from text
function cleanMarkdown(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/^[-•]\s+/gm, '') // Remove bullet points
        .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
        .trim();
}

// Parse AI response to extract structured data
function parseAIResponse(text: string, simulationResult: SimulationOutput | null): StructuredAIResponse {
    const result: StructuredAIResponse = {
        headline: '',
        kpis: [],
        recommendations: [],
        risks: [],
        opportunities: [],
        rawText: text
    };

    // Split by common section headers
    const sections = {
        headline: '',
        recommendations: [] as string[],
        risks: [] as string[],
        opportunities: [] as string[]
    };

    // Extract headline - look for HEADLINE: or first sentence
    const headlineMatch = text.match(/HEADLINE:([^\n]+)/i);
    if (headlineMatch) {
        sections.headline = cleanMarkdown(headlineMatch[1]);
    } else {
        // Use first substantial sentence
        const firstSentence = text.split('\n')[0];
        if (firstSentence && firstSentence.length > 20) {
            sections.headline = cleanMarkdown(firstSentence);
        }
    }

    // Extract recommendations section
    const recommendationSection = text.match(/RECOMMENDATIONS?:([\s\S]*?)(?=RISKS?:|OPPORTUNITIES?:|$)/i);
    if (recommendationSection) {
        sections.recommendations = recommendationSection[1]
            .split('\n')
            .map(line => cleanMarkdown(line))
            .filter(line => line.length > 10);
    }

    // Extract risks section
    const riskSection = text.match(/RISKS?:([\s\S]*?)(?=RECOMMENDATIONS?:|OPPORTUNITIES?:|$)/i);
    if (riskSection) {
        sections.risks = riskSection[1]
            .split('\n')
            .map(line => cleanMarkdown(line))
            .filter(line => line.length > 10);
    }

    // Extract opportunities section
    const opportunitySection = text.match(/OPPORTUNITIES?:([\s\S]*?)(?=RECOMMENDATIONS?:|RISKS?:|$)/i);
    if (opportunitySection) {
        sections.opportunities = opportunitySection[1]
            .split('\n')
            .map(line => cleanMarkdown(line))
            .filter(line => line.length > 10);
    }

    // Build KPIs from simulation result
    if (simulationResult) {
        const lastProjection = simulationResult.projections[simulationResult.projections.length - 1];

        result.kpis.push({
            label: 'End Balance',
            value: lastProjection.balance,
            sentiment: lastProjection.balance >= 0 ? 'positive' : 'negative',
            icon: 'dollar'
        });

        result.kpis.push({
            label: 'Total Savings',
            value: simulationResult.totalSavings,
            sentiment: simulationResult.totalSavings >= 0 ? 'positive' : 'negative',
            icon: 'trending'
        });

        result.kpis.push({
            label: 'Avg Monthly',
            value: Math.round(simulationResult.totalSavings / simulationResult.projections.length),
            unit: 'month',
            sentiment: simulationResult.totalSavings >= 0 ? 'positive' : 'neutral',
            icon: 'dollar'
        });
    }

    // Process recommendations
    sections.recommendations.forEach(line => {
        if (line.length > 10) {
            const amountMatch = line.match(/(\$[\d,]+)/);
            const increaseMatch = line.match(/increase|add|raise/i);
            const decreaseMatch = line.match(/decrease|cut|reduce|lower/i);

            if (amountMatch) {
                const amount = parseInt(amountMatch[1].replace(/[$,]/g, ''));
                const type: 'income' | 'expense' = line.match(/income|salary|wage/i) ? 'income' : 'expense';

                result.recommendations.push({
                    description: line,
                    adjustment: {
                        type,
                        amount: decreaseMatch ? -amount : amount
                    }
                });
            } else {
                result.recommendations.push({
                    description: line
                });
            }
        }
    });

    result.risks = sections.risks;
    result.opportunities = sections.opportunities;
    result.headline = sections.headline;

    // Fallback headline if nothing found
    if (!result.headline && simulationResult) {
        const endBalance = simulationResult.projections[simulationResult.projections.length - 1].balance;
        const impact = endBalance >= 0 ? 'positive' : 'negative';
        result.headline = `Simulation projects ${impact} outcome with $${Math.abs(endBalance).toLocaleString()} final balance`;
    }

    return result;
}

export function SimulationAIResults({
    aiResponse,
    simulationResult,
    onApplyRecommendation
}: SimulationAIResultsProps) {
    if (!aiResponse && (!simulationResult || !simulationResult.insights?.length)) {
        return null;
    }

    const structured = aiResponse
        ? parseAIResponse(aiResponse, simulationResult)
        : {
            headline: 'Simulation Complete',
            kpis: [],
            recommendations: [],
            risks: [],
            opportunities: [],
        };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            {/* Headline */}
            {structured.headline && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <h4 className="text-base font-semibold text-foreground leading-snug">
                        {structured.headline}
                    </h4>
                </div>
            )}

            {/* KPI Row */}
            {structured.kpis.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    {structured.kpis.map((kpi, i) => {
                        const Icon = kpi.icon ? iconMap[kpi.icon] : DollarSign;
                        const isNegative = kpi.sentiment === 'negative';
                        const isPositive = kpi.sentiment === 'positive';

                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className={cn(
                                    "p-3 rounded-xl border-2",
                                    isNegative && "bg-destructive/5 border-destructive/30",
                                    isPositive && "bg-success/5 border-success/30",
                                    !isNegative && !isPositive && "bg-secondary/30 border-border"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-foreground-muted font-medium">{kpi.label}</span>
                                    <Icon className={cn(
                                        "w-3.5 h-3.5",
                                        isNegative && "text-destructive",
                                        isPositive && "text-success",
                                        !isNegative && !isPositive && "text-foreground-muted"
                                    )} />
                                </div>
                                <p className={cn(
                                    "text-lg font-bold font-mono",
                                    isNegative && "text-destructive",
                                    isPositive && "text-success",
                                    !isNegative && !isPositive && "text-foreground"
                                )}>
                                    ${Math.abs(kpi.value).toLocaleString()}
                                </p>
                                {kpi.change && (
                                    <p className="text-xs text-foreground-muted mt-0.5">{kpi.change}</p>
                                )}
                                {kpi.unit && (
                                    <p className="text-xs text-foreground-muted mt-0.5">per {kpi.unit}</p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Recommendations */}
            {structured.recommendations.length > 0 && (
                <ActionPlan
                    recommendations={structured.recommendations}
                    onApplyRecommendation={onApplyRecommendation}
                />
            )}

            {/* Simulation Insights (if no AI response) */}
            {!aiResponse && simulationResult?.insights && simulationResult.insights.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Insights</h5>
                    <div className="flex flex-wrap gap-2">
                        {simulationResult.insights.map((insight, i) => (
                            <div
                                key={i}
                                className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-foreground"
                            >
                                {insight}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Separate component for action plan
export function ActionPlan({
    recommendations,
    onApplyRecommendation
}: {
    recommendations: Recommendation[];
    onApplyRecommendation?: (adjustment: { type: 'income' | 'expense'; amount: number; description: string }) => void;
}) {
    if (recommendations.length === 0) return null;

    return (
        <div className="space-y-2">
            <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-3.5 h-3.5" />
                Action Plan
            </h5>
            <div className="space-y-2">
                {recommendations.map((rec, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-colors group"
                    >
                        <div className="flex-1">
                            <p className="text-sm text-foreground leading-relaxed">{rec.description}</p>
                            {rec.adjustment && (
                                <p className="text-xs text-foreground-muted mt-1.5">
                                    {rec.adjustment.type === 'income' ? 'Income' : 'Expense'} adjustment:
                                    {rec.adjustment.amount >= 0 ? ' +' : ' '}${Math.abs(rec.adjustment.amount).toLocaleString()}
                                    {rec.adjustment.category && ` (${rec.adjustment.category})`}
                                </p>
                            )}
                        </div>
                        {rec.adjustment && onApplyRecommendation && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onApplyRecommendation({
                                    type: rec.adjustment!.type,
                                    amount: rec.adjustment!.amount,
                                    description: rec.description
                                })}
                                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                Apply
                                <ArrowRight className="w-3 h-3" />
                            </motion.button>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Separate component for risks and opportunities
export function RisksAndOpportunities({
    risks,
    opportunities
}: {
    risks: string[];
    opportunities: string[];
}) {
    if (risks.length === 0 && opportunities.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
        >
            {/* Risks */}
            {risks.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        Risks
                    </h5>
                    <div className="space-y-1.5">
                        {risks.map((risk, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                                <p className="text-xs text-foreground leading-relaxed">{risk}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Opportunities */}
            {opportunities.length > 0 && (
                <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-success" />
                        Opportunities
                    </h5>
                    <div className="space-y-1.5">
                        {opportunities.map((opp, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-success/10 border border-success/20">
                                <p className="text-xs text-foreground leading-relaxed">{opp}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Export parsed data hook for parent components that need the structured data
export function useSimulationData(aiResponse: string | null, simulationResult: SimulationOutput | null) {
    return React.useMemo(() => {
        if (!aiResponse && (!simulationResult || !simulationResult.insights?.length)) {
            return null;
        }

        return aiResponse
            ? parseAIResponse(aiResponse, simulationResult)
            : {
                headline: 'Simulation Complete',
                kpis: [],
                recommendations: [],
                risks: [],
                opportunities: [],
            };
    }, [aiResponse, simulationResult]);
}
