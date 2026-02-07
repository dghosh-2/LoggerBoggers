'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { useBudgetStore } from '@/stores/budgetStore';
import {
    Calendar,
    Newspaper,
    History,
    User,
    RefreshCw,
    Target,
    X,
    ArrowRight,
    AlertCircle,
} from 'lucide-react';
import type { DetectedEvent, EventSource } from '@/types/budget';

export function UpcomingEvents() {
    const {
        upcomingEvents,
        refreshNewsAnalysis,
        dismissEvent,
        createEventGoal,
        isLoading
    } = useBudgetStore();

    const getSourceIcon = (source: EventSource) => {
        switch (source) {
            case 'calendar': return <Calendar className="w-4 h-4" />;
            case 'historical': return <History className="w-4 h-4" />;
            case 'news': return <Newspaper className="w-4 h-4" />;
            case 'user': return <User className="w-4 h-4" />;
        }
    };

    const getSourceLabel = (source: EventSource) => {
        switch (source) {
            case 'calendar': return 'Calendar';
            case 'historical': return 'Historical';
            case 'news': return 'News';
            case 'user': return 'Custom';
        }
    };

    const urgencyColors = {
        high: 'border-red-500/30 bg-red-500/5',
        medium: 'border-amber-500/30 bg-amber-500/5',
        low: 'border-gray-700',
    };

    const handleRefreshNews = async () => {
        await refreshNewsAnalysis();
    };

    return (
        <section className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
                <button
                    onClick={handleRefreshNews}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh News
                </button>
            </div>

            {/* Events Grid */}
            {upcomingEvents.length === 0 ? (
                <GlassCard className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">No upcoming events detected</p>
                    <button
                        onClick={handleRefreshNews}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                        <Newspaper className="w-4 h-4" />
                        Scan News for Events
                    </button>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingEvents.slice(0, 6).map((event, index) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            index={index}
                            urgencyColor={urgencyColors[event.urgency || 'low']}
                            sourceIcon={getSourceIcon(event.source)}
                            sourceLabel={getSourceLabel(event.source)}
                            onDismiss={() => dismissEvent(event.id)}
                            onCreateGoal={() => createEventGoal(event.id)}
                        />
                    ))}
                </div>
            )}

            {upcomingEvents.length > 6 && (
                <p className="text-center text-sm text-gray-500">
                    +{upcomingEvents.length - 6} more events
                </p>
            )}
        </section>
    );
}

interface EventCardProps {
    event: DetectedEvent;
    index: number;
    urgencyColor: string;
    sourceIcon: React.ReactNode;
    sourceLabel: string;
    onDismiss: () => void;
    onCreateGoal: () => void;
}

function EventCard({
    event,
    index,
    urgencyColor,
    sourceIcon,
    sourceLabel,
    onDismiss,
    onCreateGoal,
}: EventCardProps) {
    const hasLinkedGoal = !!event.linkedGoal;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <GlassCard className={`p-4 border ${urgencyColor}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{event.eventName.split(' ')[0]}</span>
                        <h3 className="font-semibold text-white">
                            {event.eventName.replace(/^[^\s]+\s/, '')}
                        </h3>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Info Row */}
                <div className="flex items-center gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {event.daysAway === 0 ? 'Today' :
                                event.daysAway === 1 ? 'Tomorrow' :
                                    `${event.daysAway} days`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                        {sourceIcon}
                        <span>{sourceLabel}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${event.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                            event.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-gray-500/20 text-gray-400'
                        }`}>
                        {event.confidence} confidence
                    </span>
                </div>

                {/* Estimated Cost */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 mb-3">
                    <span className="text-gray-400">Estimated cost</span>
                    <span className="text-xl font-bold text-white">
                        ${event.estimatedCost.toLocaleString()}
                    </span>
                </div>

                {/* Historical Data */}
                {event.historicalData && event.historicalData.length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2">Historical spending</p>
                        <div className="flex gap-2">
                            {event.historicalData.slice(0, 3).map((h) => (
                                <div key={h.year} className="flex-1 p-2 rounded-lg bg-gray-800/30 text-center">
                                    <p className="text-xs text-gray-500">{h.year}</p>
                                    <p className="text-sm font-medium text-gray-300">
                                        ${h.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* News Insight */}
                {event.newsInsight && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                            <p className="text-sm text-blue-300">{event.newsInsight}</p>
                        </div>
                    </div>
                )}

                {/* Advice */}
                <p className="text-sm text-gray-400 mb-4">{event.actionableAdvice}</p>

                {/* Action Button */}
                {hasLinkedGoal ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-emerald-300">
                            Linked to goal: {event.linkedGoal?.name}
                        </span>
                        <span className="ml-auto text-sm text-emerald-400">
                            ${event.linkedGoal?.currentAmount.toLocaleString()} saved
                        </span>
                    </div>
                ) : (
                    <button
                        onClick={onCreateGoal}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                    >
                        <Target className="w-4 h-4" />
                        Create Savings Goal
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </GlassCard>
        </motion.div>
    );
}
