'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Search, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';
import { PageTransition } from '@/components/layout/page-transition';
import { GlassCard } from '@/components/ui/glass-card';
import { Modal } from '@/components/ui/modal';
import SearchBar from '@/components/SearchBar';
import { FlexibleChart } from '@/components/stocks/FlexibleChart';
import { RiskPanel } from '@/components/stocks/RiskPanel';
import { ChartContainer, MetricCard, Section } from '@/components/stocks/ChartContainer';
import DeepDiveModal from '@/components/DeepDiveModal';
import AIRecommendations from '@/components/AIRecommendations';
import { toast } from '@/components/ui/toast';
import { StockData } from '@/lib/schemas';

interface OrchestratorOutput {
    intent: string;
    queryType: string;
    symbols: string[];
    timeRange: { period: string };
    layout: { type: string; columns: number };
    charts: any[];
    riskLayout: string;
    features: {
        showRiskMetrics: boolean;
        showRecommendations: boolean;
        showStatistics: boolean;
        enableDeepDive: boolean;
    };
}

export default function StocksPage() {
    // State
    const [loading, setLoading] = useState(false);
    const [stocksData, setStocksData] = useState<StockData[] | null>(null);
    const [orchestratorOutput, setOrchestratorOutput] = useState<OrchestratorOutput | null>(null);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [riskData, setRiskData] = useState<any[]>([]);
    const [deepDiveData, setDeepDiveData] = useState<any>(null);
    const [deepDiveLoading, setDeepDiveLoading] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);
    const [expandedChart, setExpandedChart] = useState<any>(null);
    const [currentQuery, setCurrentQuery] = useState('');

    // Handle search
    const handleSearch = async (query: string) => {
        setLoading(true);
        setCurrentQuery(query);
        setStocksData(null);
        setOrchestratorOutput(null);
        setRecommendations(null);
        setRiskData([]);

        try {
            // Step 1: Orchestrate the query with expanded schema
            const orchestratorResponse = await fetch('/api/stocks/orchestrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!orchestratorResponse.ok) {
                const errorData = await orchestratorResponse.json();
                throw new Error(errorData.details || 'Failed to process query');
            }

            const orchestratorData: OrchestratorOutput = await orchestratorResponse.json();
            console.log('Orchestrator output:', orchestratorData);
            setOrchestratorOutput(orchestratorData);

            // Step 2: Fetch stock data
            const dataResponse = await fetch('/api/stocks/data-fetcher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbols: orchestratorData.symbols,
                    period: orchestratorData.timeRange.period,
                }),
            });

            if (!dataResponse.ok) {
                throw new Error('Failed to fetch stock data');
            }

            const dataResult = await dataResponse.json();
            setStocksData(dataResult.stocks);

            // Step 3: Get recommendations (if enabled)
            if (orchestratorData.features.showRecommendations) {
                fetchRecommendations(query, dataResult.stocks);
            }

            // Step 4: Get risk analysis (if enabled)
            if (orchestratorData.features.showRiskMetrics) {
                fetchRiskAnalysis(dataResult.stocks);
            }

            toast.success('Analysis complete!');
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error(error.message || 'Failed to process your query. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch recommendations in background
    const fetchRecommendations = async (query: string, stocks: StockData[]) => {
        try {
            const response = await fetch('/api/stocks/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, stocks }),
            });
            if (response.ok) {
                const result = await response.json();
                setRecommendations(result);
            }
        } catch (error) {
            console.error('Recommendations error:', error);
        }
    };

    // Fetch risk analysis in background
    const fetchRiskAnalysis = async (stocks: StockData[]) => {
        try {
            const response = await fetch('/api/stocks/risk-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stocks }),
            });
            if (response.ok) {
                const result = await response.json();
                setRiskData(result.riskAnalyses || []);
            }
        } catch (error) {
            console.error('Risk analysis error:', error);
        }
    };

    // Handle deep dive
    const handleDeepDive = async (date: string, symbol: string, priceData: any) => {
        if (!orchestratorOutput?.features.enableDeepDive) return;
        
        setShowDeepDive(true);
        setDeepDiveLoading(true);

        try {
            const response = await fetch('/api/stocks/deep-dive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, date, priceData }),
            });

            if (response.ok) {
                const result = await response.json();
                setDeepDiveData(result);
            } else {
                throw new Error('Failed to fetch deep dive data');
            }
        } catch (error) {
            console.error('Deep dive error:', error);
            toast.error('Failed to load deep dive analysis');
            setShowDeepDive(false);
        } finally {
            setDeepDiveLoading(false);
        }
    };

    // Calculate statistics for display
    const calculateStats = () => {
        if (!stocksData || stocksData.length === 0) return [];
        
        return stocksData.map(stock => {
            const first = stock.data[0]?.close || 0;
            const last = stock.data[stock.data.length - 1]?.close || 0;
            const change = ((last - first) / first) * 100;
            const high = Math.max(...stock.data.map(d => d.high));
            const low = Math.min(...stock.data.map(d => d.low));
            
            return {
                symbol: stock.symbol,
                name: stock.name,
                price: last,
                change,
                high,
                low,
            };
        });
    };

    // Render layout based on orchestrator output
    const renderLayout = () => {
        if (!stocksData || !orchestratorOutput) return null;

        const { layout, charts, riskLayout, features } = orchestratorOutput;
        const stats = calculateStats();

        // Determine grid columns based on layout type
        const getGridClass = () => {
            switch (layout.type) {
                case 'split':
                    return 'grid-cols-1 lg:grid-cols-2';
                case 'grid':
                    return `grid-cols-1 md:grid-cols-2 ${layout.columns > 2 ? 'lg:grid-cols-3' : ''}`;
                case 'stacked':
                    return 'grid-cols-1';
                case 'comparison':
                    return 'grid-cols-1 lg:grid-cols-3';
                default:
                    return 'grid-cols-1';
            }
        };

        return (
            <div className="space-y-6">
                {/* Query Summary - Liquid Glass */}
                <motion.div 
                    className="liquid-glass py-4 px-5 rounded-3xl"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Search className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{orchestratorOutput.intent}</p>
                                <p className="text-xs text-foreground-muted">
                                    {stocksData.length} stock(s) • {orchestratorOutput.timeRange.period} period
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                                {orchestratorOutput.queryType.replace('_', ' ')}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                                {layout.type} layout
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Statistics Grid */}
                {features.showStatistics && stats.length > 0 && (
                    <Section columns={Math.min(stats.length * 2, 4) as 1 | 2 | 3 | 4} gap="md" delay={150}>
                        {stats.map((stat, idx) => (
                            <React.Fragment key={stat.symbol}>
                                <MetricCard
                                    label={`${stat.symbol} Price`}
                                    value={`$${stat.price.toFixed(2)}`}
                                    change={stat.change}
                                    changeLabel={orchestratorOutput.timeRange.period}
                                    color={stat.change >= 0 ? 'success' : 'danger'}
                                    delay={200 + idx * 50}
                                />
                                <MetricCard
                                    label={`${stat.symbol} Range`}
                                    value={`$${stat.low.toFixed(0)} - $${stat.high.toFixed(0)}`}
                                    color="info"
                                    delay={225 + idx * 50}
                                />
                            </React.Fragment>
                        ))}
                    </Section>
                )}

                {/* Charts Grid */}
                <div className={`grid ${getGridClass()} gap-6`}>
                    {charts.map((chartConfig, idx) => (
                        <FlexibleChart
                            key={chartConfig.id}
                            config={chartConfig}
                            stockData={stocksData}
                            delay={300 + idx * 100}
                            onExpand={() => setExpandedChart(chartConfig)}
                        />
                    ))}
                </div>

                {/* Risk and Recommendations Row */}
                {(features.showRiskMetrics || features.showRecommendations) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Risk Panel - 2 columns */}
                        {features.showRiskMetrics && riskData.length > 0 && (
                            <div className="lg:col-span-2">
                                <RiskPanel
                                    riskData={riskData}
                                    layout={riskLayout as 'compact' | 'detailed' | 'comparison'}
                                    delay={500}
                                />
                            </div>
                        )}

                        {/* AI Recommendations - 1 column */}
                        {features.showRecommendations && (
                            <div className="lg:col-span-1">
                                <AIRecommendations
                                    recommendations={recommendations}
                                    loading={!recommendations && loading}
                                    useLiquidGlass={true}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageTransition>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">Stock Research</h1>
                        <p className="text-foreground-muted mt-1">
                            AI-powered natural language stock analysis
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.div
                            className="p-2.5 rounded-xl bg-secondary border border-border"
                            whileHover={{ scale: 1.05 }}
                        >
                            <LineChart className="w-5 h-5 text-primary" />
                        </motion.div>
                    </div>
                </div>

                {/* Search Bar */}
                <GlassCard delay={100}>
                    <SearchBar onSearch={handleSearch} loading={loading} />
                </GlassCard>

                {/* Loading State */}
                {loading && (
                    <GlassCard delay={200} className="py-16">
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-accent border-b-primary border-l-accent animate-spin" />
                            </div>
                            <p className="text-foreground font-semibold text-lg">Processing your request...</p>
                            <p className="text-foreground-muted text-sm mt-2">Analyzing markets with AI</p>
                        </div>
                    </GlassCard>
                )}

                {/* Results */}
                {!loading && stocksData && orchestratorOutput && renderLayout()}

                {/* Empty State */}
                {!loading && !stocksData && (
                    <GlassCard delay={200} className="py-16">
                        <div className="text-center">
                            <motion.div
                                className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <TrendingUp className="w-10 h-10 text-primary" />
                            </motion.div>
                            <h2 className="text-2xl font-semibold mb-2">Start Exploring</h2>
                            <p className="text-foreground-muted max-w-md mx-auto mb-6">
                                Use natural language to ask about any stocks. Try comparing companies, analyzing trends, or exploring market performance.
                            </p>
                            
                            {/* Example queries */}
                            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                                {[
                                    'Compare Apple and Google over 5 years',
                                    'Show Tesla and NVIDIA in separate graphs',
                                    'How risky is AMD compared to Intel?',
                                    'Microsoft stock with area chart',
                                ].map((example, idx) => (
                                    <motion.button
                                        key={idx}
                                        className="px-3 py-2 text-sm bg-secondary border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                                        onClick={() => handleSearch(example)}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + idx * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        {example}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* Expanded Chart Modal */}
            <Modal
                isOpen={expandedChart !== null}
                onClose={() => setExpandedChart(null)}
                title={expandedChart?.title || 'Chart'}
                subtitle={expandedChart?.subtitle}
                size="full"
            >
                {expandedChart && stocksData && (
                    <div className="p-4 h-[75vh]">
                        <FlexibleChart
                            config={{ ...expandedChart, height: 'xl' }}
                            stockData={stocksData}
                        />
                    </div>
                )}
            </Modal>

            {/* Deep Dive Modal */}
            <DeepDiveModal
                isOpen={showDeepDive}
                onClose={() => setShowDeepDive(false)}
                data={deepDiveData}
                loading={deepDiveLoading}
            />
        </PageTransition>
    );
}
