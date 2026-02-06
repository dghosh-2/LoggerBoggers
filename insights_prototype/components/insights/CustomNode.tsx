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
    Shield
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
    Shield
};

const CustomNode = ({ data, isConnectable, selected }: NodeProps) => {
    const Icon = iconMap[data.icon] || Wallet;

    // Color coding based on type
    const isIncome = data.type === 'income';
    const isExpense = data.type === 'expense';

    return (
        <div className={cn(
            "relative min-w-[140px] px-3 py-3 rounded-xl border-2 transition-all duration-300 shadow-xl backdrop-blur-md",
            // Base styles
            "bg-zinc-900/90 border-zinc-800",
            // Selection Glow
            selected ? "border-primary shadow-[0_0_20px_-5px_var(--primary)] text-white" : "text-zinc-400",
            // Highlight override (passed via style prop in GraphViewer, but here we handle CSS classes if needed)
            // Note: React Flow passes inline styles for dynamic highlighting, so we keep this clean.
        )}>
            {isIncome ? null : (
                <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-900" isConnectable={isConnectable} />
            )}

            <div className="flex flex-col items-center text-center space-y-1">
                <div className={cn(
                    "p-2 rounded-full mb-1",
                    isIncome ? "bg-green-500/10 text-green-500" :
                        isExpense ? "bg-red-500/10 text-red-500" :
                            "bg-blue-500/10 text-blue-500"
                )}>
                    <Icon className="w-5 h-5" />
                </div>

                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide px-1">
                    {data.label}
                </span>

                <span className={cn(
                    "text-base font-bold font-mono",
                    isIncome ? "text-green-400" : "text-white"
                )}>
                    {data.amount}
                </span>
            </div>

            {!isExpense && (
                <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-600 !border-zinc-900" isConnectable={isConnectable} />
            )}
        </div>
    );
};

export default memo(CustomNode);
