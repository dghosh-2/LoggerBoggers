'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import type { DeltaSummary as DeltaSummaryType } from '@/lib/timemachine-engine';
import { cn } from '@/lib/utils';

interface DeltaSummaryProps {
    delta: DeltaSummaryType;
}

export function DeltaSummary({ delta }: DeltaSummaryProps) {
    const cards = [
        {
            id: 'networth',
            label: 'Net Worth Change',
            value: delta.netWorthDelta,
            format: 'currency',
            icon: DollarSign,
            positive: delta.netWorthDelta >= 0,
        },
        {
            id: 'savings',
            label: 'Total Savings',
            value: delta.savingsDelta,
            format: 'currency',
            icon: delta.savingsDelta >= 0 ? TrendingUp : TrendingDown,
            positive: delta.savingsDelta >= 0,
        },
        {
            id: 'goal',
            label: 'Goal Time',
            value: delta.goalTimeDelta,
            format: 'months',
            icon: Target,
            positive: delta.goalTimeDelta >= 0,
        },
        {
            id: 'risk',
            label: 'Risk Score',
            value: delta.riskDelta,
            format: 'points',
            icon: AlertTriangle,
            positive: delta.riskDelta <= 0, // Lower risk is better
        },
    ];

    const formatValue = (value: number, format: string) => {
        switch (format) {
            case 'currency':
                const formatted = Math.abs(value).toLocaleString();
                return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
            case 'months':
                if (value === 0) return 'No change';
                const months = Math.abs(value).toFixed(1);
                return value > 0 ? `${months}mo faster` : `${months}mo slower`;
            case 'points':
                if (value === 0) return 'No change';
                return value > 0 ? `+${value} pts` : `${value} pts`;
            default:
                return value.toString();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
            {cards.map((card, index) => {
                const Icon = card.icon;

                return (
                    <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="card-elevated p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                                "p-1.5 rounded-lg",
                                card.positive ? "bg-success/10" : "bg-destructive/10"
                            )}>
                                <Icon className={cn(
                                    "w-3.5 h-3.5",
                                    card.positive ? "text-success" : "text-destructive"
                                )} />
                            </div>
                            <span className="text-xs text-foreground-muted">{card.label}</span>
                        </div>
                        <motion.p
                            key={card.value}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "text-lg font-bold font-mono",
                                card.positive ? "text-success" : "text-destructive"
                            )}
                        >
                            {formatValue(card.value, card.format)}
                        </motion.p>
                    </motion.div>
                );
            })}

            {/* Description card - full width */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="col-span-2 lg:col-span-4 p-4 rounded-xl bg-accent/10 border border-accent/20"
            >
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    <p className="text-sm font-medium text-accent">{delta.description}</p>
                </div>
            </motion.div>
        </motion.div>
    );
}
