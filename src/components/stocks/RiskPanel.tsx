'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Activity, BarChart3, Shield } from 'lucide-react';
import { ChartContainer, MetricCard } from './ChartContainer';
import { RiskGauge, RiskBar, RiskLevel } from './RiskGauge';
import { RISK_COLORS } from '@/lib/visualization-schema';

interface RiskMetrics {
    symbol: string;
    metrics: {
        volatility: number;
        maxDrawdown: number;
        sharpeRatio?: number;
        beta?: number;
        var95?: number;
    };
    riskLevel: 'low' | 'medium' | 'high' | 'very_high';
}

interface RiskPanelProps {
    riskData: RiskMetrics[];
    layout?: 'compact' | 'detailed' | 'comparison';
    delay?: number;
    useLiquidGlass?: boolean;
}

/**
 * Comprehensive risk visualization panel
 */
export function RiskPanel({ riskData, layout = 'detailed', delay = 0, useLiquidGlass = true }: RiskPanelProps) {
    if (!riskData || riskData.length === 0) {
        return null;
    }

    if (layout === 'compact') {
        return <CompactRiskPanel riskData={riskData} delay={delay} useLiquidGlass={useLiquidGlass} />;
    }

    if (layout === 'comparison') {
        return <ComparisonRiskPanel riskData={riskData} delay={delay} useLiquidGlass={useLiquidGlass} />;
    }

    return <DetailedRiskPanel riskData={riskData} delay={delay} useLiquidGlass={useLiquidGlass} />;
}

/**
 * Compact risk display with gauges
 */
function CompactRiskPanel({ riskData, delay, useLiquidGlass = true }: { riskData: RiskMetrics[]; delay: number; useLiquidGlass?: boolean }) {
    return (
        <ChartContainer
            title="Risk Overview"
            subtitle="Key risk metrics at a glance"
            height="sm"
            delay={delay}
            showActions={false}
            useLiquidGlass={useLiquidGlass}
        >
            <div className="h-full flex items-center justify-around">
                {riskData.map((risk, idx) => (
                    <RiskGauge
                        key={risk.symbol}
                        value={risk.metrics.volatility * 100}
                        label="Volatility"
                        symbol={risk.symbol}
                        size="sm"
                        delay={delay + idx * 100}
                    />
                ))}
            </div>
        </ChartContainer>
    );
}

/**
 * Detailed risk panel with all metrics
 */
function DetailedRiskPanel({ riskData, delay, useLiquidGlass = true }: { riskData: RiskMetrics[]; delay: number; useLiquidGlass?: boolean }) {
    const containerClass = useLiquidGlass ? "liquid-glass rounded-3xl p-6" : "card-elevated rounded-2xl p-6";
    const borderClass = useLiquidGlass ? "border-primary/10" : "border-border";
    const bgClass = useLiquidGlass ? "bg-primary/5 border border-primary/10" : "bg-secondary";

    return (
        <motion.div
            className={containerClass}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay / 1000 }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="p-2 rounded-xl bg-warning/15 border border-warning/20">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Risk Analysis</h3>
                    <p className="text-sm text-foreground-muted">Comprehensive risk metrics</p>
                </div>
            </div>

            {/* Risk Gauges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 relative z-10">
                {riskData.map((risk, idx) => (
                    <React.Fragment key={risk.symbol}>
                        <RiskGauge
                            value={risk.metrics.volatility * 100}
                            label="Volatility"
                            symbol={risk.symbol}
                            description="Annualized"
                            size="md"
                            delay={delay + 100 + idx * 50}
                        />
                        <RiskGauge
                            value={risk.metrics.maxDrawdown * 100}
                            label="Max Drawdown"
                            symbol={risk.symbol}
                            description="Peak to trough"
                            size="md"
                            delay={delay + 150 + idx * 50}
                        />
                    </React.Fragment>
                ))}
            </div>

            {/* Risk Bars */}
            <div className="space-y-4 mb-6 relative z-10">
                <h4 className="text-sm font-semibold text-foreground-muted">Risk Comparison</h4>
                {riskData.map((risk, idx) => (
                    <div key={risk.symbol} className="space-y-3">
                        <RiskBar
                            value={risk.metrics.volatility * 100}
                            label="Volatility"
                            symbol={risk.symbol}
                            delay={delay + 200 + idx * 100}
                        />
                        <RiskBar
                            value={risk.metrics.maxDrawdown * 100}
                            label="Max Drawdown"
                            symbol={risk.symbol}
                            delay={delay + 250 + idx * 100}
                        />
                    </div>
                ))}
            </div>

            {/* Risk Level Summary */}
            <div className={`border-t ${borderClass} pt-4 relative z-10`}>
                <h4 className="text-sm font-semibold text-foreground-muted mb-3">Risk Assessment</h4>
                <div className="flex flex-wrap gap-4">
                    {riskData.map((risk, idx) => (
                        <div
                            key={risk.symbol}
                            className={`flex items-center gap-3 px-4 py-2 rounded-xl ${bgClass}`}
                        >
                            <span className="font-semibold">{risk.symbol}</span>
                            <RiskLevel
                                level={risk.riskLevel === 'low' ? 'low' : risk.riskLevel}
                                delay={delay + 300 + idx * 50}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Metrics */}
            {riskData.some(r => r.metrics.sharpeRatio !== undefined) && (
                <div className={`mt-6 pt-4 border-t ${borderClass} relative z-10`}>
                    <h4 className="text-sm font-semibold text-foreground-muted mb-3">Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {riskData.map((risk, idx) => (
                            <React.Fragment key={risk.symbol}>
                                {risk.metrics.sharpeRatio !== undefined && (
                                    <MetricCard
                                        label={`${risk.symbol} Sharpe Ratio`}
                                        value={risk.metrics.sharpeRatio.toFixed(2)}
                                        color={risk.metrics.sharpeRatio > 1 ? 'success' : risk.metrics.sharpeRatio > 0 ? 'warning' : 'danger'}
                                        size="sm"
                                        delay={delay + 350 + idx * 50}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

/**
 * Side-by-side comparison panel
 */
function ComparisonRiskPanel({ riskData, delay, useLiquidGlass = true }: { riskData: RiskMetrics[]; delay: number; useLiquidGlass?: boolean }) {
    if (riskData.length < 2) {
        return <DetailedRiskPanel riskData={riskData} delay={delay} useLiquidGlass={useLiquidGlass} />;
    }

    // Find lowest volatility stock
    const lowestVolatility = riskData.reduce((prev, curr) =>
        prev.metrics.volatility < curr.metrics.volatility ? prev : curr
    );

    const containerClass = useLiquidGlass ? "liquid-glass rounded-3xl p-6" : "card-elevated rounded-2xl p-6";
    const borderClass = useLiquidGlass ? "border-primary/10" : "border-border";

    return (
        <motion.div
            className={containerClass}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay / 1000 }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Risk Comparison</h3>
                    <p className="text-sm text-foreground-muted">
                        Comparing {riskData.map(r => r.symbol).join(' vs ')}
                    </p>
                </div>
            </div>

            {/* Comparison Grid */}
            <div className={`grid grid-cols-${Math.min(riskData.length, 3)} gap-6 relative z-10`}>
                {riskData.map((risk, idx) => (
                    <motion.div
                        key={risk.symbol}
                        className="text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: (delay + idx * 100) / 1000 }}
                    >
                        {/* Symbol Header */}
                        <div className="mb-4">
                            <span className="text-xl font-bold">{risk.symbol}</span>
                            <RiskLevel
                                level={risk.riskLevel === 'low' ? 'low' : risk.riskLevel}
                                size="sm"
                                delay={delay + idx * 100 + 50}
                            />
                        </div>

                        {/* Gauge */}
                        <RiskGauge
                            value={risk.metrics.volatility * 100}
                            label="Volatility"
                            size="lg"
                            delay={delay + idx * 100 + 100}
                        />

                        {/* Metrics */}
                        <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-foreground-muted">Max Drawdown</span>
                                <span className="font-semibold text-destructive">
                                    -{(risk.metrics.maxDrawdown * 100).toFixed(1)}%
                                </span>
                            </div>
                            {risk.metrics.sharpeRatio !== undefined && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground-muted">Sharpe Ratio</span>
                                    <span className={`font-semibold ${risk.metrics.sharpeRatio > 0 ? 'text-success' : 'text-destructive'}`}>
                                        {risk.metrics.sharpeRatio.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Winner Badge */}
            <motion.div
                className={`mt-6 pt-4 border-t ${borderClass} relative z-10`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (delay + 400) / 1000 }}
            >
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
                    <Shield className="w-5 h-5 text-success" />
                    <span className="text-sm">
                        <span className="font-semibold text-success">{lowestVolatility.symbol}</span>
                        {' '}has the lowest volatility at{' '}
                        <span className="font-semibold">{(lowestVolatility.metrics.volatility * 100).toFixed(1)}%</span>
                    </span>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default RiskPanel;
