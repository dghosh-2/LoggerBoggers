'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    loading: boolean;
}

const EXAMPLE_QUERIES = [
    'Show me a comparison for Google and Apple stock for the last 5 years',
    'What is Tesla stock performance last year?',
    'Compare NVIDIA and AMD over 2 years',
    'Show me Microsoft stock for the past 6 months',
];

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
    const [query, setQuery] = React.useState('');
    const [showExamples, setShowExamples] = React.useState(true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
            setShowExamples(false);
        }
    };

    const handleExampleClick = (example: string) => {
        setQuery(example);
        onSearch(example);
        setShowExamples(false);
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Search className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setShowExamples(true)}
                        placeholder="Ask anything about stocks... (e.g., compare Apple and Google over 5 years)"
                        className="w-full pl-12 pr-32 py-4 text-base bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder-foreground-muted"
                        disabled={loading}
                    />
                    <motion.button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Search</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </form>

            {/* Example Queries */}
            {showExamples && !loading && (
                <motion.div 
                    className="mt-4 p-4 bg-secondary/50 rounded-xl border border-border"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <p className="text-sm font-medium text-foreground-muted mb-3">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLE_QUERIES.map((example, idx) => (
                            <motion.button
                                key={idx}
                                onClick={() => handleExampleClick(example)}
                                className="px-3 py-2 text-sm bg-background border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-foreground-secondary"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {example}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
