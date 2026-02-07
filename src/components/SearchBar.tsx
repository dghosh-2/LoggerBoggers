'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, X } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    loading: boolean;
}

const EXAMPLE_QUERIES = [
    'Compare Apple and Google over 5 years',
    'Tesla stock performance last year',
    'NVIDIA vs AMD over 2 years',
    'Microsoft stock past 6 months',
];

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
    const [query, setQuery] = React.useState('');
    const [showExamples, setShowExamples] = React.useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea based on content
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto';
            // Set height based on content, with min and max constraints
            const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 120);
            textarea.style.height = `${newHeight}px`;
        }
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
            setShowExamples(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (query.trim()) {
                onSearch(query.trim());
                setShowExamples(false);
            }
        }
    };

    const handleExampleClick = (example: string) => {
        setQuery(example);
        onSearch(example);
        setShowExamples(false);
    };

    const clearQuery = () => {
        setQuery('');
        textareaRef.current?.focus();
    };

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative flex items-start">
                    <div className="absolute left-4 top-4">
                        <Search className="w-5 h-5 text-foreground-muted" />
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowExamples(true)}
                        placeholder="Ask anything about stocks... (e.g., compare Apple and Google over 5 years)"
                        className="w-full pl-12 pr-36 py-3.5 text-sm bg-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder-foreground-muted resize-none overflow-hidden leading-relaxed"
                        disabled={loading}
                        rows={1}
                        style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {query && !loading && (
                            <button
                                type="button"
                                onClick={clearQuery}
                                className="p-1.5 rounded-md hover:bg-background/50 text-foreground-muted hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                        <motion.button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Analyzing</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Search</span>
                                </>
                            )}
                        </motion.button>
                    </div>
                </div>
                {query.length > 100 && (
                    <p className="text-[10px] text-foreground-muted mt-1 ml-1">
                        Press Enter to search, Shift+Enter for new line
                    </p>
                )}
            </form>

            {/* Example Queries */}
            {showExamples && !loading && !query && (
                <motion.div 
                    className="mt-3 p-3 bg-secondary/30 rounded-lg border border-border/50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <p className="text-xs font-medium text-foreground-muted mb-2">Try these examples:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {EXAMPLE_QUERIES.map((example, idx) => (
                            <motion.button
                                key={idx}
                                onClick={() => handleExampleClick(example)}
                                className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-md hover:border-primary hover:bg-primary/5 transition-all text-foreground-secondary"
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
