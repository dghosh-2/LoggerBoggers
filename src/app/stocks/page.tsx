'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Search, TrendingUp } from 'lucide-react';
import { PageTransition } from '@/components/layout/page-transition';
import { GlassCard } from '@/components/ui/glass-card';
import { Modal } from '@/components/ui/modal';
import SearchBar from '@/components/SearchBar';
import { FlexibleChart } from '@/components/stocks/FlexibleChart';
import { RiskPanel } from '@/components/stocks/RiskPanel';
import { ChartContainer, MetricCard, Section } from '@/components/stocks/ChartContainer';
import { AISidebar } from '@/components/stocks/AISidebar';
import DeepDiveModal from '@/components/DeepDiveModal';
import { toast } from '@/components/ui/toast';
import { StockData } from '@/lib/schemas';
import { DogLoadingAnimation } from '@/components/ui/DogLoadingAnimation';

interface OrchestratorOutput {
    intent: string;
    queryType: string;
    symbols: string[];
    timeRange: { period: string };
    layout: { type: string; columns: number };
    charts: any[];
    riskLayout: string;
    extractedQuestions?: string[];
    features: {
        showRiskMetrics: boolean;
        showRecommendations: boolean;
        showStatistics: boolean;
        enableDeepDive: boolean;
        showAISidebar: boolean;
        showRiskInSidebar: boolean;
        showPersonalizedInsights: boolean;
    };
}

export default function StocksPage() {
    // State
    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState(0);
    const [stocksData, setStocksData] = useState<StockData[] | null>(null);
    const [orchestratorOutput, setOrchestratorOutput] = useState<OrchestratorOutput | null>(null);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [dedalusResearch, setDedalusResearch] = useState<any>(null);
    const [riskData, setRiskData] = useState<any[]>([]);
    const [deepDiveData, setDeepDiveData] = useState<any>(null);
    const [deepDiveLoading, setDeepDiveLoading] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);
    const [expandedChart, setExpandedChart] = useState<any>(null);
    const [currentQuery, setCurrentQuery] = useState('');

    // Handle search
    const handleSearch = async (query: string) => {
        setLoading(true);
        setLoadingStage(0);
        setCurrentQuery(query);
        setStocksData(null);
        setOrchestratorOutput(null);
        setRecommendations(null);
        setDedalusResearch(null);
        setRiskData([]);

        try {
            // Stage 0: Parsing query
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
            setLoadingStage(1); // Stage 1: Fetching market data

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
            setLoadingStage(2); // Stage 2: Generating insights

            // Fetch recommendations immediately without waiting for Dedalus
            if (orchestratorData.features.showRecommendations || orchestratorData.features.showAISidebar) {
                setLoadingStage(3); // Stage 3: Generating insights
                
                // Start recommendations immediately (fast path)
                fetchRecommendations(query, dataResult.stocks, orchestratorData.extractedQuestions || [], '');
                
                // Optionally fetch Dedalus research in background (non-blocking)
                // This won't slow down the main flow
                fetch('/api/stocks/dedalus-research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        symbols: orchestratorData.symbols,
                        extractedQuestions: orchestratorData.extractedQuestions || [],
                    }),
                }).then(async (dedalusResponse) => {
                    if (dedalusResponse.ok) {
                        const dedalusResult = await dedalusResponse.json();
                        setDedalusResearch(dedalusResult);
                        console.log('Dedalus research (background):', dedalusResult);
                    }
                }).catch((dedalusError) => {
                    console.warn('Dedalus research failed (background):', dedalusError);
                });
            }

            if (orchestratorData.features.showRiskMetrics) {
                fetchRiskAnalysis(dataResult.stocks);
            }

            toast.success('Analysis complete!');
        } catch (error: any) {
            console.error('Search error:', error);
            toast.error(error.message || 'Failed to process your query. Please try again.');
        } finally {
            setLoading(false);
            setLoadingStage(0);
        }
    };

    const fetchRecommendations = async (query: string, stocks: StockData[], extractedQuestions: string[], dedalusContext: string = '') => {
        try {
            const response = await fetch('/api/stocks/recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, stocks, extractedQuestions, dedalusContext }),
            });
            if (response.ok) {
                const result = await response.json();
                setRecommendations(result);
            }
        } catch (error) {
            console.error('Recommendations error:', error);
        }
    };

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

    const renderLayout = () => {
        if (!stocksData || !orchestratorOutput) return null;

        const { layout, charts, riskLayout, features } = orchestratorOutput;
        const stats = calculateStats();
        const showSidebar = features.showAISidebar !== false;
        const showRiskInline = riskLayout === 'inline' || riskLayout === 'both';

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
            <div className="flex gap-6 h-[calc(100vh-12rem)]">
                {/* Left Panel: Visuals - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-4 min-w-0 pr-2">
                    {/* Query Summary */}
                    <motion.div 
                        className="bg-card border border-border rounded-xl py-3.5 px-4"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-md bg-secondary">
                                    <Search className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{orchestratorOutput.intent}</p>
                                    <p className="text-[11px] text-foreground-muted">
                                        {stocksData.length} stock(s) &middot; {orchestratorOutput.timeRange.period} period
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary font-medium">
                                    {orchestratorOutput.queryType.replace('_', ' ')}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary font-medium">
                                    {layout.type}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Statistics - Horizontal scrollable row */}
                    {features.showStatistics && stats.length > 0 && (
                        <motion.div
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.15 }}
                        >
                            {stats.map((stat, idx) => (
                                <motion.div
                                    key={stat.symbol}
                                    className="flex-shrink-0 min-w-[160px] bg-card border border-border rounded-xl p-4"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${stat.change >= 0 ? 'bg-success' : 'bg-destructive'}`} />
                                        <span className="font-semibold text-sm">{stat.symbol}</span>
                                    </div>
                                    <p className={`text-xl font-bold ${stat.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                                        ${stat.price.toFixed(2)}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className={`text-xs ${stat.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                                            {stat.change >= 0 ? '+' : ''}{stat.change.toFixed(2)}%
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            {orchestratorOutput.timeRange.period}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {/* Charts Grid */}
                    <div className={`grid ${getGridClass()} gap-4`}>
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

                    {/* Risk Panel (inline mode only) */}
                    {showRiskInline && features.showRiskMetrics && riskData.length > 0 && (
                        <RiskPanel
                            riskData={riskData}
                            layout={riskLayout as 'compact' | 'detailed' | 'comparison'}
                            delay={500}
                        />
                    )}
                </div>

                {/* Right Panel: AI Sidebar - Boxed and Scrollable */}
                {showSidebar && (
                    <div className="w-96 flex-shrink-0 border border-border rounded-xl bg-card/50 backdrop-blur-sm overflow-y-auto">
                        <AISidebar
                            recommendations={recommendations}
                            stocksData={stocksData}
                            riskData={riskData}
                            loading={loading || (!recommendations && features.showRecommendations)}
                            query={currentQuery}
                            extractedQuestions={orchestratorOutput.extractedQuestions || []}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Stock Research</h1>
                        <p className="text-foreground-muted text-sm mt-1">
                            AI-powered natural language stock analysis
                        </p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary">
                        <LineChart className="w-4 h-4 text-primary" />
                    </div>
                </div>

                {/* Search Bar */}
                <GlassCard delay={50}>
                    <SearchBar onSearch={handleSearch} loading={loading} />
                </GlassCard>

                {/* Loading State */}
                {loading && (
                    <GlassCard delay={100} className="py-8 px-8">
                        <DogLoadingAnimation 
                            message="Analyzing markets with AI..."
                            size="lg"
                        />
                    </GlassCard>
                )}

                {/* Results */}
                {!loading && stocksData && orchestratorOutput && renderLayout()}

                {/* Empty State */}
                {!loading && !stocksData && (
                    <GlassCard delay={100} className="py-14">
                        <div className="text-center">
                            <motion.div
                                className="w-14 h-14 mx-auto mb-4 bg-secondary rounded-xl flex items-center justify-center"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <TrendingUp className="w-7 h-7 text-primary" />
                            </motion.div>
                            <h2 className="text-lg font-semibold mb-1">Start Exploring</h2>
                            <p className="text-sm text-foreground-muted max-w-md mx-auto mb-5">
                                Use natural language to ask about any stocks. Try comparing companies, analyzing trends, or exploring market performance.
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                                {[
                                    'Compare Apple and Google',
                                    'How risky is NVIDIA?',
                                    'Tesla vs Microsoft',
                                ].map((example, idx) => (
                                    <motion.button
                                        key={idx}
                                        className="px-4 py-2 text-sm bg-white/30 backdrop-blur-sm rounded-full hover:bg-white/45 transition-all duration-150 cursor-pointer"
                                        onClick={() => handleSearch(example)}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.05 }}
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
