"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';

import { CategoryDetails } from './CategoryDetails';
import { useInsightsStore } from '@/stores/insights-store';

export function InsightsFeed() {
    const { selectedCategory } = useInsightsStore();

    if (selectedCategory) {
        return <CategoryDetails />;
    }

    // Blank placeholder state per user request
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="p-4 rounded-full bg-secondary mb-4">
                <Sparkles className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground-muted">Feed Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">
                We are building a new intelligent feed to surface your most important financial insights.
            </p>
        </div>
    );
}
