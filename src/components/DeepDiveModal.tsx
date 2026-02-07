'use client';

import React from 'react';

interface DeepDiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any | null;
    loading: boolean;
}

export default function DeepDiveModal({ isOpen, onClose, data, loading }: DeepDiveModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-emerald-600">
                    <div className="text-white">
                        <h2 className="text-2xl font-bold">In-Depth Analysis</h2>
                        {data && (
                            <p className="text-blue-100 text-sm mt-1">
                                {data.symbol} • {new Date(data.date).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            {/* Cool loading animation */}
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-emerald-600 border-b-blue-600 border-l-emerald-600 animate-spin" />
                            </div>
                            <p className="text-gray-600 font-semibold">Analyzing price movement...</p>
                            <p className="text-gray-400 text-sm mt-2">Gathering news and market context</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            {/* Price Info Card */}
                            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-6 border border-blue-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Price Movement</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Open</p>
                                        <p className="text-xl font-bold text-gray-900">${data.priceInfo.open.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Close</p>
                                        <p className="text-xl font-bold text-gray-900">${data.priceInfo.close.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Change</p>
                                        <p className={`text-xl font-bold ${data.priceInfo.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {data.priceInfo.change >= 0 ? '+' : ''}${data.priceInfo.change.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">% Change</p>
                                        <p className={`text-xl font-bold ${data.priceInfo.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {data.priceInfo.changePercent >= 0 ? '+' : ''}{data.priceInfo.changePercent.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* AI Analysis */}
                            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>
                                    AI Analysis
                                </h3>
                                <div className="prose prose-sm max-w-none text-gray-700">
                                    {data.analysis.split('\n').map((paragraph: string, idx: number) => (
                                        <p key={idx} className="mb-3">{paragraph}</p>
                                    ))}
                                </div>
                            </div>

                            {/* News */}
                            {data.news && data.news.length > 0 && (
                                <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                            <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                                        </svg>
                                        Relevant News
                                    </h3>
                                    <div className="space-y-3">
                                        {data.news.map((article: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
                                                <h4 className="font-semibold text-gray-900 mb-1">{article.title}</h4>
                                                <p className="text-sm text-gray-600">{article.source} • {article.date}</p>
                                                {article.summary && (
                                                    <p className="text-sm text-gray-700 mt-2">{article.summary}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Market Context */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Market Context</h3>
                                <p className="text-gray-700 leading-relaxed">{data.context}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
