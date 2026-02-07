"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryDetails } from './CategoryDetails';
import { DayDetails } from './DayDetails'; // NEW
import { useInsightsStore } from '@/stores/insights-store';

export function InsightsFeed() {
    const { selectedCategory, selectedDate } = useInsightsStore(); // Add selectedDate

    // Determine which detail view to show (if any)
    const showDetails = selectedCategory || selectedDate;

    return (
        <AnimatePresence mode="wait">
            {showDetails && (
                <motion.aside
                    key={selectedCategory ? "category-details" : "day-details"}
                    initial={{ opacity: 0, x: -20, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 'auto' }}
                    exit={{ opacity: 0, x: -20, width: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="col-span-3 card-elevated overflow-hidden"
                >
                    {selectedCategory ? <CategoryDetails /> : <DayDetails />}
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
