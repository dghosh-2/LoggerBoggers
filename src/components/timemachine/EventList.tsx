'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Percent, ShoppingBag, CreditCard, Home, Utensils, Repeat, Zap, Coffee, Car } from 'lucide-react';
import { useTimeMachineStore } from '@/stores/timemachine-store';
import type { FinancialEvent, CounterfactualOp } from '@/lib/timemachine-engine';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    Shopping: ShoppingBag,
    Rent: Home,
    Food: Utensils,
    Groceries: ShoppingBag,
    Subscriptions: Repeat,
    Bills: Zap,
    Coffee: Coffee,
    Transport: Car,
    Entertainment: CreditCard,
};

export function EventList() {
    const { events, addOperation, selectedOps } = useTimeMachineStore();

    // Get major events (large discretionary spending)
    const majorEvents = useMemo(() => {
        return events
            .filter(e => e.amount > 200 && (e.tags.includes('discretionary') || e.tags.includes('one-off')))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 15);
    }, [events]);

    // Check if an event is already removed
    const isRemoved = (eventId: string) => {
        return selectedOps.some(op => op.type === 'REMOVE' && op.eventId === eventId);
    };

    const handleRemove = (event: FinancialEvent) => {
        const op: CounterfactualOp = {
            type: 'REMOVE',
            eventId: event.id,
            description: `Undo "${event.merchant}" ($${event.amount.toFixed(0)})`,
        };
        addOperation(op);
    };

    const handleScale = (event: FinancialEvent, factor: number) => {
        const op: CounterfactualOp = {
            type: 'SCALE',
            eventId: event.id,
            factor,
            description: `${Math.round((1 - factor) * 100)}% less on "${event.merchant}"`,
        };
        addOperation(op);
    };

    if (majorEvents.length === 0) {
        return (
            <div className="py-6 text-center text-foreground-muted">
                <p className="text-sm">No major events found</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {majorEvents.map((event, index) => {
                const Icon = CATEGORY_ICONS[event.category] || CreditCard;
                const removed = isRemoved(event.id);

                return (
                    <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                            "group p-3 rounded-xl border transition-all",
                            removed
                                ? "bg-destructive/10 border-destructive/30 opacity-60"
                                : "bg-secondary/50 border-border hover:border-primary/30"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <div className={cn(
                                    "p-1.5 rounded-lg shrink-0",
                                    removed ? "bg-destructive/20" : "bg-secondary"
                                )}>
                                    <Icon className={cn(
                                        "w-3.5 h-3.5",
                                        removed ? "text-destructive" : "text-foreground-muted"
                                    )} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={cn(
                                        "text-sm font-medium truncate",
                                        removed && "line-through text-foreground-muted"
                                    )}>
                                        {event.merchant}
                                    </p>
                                    <p className="text-xs text-foreground-muted">
                                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        <span className="mx-1">•</span>
                                        {event.category}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                    "text-sm font-mono font-semibold",
                                    removed ? "text-foreground-muted line-through" : "text-destructive"
                                )}>
                                    ${event.amount.toFixed(0)}
                                </span>

                                {!removed && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleScale(event, 0.5)}
                                            className="p-1.5 rounded-lg hover:bg-warning/20 transition-colors"
                                            title="50% less"
                                        >
                                            <Percent className="w-3 h-3 text-warning" />
                                        </button>
                                        <button
                                            onClick={() => handleRemove(event)}
                                            className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
