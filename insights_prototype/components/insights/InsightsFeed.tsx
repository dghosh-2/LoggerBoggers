"use client";

import React, { useEffect, useState } from 'react';
import { generateInsights } from '@/data/trend_engine';
import { InsightCard } from './InsightCard';
import { useInsightsStore } from '@/store/useInsightsStore';
import { CategoryDetails } from './CategoryDetails';
import { InsightItem } from '@/data/fake_data';

export function InsightsFeed() {
    const { selectedCategory } = useInsightsStore();
    const [insights, setInsights] = useState<InsightItem[]>([]);

    useEffect(() => {
        setInsights(generateInsights());
    }, []);

    if (selectedCategory) {
        return <CategoryDetails />;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 pb-2">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                    Feed
                </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3 scrollbar-hide">
                {insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                ))}
            </div>
        </div>
    );
}
