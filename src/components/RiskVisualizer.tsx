'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Activity, TrendingDown } from 'lucide-react';

interface RiskVisualizerProps {
    riskData: any[] | null;
    loading: boolean;
}

export default function RiskVisualizer({ riskData, loading }: RiskVisualizerProps) {
    if (loading) {
        return (
            <motion.div 
                className="card-elevated p-6 rounded-2xl"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <h2 className="text-lg font-semibold">Risk Metrics</h2>
                </div>
                <div className="animate-pulse h-16 bg-secondary rounded-lg" />
            </motion.div>
        );
    }

    if (!riskData || riskData.length === 0) {
        return null;
    }

    return (
        <motion.div 
            className="card-elevated p-6 rounded-2xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <h2 className="text-lg font-semibold">Risk Metrics</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {riskData.map((risk: any) => (
                    <React.Fragment key={risk.symbol}>
                        {/* Volatility */}
                        <div className="bg-secondary rounded-xl p-4 text-center border border-border">
                            <div className="flex items-center justify-center gap-1 mb-2">
                                <Activity className="w-4 h-4 text-foreground-muted" />
                                <p className="text-xs text-foreground-muted">{risk.symbol} Volatility</p>
                            </div>
                            <p className="text-xl font-bold">
                                {(risk.metrics?.volatility * 100 || 0).toFixed(1)}%
                            </p>
                        </div>

                        {/* Max Drawdown */}
                        <div className="bg-secondary rounded-xl p-4 text-center border border-border">
                            <div className="flex items-center justify-center gap-1 mb-2">
                                <TrendingDown className="w-4 h-4 text-foreground-muted" />
                                <p className="text-xs text-foreground-muted">{risk.symbol} Max Drawdown</p>
                            </div>
                            <p className="text-xl font-bold text-destructive">
                                -{(risk.metrics?.maxDrawdown * 100 || 0).toFixed(1)}%
                            </p>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {/* Simple risk comparison if multiple stocks */}
            {riskData.length > 1 && (
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-foreground-secondary">
                        <span className="font-medium text-foreground">Comparison:</span>{' '}
                        {riskData.sort((a, b) => a.metrics?.volatility - b.metrics?.volatility)[0]?.symbol} has lower volatility
                    </p>
                </div>
            )}
        </motion.div>
    );
}
