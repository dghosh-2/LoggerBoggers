"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryDetails } from './CategoryDetails';
import { useInsightsStore } from '@/stores/insights-store';

export function InsightsFeed() {
    const { selectedCategory } = useInsightsStore();

    return (
        <AnimatePresence mode="wait">
            {selectedCategory && (
                <motion.aside 
                    key="category-details"
                    initial={{ opacity: 0, x: -20, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: 'auto' }}
                    exit={{ opacity: 0, x: -20, width: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="col-span-3 card-elevated overflow-hidden"
                >
                    <CategoryDetails />
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
