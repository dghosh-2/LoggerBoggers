'use client';

import React from 'react';

interface RiskVisualizerProps {
    riskData: any[] | null;
    loading: boolean;
}

export default function RiskVisualizer({ riskData, loading }: RiskVisualizerProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h2>
                <div className="animate-pulse h-16 bg-gray-100 rounded-lg" />
            </div>
        );
    }

    if (!riskData || riskData.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {riskData.map((risk: any) => (
                    <React.Fragment key={risk.symbol}>
                        {/* Volatility */}
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">{risk.symbol} Volatility</p>
                            <p className="text-xl font-bold text-gray-900">
                                {(risk.metrics?.volatility * 100 || 0).toFixed(1)}%
                            </p>
                        </div>

                        {/* Max Drawdown */}
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 mb-1">{risk.symbol} Max Drawdown</p>
                            <p className="text-xl font-bold text-red-600">
                                -{(risk.metrics?.maxDrawdown * 100 || 0).toFixed(1)}%
                            </p>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {/* Simple risk comparison if multiple stocks */}
            {riskData.length > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Comparison:</span>{' '}
                        {riskData.sort((a, b) => a.metrics?.volatility - b.metrics?.volatility)[0]?.symbol} has lower volatility
                    </p>
                </div>
            )}
        </div>
    );
}
