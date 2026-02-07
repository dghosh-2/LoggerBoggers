'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
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
        isLoading,
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
        high: 'border-destructive/40 bg-destructive/5',
        medium: 'border-warning/40 bg-warning/5',
        low: 'border-border',
    };

    const handleRefreshNews = async () => {
        await refreshNewsAnalysis();
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Upcoming</h2>
                    <p className="text-xs text-foreground-muted">Events that may affect your budget</p>
                </div>
                <GlassButton
                    onClick={handleRefreshNews}
                    disabled={isLoading}
                    variant="secondary"
                    size="sm"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </GlassButton>
            </div>

            {upcomingEvents.length === 0 ? (
                <GlassCard className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-foreground-muted mx-auto mb-3" />
                    <p className="text-foreground-muted mb-4">No upcoming events</p>
                    <GlassButton
                        onClick={handleRefreshNews}
                        disabled={isLoading}
                        variant="secondary"
                        size="md"
                    >
                        <Newspaper className="w-4 h-4" />
                        Scan News
                    </GlassButton>
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
                <p className="text-center text-sm text-foreground-muted">
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
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{event.eventName.split(' ')[0]}</span>
                        <h3 className="font-semibold text-foreground">
                            {event.eventName.replace(/^[^\s]+\s/, '')}
                        </h3>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {event.daysAway === 0 ? 'Today' :
                                event.daysAway === 1 ? 'Tomorrow' :
                                    `${event.daysAway} days`}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-foreground-muted">
                        {sourceIcon}
                        <span>{sourceLabel}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-secondary text-foreground-muted">
                        {event.confidence} confidence
                    </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/60 mb-3">
                    <span className="text-foreground-muted">Estimated cost</span>
                    <span className="text-xl font-semibold text-foreground">
                        ${event.estimatedCost.toLocaleString()}
                    </span>
                </div>

                {event.historicalData && event.historicalData.length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs text-foreground-muted mb-2">Historical spending</p>
                        <div className="flex gap-2">
                            {event.historicalData.slice(0, 3).map((h) => (
                                <div key={h.year} className="flex-1 p-2 rounded-lg bg-secondary/40 text-center">
                                    <p className="text-xs text-foreground-muted">{h.year}</p>
                                    <p className="text-sm font-medium text-foreground">
                                        ${h.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {event.newsInsight && (
                    <div className="p-3 rounded-lg bg-secondary border border-border mb-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-foreground-muted mt-0.5" />
                            <p className="text-sm text-foreground">{event.newsInsight}</p>
                        </div>
                    </div>
                )}

                <p className="text-sm text-foreground-muted mb-4">{event.actionableAdvice}</p>

                {hasLinkedGoal ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                        <Target className="w-4 h-4 text-foreground-muted" />
                        <span className="text-sm text-foreground">
                            Linked to goal: {event.linkedGoal?.name}
                        </span>
                        <span className="ml-auto text-sm text-foreground-muted">
                            ${event.linkedGoal?.currentAmount.toLocaleString()} saved
                        </span>
                    </div>
                ) : (
                    <GlassButton
                        onClick={onCreateGoal}
                        variant="secondary"
                        size="md"
                        className="w-full"
                    >
                        <Target className="w-4 h-4" />
                        Create Savings Goal
                        <ArrowRight className="w-4 h-4" />
                    </GlassButton>
                )}
            </GlassCard>
        </motion.div>
    );
}
