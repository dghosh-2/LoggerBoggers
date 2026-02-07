"use client";

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
    Wallet,
    CreditCard,
    PiggyBank,
    Home,
    ShoppingCart,
    Utensils,
    Repeat,
    ShoppingBag,
    Zap,
    GraduationCap,
    Shield,
    Car,
    Tv,
    MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: any = {
    Wallet,
    CreditCard,
    PiggyBank,
    Home,
    ShoppingCart,
    Utensils,
    Repeat,
    ShoppingBag,
    Zap,
    GraduationCap,
    Shield,
    Car,
    Tv,
    MoreHorizontal
};

const CustomNode = ({ data, isConnectable, selected }: NodeProps) => {
    const Icon = iconMap[data.icon] || Wallet;

    // Color coding based on type
    const isIncome = data.type === 'income';
    const isExpense = data.type === 'expense';

    return (
        <div className={cn(
            "relative min-w-[140px] px-4 py-4 rounded-xl border-2 transition-all duration-300 shadow-lg backdrop-blur-md",
            // Base styles - theme aware
            "bg-card/95 dark:bg-card/90 border-border",
            // Selection Glow
            selected ? "border-primary shadow-[0_0_20px_-5px_var(--primary)]" : "",
        )}>
            {isIncome ? null : (
                <Handle 
                    type="target" 
                    position={Position.Top} 
                    className="!w-2.5 !h-2.5 !bg-border-strong dark:!bg-foreground-muted !border-card" 
                    isConnectable={isConnectable} 
                />
            )}

            <div className="flex flex-col items-center text-center space-y-1.5">
                <div className={cn(
                    "p-2.5 rounded-full mb-1",
                    isIncome ? "bg-success-soft text-success" :
                        isExpense ? "bg-destructive-soft text-destructive" :
                            "bg-primary-soft text-primary"
                )}>
                    <Icon className="w-5 h-5" />
                </div>

                <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wide px-1">
                    {data.label}
                </span>

                <span className={cn(
                    "text-base font-bold font-mono text-foreground",
                    isIncome && "text-success"
                )}>
                    {data.amount}
                </span>
            </div>

            {!isExpense && (
                <Handle 
                    type="source" 
                    position={Position.Bottom} 
                    className="!w-2.5 !h-2.5 !bg-border-strong dark:!bg-foreground-muted !border-card" 
                    isConnectable={isConnectable} 
                />
            )}
        </div>
    );
};

export default memo(CustomNode);
