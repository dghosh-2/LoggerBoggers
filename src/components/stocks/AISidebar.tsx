'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    TrendingUp, 
    TrendingDown, 
    AlertTriangle, 
    Target,
    Lightbulb,
    Shield,
    ChevronDown,
    Zap,
    Activity,
} from 'lucide-react';
import { DogRunnerSimple } from '@/components/ui/DogLoadingAnimation';

interface AISidebarProps {
    recommendations: any | null;
    stocksData: any[] | null;
    riskData: any[];
    loading: boolean;
    query: string;
    extractedQuestions?: string[];
    userPreferences?: {
        riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
        investmentHorizon?: 'short' | 'medium' | 'long';
    };
}

export function AISidebar({ 
    recommendations, 
    stocksData, 
    riskData,
    loading, 
    query,
    extractedQuestions = [],
    userPreferences = {
        riskTolerance: 'moderate',
        investmentHorizon: 'medium',
    }
}: AISidebarProps) {
    const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'insights', 'risk']);
    
    const toggleSection = (section: string) => {
        setExpandedSections(prev => 
            prev.includes(section) 
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    // Calculate quick stats
    const getQuickStats = () => {
        if (!stocksData || stocksData.length === 0) return null;
        
        const stats = stocksData.map(stock => {
            const first = stock.data[0]?.close || 0;
            const last = stock.data[stock.data.length - 1]?.close || 0;
            const change = ((last - first) / first) * 100;
            return { symbol: stock.symbol, change, price: last };
        });
        
        const avgChange = stats.reduce((sum, s) => sum + s.change, 0) / stats.length;
        const bestPerformer = stats.reduce((best, s) => s.change > best.change ? s : best, stats[0]);
        
        return { avgChange, bestPerformer, stats };
    };

    const quickStats = getQuickStats();

    // Get risk summary
    const getRiskSummary = () => {
        if (!riskData || riskData.length === 0) return null;
        
        const avgVolatility = riskData.reduce((sum, r) => sum + (r.metrics?.volatility || 0), 0) / riskData.length;
        const overallRisk = avgVolatility > 0.4 ? 'high' : avgVolatility > 0.25 ? 'medium' : 'low';
        
        return {
            overallRisk,
            avgVolatility: avgVolatility * 100,
            stocks: riskData.map(r => ({
                symbol: r.symbol,
                volatility: (r.metrics?.volatility || 0) * 100,
                maxDrawdown: (r.metrics?.maxDrawdown || 0) * 100,
                riskLevel: r.riskLevel,
            })),
        };
    };

    const riskSummary = getRiskSummary();

    // Generate personalized insights
    const getPersonalizedInsights = () => {
        const insights: { icon: any; title: string; description: string; type: 'positive' | 'warning' | 'neutral' }[] = [];
        
        if (!quickStats) return insights;

        if (userPreferences.riskTolerance === 'conservative' && riskSummary?.overallRisk === 'high') {
            insights.push({
                icon: AlertTriangle,
                title: 'Risk Alert',
                description: `Higher volatility than your conservative profile suggests.`,
                type: 'warning'
            });
        }

        if (quickStats.avgChange > 5) {
            insights.push({
                icon: TrendingUp,
                title: 'Strong Performance',
                description: `+${quickStats.avgChange.toFixed(1)}% average gain over the period.`,
                type: 'positive'
            });
        } else if (quickStats.avgChange < -5) {
            insights.push({
                icon: TrendingDown,
                title: 'Market Downturn',
                description: `${quickStats.avgChange.toFixed(1)}% decline. May present opportunities.`,
                type: 'warning'
            });
        }

        if (quickStats.bestPerformer && quickStats.bestPerformer.change > 10) {
            insights.push({
                icon: Zap,
                title: 'Top Performer',
                description: `${quickStats.bestPerformer.symbol} leads with +${quickStats.bestPerformer.change.toFixed(1)}%`,
                type: 'positive'
            });
        }

        if (stocksData && stocksData.length === 1) {
            insights.push({
                icon: Shield,
                title: 'Diversification',
                description: 'Consider comparing with similar stocks.',
                type: 'neutral'
            });
        }

        return insights.slice(0, 4);
    };

    const personalizedInsights = getPersonalizedInsights();

    // Section component
    const Section = ({ 
        id, 
        title, 
        icon: Icon, 
        children,
    }: { 
        id: string; 
        title: string; 
        icon: any; 
        children: React.ReactNode;
    }) => {
        const isExpanded = expandedSections.includes(id);
        
        return (
            <div className="mb-1">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full flex items-center justify-between py-2.5 hover:opacity-80 transition-opacity"
                >
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="w-4 h-4 text-foreground-muted" />
                    </motion.div>
                </button>
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="pb-3 pt-1">
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="p-5 h-full flex flex-col items-center justify-center">
                <DogRunnerSimple size="sm" className="w-full mb-4" />
                <div className="flex items-center gap-2">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                    </motion.div>
                    <span className="text-sm text-foreground-muted">Analyzing...</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (!stocksData || stocksData.length === 0) {
        return (
            <div className="p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-medium text-sm">AI Insights</span>
                </div>
                <p className="text-sm text-foreground-muted">
                    Search for stocks to get personalized insights and analysis.
                </p>
            </div>
        );
    }

    return (
        <motion.div 
            className="p-5 h-full flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            {/* Scrollable content */}
            <div className="flex-1 space-y-1 min-h-0">
                {/* Summary Section */}
                <Section id="summary" title="Summary" icon={Sparkles}>
                    {recommendations?.summary ? (
                        <p className="text-sm text-foreground-secondary leading-relaxed">
                            {recommendations.summary}
                        </p>
                    ) : (
                        <p className="text-sm text-foreground-secondary leading-relaxed">
                            Analyzing {stocksData.map(s => s.symbol).join(', ')} performance.
                        </p>
                    )}
                    
                    {/* Quick stats */}
                    {quickStats && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="glass-insight">
                                <p className="text-xs text-foreground-muted mb-0.5">Avg. Return</p>
                                <p className={`text-base font-bold ${quickStats.avgChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {quickStats.avgChange >= 0 ? '+' : ''}{quickStats.avgChange.toFixed(1)}%
                                </p>
                            </div>
                            <div className="glass-insight">
                                <p className="text-xs text-foreground-muted mb-0.5">Best</p>
                                <p className="text-base font-bold text-success">
                                    {quickStats.bestPerformer?.symbol}
                                </p>
                            </div>
                        </div>
                    )}
                </Section>

                {/* Key Insights Section */}
                <Section id="insights" title="Key Insights" icon={Lightbulb}>
                    <div className="space-y-2">
                        {personalizedInsights.length > 0 ? (
                            personalizedInsights.map((insight, idx) => (
                                <motion.div
                                    key={idx}
                                    className="glass-insight flex items-start gap-2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                        insight.type === 'positive' ? 'bg-success/15 text-success' :
                                        insight.type === 'warning' ? 'bg-warning/15 text-warning' :
                                        'bg-primary/15 text-primary'
                                    }`}>
                                        <insight.icon className="w-3 h-3" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold mb-0.5">{insight.title}</p>
                                        <p className="text-xs text-foreground-muted leading-relaxed">
                                            {insight.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <p className="text-xs text-foreground-muted">
                                Generating insights...
                            </p>
                        )}

                        {/* AI Recommendations */}
                        {recommendations?.insights?.slice(0, 2).map((insight: any, idx: number) => (
                            <motion.div
                                key={`rec-${idx}`}
                                className="glass-insight flex items-start gap-2"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                                <div className="p-1.5 rounded-lg flex-shrink-0 bg-primary/15 text-primary">
                                    <Target className="w-3 h-3" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold mb-0.5">{insight.title}</p>
                                    <p className="text-xs text-foreground-muted leading-relaxed">
                                        {insight.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Section>

                {/* Risk Analysis Section */}
                {riskSummary && (
                    <Section id="risk" title="Risk Analysis" icon={Activity}>
                        <div className="space-y-3">
                            {/* Overall risk indicator */}
                            <div className="glass-insight">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-foreground-muted">Overall Risk</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        riskSummary.overallRisk === 'high' ? 'bg-destructive/15 text-destructive' :
                                        riskSummary.overallRisk === 'medium' ? 'bg-warning/15 text-warning' :
                                        'bg-success/15 text-success'
                                    }`}>
                                        {riskSummary.overallRisk.toUpperCase()}
                                    </span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <motion.div 
                                        className={`h-full rounded-full ${
                                            riskSummary.overallRisk === 'high' ? 'bg-destructive' :
                                            riskSummary.overallRisk === 'medium' ? 'bg-warning' :
                                            'bg-success'
                                        }`}
                                        initial={{ width: 0 }}
                                        animate={{ 
                                            width: riskSummary.overallRisk === 'high' ? '85%' :
                                                   riskSummary.overallRisk === 'medium' ? '50%' : '25%'
                                        }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                    />
                                </div>
                            </div>

                            {/* Per-stock risk */}
                            {riskSummary.stocks.map((stock) => (
                                <div key={stock.symbol} className="glass-insight">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold">{stock.symbol}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            stock.riskLevel === 'high' || stock.riskLevel === 'very_high' 
                                                ? 'bg-destructive/15 text-destructive' 
                                                : stock.riskLevel === 'medium' 
                                                    ? 'bg-warning/15 text-warning' 
                                                    : 'bg-success/15 text-success'
                                        }`}>
                                            {stock.riskLevel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-foreground-muted">Volatility</span>
                                            <p className="font-medium">{stock.volatility.toFixed(1)}%</p>
                                        </div>
                                        <div>
                                            <span className="text-foreground-muted">Max Drawdown</span>
                                            <p className="font-medium text-destructive">-{stock.maxDrawdown.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Recommendations Section */}
                {recommendations?.riskAlignment && (
                    <Section id="recommendations" title="Recommendations" icon={Shield}>
                        <p className="text-xs text-foreground-muted leading-relaxed">
                            {recommendations.riskAlignment}
                        </p>
                    </Section>
                )}
            </div>

            {/* User Preference Badge */}
            <div className="mt-4 pt-3 flex-shrink-0">
                <div className="glass-divider mb-3" />
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                    <span className="glass-pill !py-1 !px-2.5 !text-[10px]">
                        {userPreferences.riskTolerance} risk
                    </span>
                    <span className="glass-pill !py-1 !px-2.5 !text-[10px]">
                        {userPreferences.investmentHorizon} term
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default AISidebar;
