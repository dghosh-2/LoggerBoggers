'use client';

import React from 'react';

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
        <div className="w-full max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setShowExamples(true)}
                        placeholder="Ask anything about stocks... (e.g., compare Apple and Google over 5 years)"
                        className="w-full px-6 py-5 text-lg bg-white border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-lg text-gray-900 placeholder-gray-400"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing...
                            </span>
                        ) : (
                            'Search'
                        )}
                    </button>
                </div>
            </form>

            {/* Example Queries */}
            {showExamples && !loading && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-600 mb-3">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLE_QUERIES.map((example, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleExampleClick(example)}
                                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-gray-700"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
