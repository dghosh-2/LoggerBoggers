'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Newspaper, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { DogLoadingAnimation } from '@/components/ui/DogLoadingAnimation';

interface DeepDiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any | null;
    loading: boolean;
}

export default function DeepDiveModal({ isOpen, onClose, data, loading }: DeepDiveModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div 
                    className="card-elevated rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
                        <div>
                            <h2 className="text-xl font-semibold">In-Depth Analysis</h2>
                            {data && (
                                <p className="text-sm text-foreground-muted mt-1">
                                    {data.symbol} • {new Date(data.date).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        <motion.button
                            onClick={onClose}
                            className="p-2 hover:bg-secondary rounded-lg transition-all"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X className="w-5 h-5 text-foreground-muted" />
                        </motion.button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                        {loading ? (
                            <div className="py-8">
                                <DogLoadingAnimation 
                                    message="Analyzing price movement and gathering market context..."
                                    size="md"
                                />
                            </div>
                        ) : data ? (
                            <div className="space-y-6">
                                {/* Price Info Card */}
                                <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
                                    <h3 className="text-lg font-semibold mb-4">Price Movement</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-foreground-muted">Open</p>
                                            <p className="text-xl font-bold">${data.priceInfo.open.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-foreground-muted">Close</p>
                                            <p className="text-xl font-bold">${data.priceInfo.close.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-foreground-muted">Change</p>
                                            <p className={`text-xl font-bold flex items-center gap-1 ${data.priceInfo.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                                                {data.priceInfo.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                {data.priceInfo.change >= 0 ? '+' : ''}${data.priceInfo.change.toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-foreground-muted">% Change</p>
                                            <p className={`text-xl font-bold ${data.priceInfo.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                                                {data.priceInfo.changePercent >= 0 ? '+' : ''}{data.priceInfo.changePercent.toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Analysis */}
                                <div className="bg-secondary rounded-xl p-6 border border-border">
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        AI Analysis
                                    </h3>
                                    <div className="prose prose-sm max-w-none text-foreground-secondary">
                                        {data.analysis.split('\n').map((paragraph: string, idx: number) => (
                                            <p key={idx} className="mb-3">{paragraph}</p>
                                        ))}
                                    </div>
                                </div>

                                {/* News */}
                                {data.news && data.news.length > 0 && (
                                    <div className="bg-secondary rounded-xl p-6 border border-border">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Newspaper className="w-5 h-5 text-accent" />
                                            Relevant News
                                        </h3>
                                        <div className="space-y-3">
                                            {data.news.map((article: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition-all">
                                                    <h4 className="font-semibold mb-1">{article.title}</h4>
                                                    <p className="text-sm text-foreground-muted">{article.source} • {article.date}</p>
                                                    {article.summary && (
                                                        <p className="text-sm text-foreground-secondary mt-2">{article.summary}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Market Context */}
                                <div className="bg-accent/5 rounded-xl p-6 border border-accent/20">
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-accent" />
                                        Market Context
                                    </h3>
                                    <p className="text-foreground-secondary leading-relaxed">{data.context}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-foreground-muted">No data available</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
