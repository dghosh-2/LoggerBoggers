"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, Filter, Calendar, X, Sun, Moon } from 'lucide-react';
import { useInsightsStore } from '@/store/useInsightsStore';
import { CATEGORIES } from '@/data/fake_data';
import { cn } from '@/lib/utils';

export function InsightsHeader() {
    const { selectedMonth, selectedCategory, setSelectedCategory, selectedRange } = useInsightsStore();
    const [isDark, setIsDark] = useState(true);

    // Toggle Theme
    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (newTheme) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Sync with initial state (optional, but good practice)
    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    return (
        <div className="flex items-center justify-between px-6 py-4 glass border-b sticky top-0 z-50">
            <div className="flex items-center space-x-6">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Insights
                </h1>

                {/* Month Selector Pill */}
                <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full transition-all border border-transparent hover:border-zinc-700">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{selectedMonth}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                </button>

                {/* Quick Range Toggles */}
                <div className="flex bg-zinc-900/80 rounded-lg p-1 border border-zinc-800">
                    {(['MTD', '3M', 'YR', 'All'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => useInsightsStore.getState().setSelectedRange(range)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                                selectedRange === range
                                    ? "bg-zinc-800 text-white shadow-sm ring-1 ring-black/5"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                    {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {/* Category Filter */}
                <div className="relative group">
                    <button
                        className={cn(
                            "flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all",
                            selectedCategory
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 hover:bg-zinc-800"
                        )}
                        onClick={() => selectedCategory && setSelectedCategory(null)}
                    >
                        {selectedCategory ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                        <span>{selectedCategory || 'Categories'}</span>
                        {!selectedCategory && <ChevronDown className="w-3 h-3 opacity-50" />}
                    </button>
                    {/* Simple CSS Hover Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block transition-all z-50">
                        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                            {CATEGORIES.map(cat => (
                                <div
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md cursor-pointer flex justify-between"
                                >
                                    {cat}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
