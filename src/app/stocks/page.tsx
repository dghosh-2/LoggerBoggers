'use client';

import React, { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import StockChart from '@/components/StockChart';
import DeepDiveModal from '@/components/DeepDiveModal';
import AIRecommendations from '@/components/AIRecommendations';
import RiskVisualizer from '@/components/RiskVisualizer';

export default function StocksPage() {
    // State
    const [loading, setLoading] = useState(false);
    const [stocksData, setStocksData] = useState<any>(null);
    const [annotations, setAnnotations] = useState<any[]>([]);
    const [showAnnotations, setShowAnnotations] = useState(true);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [riskData, setRiskData] = useState<any>(null);
    const [deepDiveData, setDeepDiveData] = useState<any>(null);
    const [deepDiveLoading, setDeepDiveLoading] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);
    const [currentQuery, setCurrentQuery] = useState('');

    // Handle search
    const handleSearch = async (query: string) => {
        setLoading(true);
        setCurrentQuery(query);
        setStocksData(null);
        setAnnotations([]);
        setRecommendations(null);
        setRiskData(null);

        try {
            // Step 1: Orchestrate the query
            const orchestratorResponse = await fetch('/api/stocks/orchestrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!orchestratorResponse.ok) {
                throw new Error('Failed to process query');
            }

            const orchestratorData = await orchestratorResponse.json();
            console.log('Orchestrator output:', orchestratorData);

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

            // Step 3: Get annotations (if enabled)
            if (orchestratorData.features.annotations) {
                const annotationsResponse = await fetch('/api/stocks/annotations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stocks: dataResult.stocks }),
                });

                if (annotationsResponse.ok) {
                    const annotationsResult = await annotationsResponse.json();
                    setAnnotations(annotationsResult.annotations || []);
                }
            }

            // Step 4: Get recommendations (if enabled)
            if (orchestratorData.features.recommendations) {
                const recommendationsResponse = await fetch('/api/stocks/recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        stocks: dataResult.stocks,
                    }),
                });

                if (recommendationsResponse.ok) {
                    const recommendationsResult = await recommendationsResponse.json();
                    setRecommendations(recommendationsResult);
                }
            }

            // Step 5: Get risk analysis (if enabled)
            if (orchestratorData.features.risk) {
                const riskResponse = await fetch('/api/stocks/risk-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stocks: dataResult.stocks }),
                });

                if (riskResponse.ok) {
                    const riskResult = await riskResponse.json();
                    setRiskData(riskResult.riskAnalyses || []);
                }
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Failed to process your query. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle deep dive (double-click on chart)
    const handleDeepDive = async (date: string, symbol: string, priceData: any) => {
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
            alert('Failed to load deep dive analysis');
            setShowDeepDive(false);
        } finally {
            setDeepDiveLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-300">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">Stock Analysis</h1>
                    <p className="text-white/90 mt-1 drop-shadow">Powered by AI • Natural Language Search</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Search Bar */}
                <div className="mb-8">
                    <SearchBar onSearch={handleSearch} loading={loading} />
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-emerald-600 border-b-blue-600 border-l-emerald-600 animate-spin" />
                        </div>
                        <p className="text-gray-600 font-semibold text-lg">Processing your request...</p>
                        <p className="text-gray-400 text-sm mt-2">Analyzing markets with AI</p>
                    </div>
                )}

                {/* Results */}
                {!loading && stocksData && (
                    <div className="space-y-6">
                        {/* Query info */}
                        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-200">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Query: {currentQuery}</p>
                                <p className="text-xs text-gray-500">{stocksData.length} stock(s) found</p>
                            </div>
                        </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Chart - Takes up 2 columns */}
                            <div className="lg:col-span-2 space-y-6">
                                <StockChart stocks={stocksData} />
                                <RiskVisualizer riskData={riskData} loading={false} />
                            </div>

                            {/* Sidebar - AI Recommendations */}
                            <div className="lg:col-span-1">
                                <AIRecommendations recommendations={recommendations} loading={false} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !stocksData && (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Exploring</h2>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Use natural language to ask about any stocks. Try comparing companies, analyzing trends, or exploring market performance.
                        </p>
                    </div>
                )}
            </div>

            {/* Deep Dive Modal */}
            <DeepDiveModal
                isOpen={showDeepDive}
                onClose={() => setShowDeepDive(false)}
                data={deepDiveData}
                loading={deepDiveLoading}
            />
        </div>
    );
}
