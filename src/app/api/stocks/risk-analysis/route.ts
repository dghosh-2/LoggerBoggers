import { NextRequest, NextResponse } from 'next/server';
import { calculateRiskMetrics } from '@/lib/yahoo-finance';
import { StockData } from '@/lib/schemas';

export async function POST(request: NextRequest) {
    try {
        const { stocks } = await request.json();

        if (!stocks || !Array.isArray(stocks)) {
            return NextResponse.json(
                { error: 'Invalid stock data' },
                { status: 400 }
            );
        }

        const riskAnalyses = [];

        for (const stock of stocks as StockData[]) {
            const { symbol, data } = stock;

            if (data.length < 2) continue;

            // Calculate risk metrics
            const { volatility, maxDrawdown, returns } = calculateRiskMetrics(data);

            // Calculate additional metrics
            const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const sharpeRatio = (avgReturn * 252) / (volatility || 1); // Annualized Sharpe

            // Determine risk level
            let riskLevel: 'low' | 'medium' | 'high' | 'very_high' = 'medium';
            if (volatility < 0.15) riskLevel = 'low';
            else if (volatility < 0.25) riskLevel = 'medium';
            else if (volatility < 0.40) riskLevel = 'high';
            else riskLevel = 'very_high';

            // Create visualizations data
            const visualizations = [
                {
                    type: 'gauge' as const,
                    data: {
                        value: volatility * 100,
                        max: 100,
                        label: 'Volatility',
                        color: getColorForRisk(riskLevel),
                    },
                    label: 'Annualized Volatility',
                },
                {
                    type: 'gauge' as const,
                    data: {
                        value: maxDrawdown * 100,
                        max: 100,
                        label: 'Max Drawdown',
                        color: getColorForValue(maxDrawdown, 0.5),
                    },
                    label: 'Maximum Drawdown',
                },
                {
                    type: 'gauge' as const,
                    data: {
                        value: Math.min(Math.max(sharpeRatio * 20 + 50, 0), 100),
                        max: 100,
                        label: 'Sharpe Ratio',
                        color: getColorForValue(sharpeRatio, 1, true),
                    },
                    label: 'Risk-Adjusted Return',
                },
            ];

            riskAnalyses.push({
                symbol,
                metrics: {
                    volatility: Number(volatility.toFixed(4)),
                    maxDrawdown: Number(maxDrawdown.toFixed(4)),
                    sharpeRatio: Number(sharpeRatio.toFixed(4)),
                },
                riskLevel,
                visualizations,
            });
        }

        return NextResponse.json({ riskAnalyses });
    } catch (error: any) {
        console.error('Risk analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze risk', details: error.message },
            { status: 500 }
        );
    }
}

function getColorForRisk(level: string): string {
    switch (level) {
        case 'low': return '#10b981'; // green
        case 'medium': return '#f59e0b'; // amber
        case 'high': return '#ef4444'; // red
        case 'very_high': return '#991b1b'; // dark red
        default: return '#6b7280'; // gray
    }
}

function getColorForValue(value: number, threshold: number, inverse: boolean = false): string {
    const isGood = inverse ? value > threshold : value < threshold;
    return isGood ? '#10b981' : '#ef4444';
}
