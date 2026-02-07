'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
    Controls,
    useNodesState,
    useEdgesState,
    Background,
    Node,
    Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GlassCard } from '@/components/ui/glass-card';
import { useFinancialData } from '@/hooks/useFinancialData';
import { INITIAL_NODES, INITIAL_EDGES } from '@/lib/mock-data';
import CustomNode from '@/components/graph/custom-node';

const EMPTY_STATE = {
    title: 'Budget Flow',
    subtitle: 'Connect accounts to see your money flow',
};

type RangeKey = 'MTD' | '3M' | 'YR';

function formatMoney(value: number) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BudgetFlowChart() {
    const { transactions, summary, isConnected, loading } = useFinancialData();
    const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES as Edge[]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedRange, setSelectedRange] = useState<RangeKey>('MTD');

    const filteredNodes = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        const rangeTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            if (selectedRange === 'MTD') {
                return date >= monthStart && date <= now;
            }
            if (selectedRange === '3M') {
                return date >= threeMonthsAgo && date <= now;
            }
            return date >= twelveMonthsAgo && date <= now;
        });

        const categoryTotals: Record<string, number> = {};
        rangeTransactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

        const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
        const baseIncome = summary?.monthly_income
            ? summary.monthly_income
            : Math.round(totalExpenses * 1.2);

        const incomeMultiplier = selectedRange === 'MTD' ? 1 : selectedRange === '3M' ? 3 : 12;
        const totalIncome = baseIncome * incomeMultiplier;
        const savingsAmount = Math.max(0, totalIncome - totalExpenses);

        return (INITIAL_NODES as Node[]).map(node => {
            let amount = node.data.amount;

            if (node.id === '1') {
                amount = totalIncome;
            } else if (node.id === '2') {
                amount = totalExpenses;
            } else if (node.id === '3') {
                amount = savingsAmount;
            } else if (categoryTotals[node.data.label]) {
                amount = categoryTotals[node.data.label];
            } else if (node.data.type === 'expense' && !categoryTotals[node.data.label]) {
                amount = 0;
            }

            const numericAmount = typeof amount === 'number' ? amount : 0;
            const isExpense = node.data.type === 'expense';
            const formattedAmount = typeof amount === 'number'
                ? `${isExpense ? '-' : ''}${formatMoney(numericAmount)}`
                : amount;

            return {
                ...node,
                data: { ...node.data, amount: formattedAmount },
            };
        });
    }, [transactions, summary, selectedRange]);

    useEffect(() => {
        setNodes(filteredNodes);
    }, [filteredNodes, setNodes]);

    const nodeTypes = useMemo(() => ({
        custom: CustomNode,
    }), []);

    const onNodeClick = (_: React.MouseEvent, node: any) => {
        if (node.data.type === 'expense') {
            setSelectedCategory(node.data.label);
        } else {
            setSelectedCategory(null);
        }
    };

    const totalDisplayedSpend = useMemo(() => {
        return nodes
            .filter(n => n.data.type === 'expense')
            .reduce((sum, n) => {
                const val = parseFloat(String(n.data.amount).replace(/[^0-9.-]+/g, ''));
                return sum + (isNaN(val) ? 0 : Math.abs(val));
            }, 0);
    }, [nodes]);

    useEffect(() => {
        if (!selectedCategory) {
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    selected: false,
                    style: { opacity: 1, filter: 'grayscale(0%)' },
                }))
            );
            setEdges((eds) =>
                eds.map((edge) => ({
                    ...edge,
                    animated: true,
                    style: { stroke: 'var(--border-strong)', opacity: 1 },
                }))
            );
            return;
        }

        setNodes((nds) =>
            nds.map((node) => {
                const isHighlighted = node.data.label === selectedCategory;
                return {
                    ...node,
                    selected: isHighlighted,
                    style: {
                        opacity: isHighlighted ? 1 : 0.18,
                        filter: isHighlighted ? 'none' : 'grayscale(100%)',
                        transition: 'all 0.5s ease',
                    },
                };
            })
        );

        setEdges((eds) =>
            eds.map((edge) => {
                const targetNode = (INITIAL_NODES as Node[]).find(n => n.id === edge.target);
                const isHighlighted = targetNode?.data.label === selectedCategory;
                return {
                    ...edge,
                    animated: isHighlighted,
                    style: {
                        stroke: isHighlighted ? 'var(--primary)' : 'var(--border-strong)',
                        opacity: isHighlighted ? 1 : 0.06,
                        strokeWidth: isHighlighted ? 2 : 1,
                    },
                };
            })
        );
    }, [selectedCategory, setNodes, setEdges]);

    const rangeLabel = selectedRange === 'MTD'
        ? 'This Month'
        : selectedRange === '3M'
            ? 'Last 3 Months'
            : 'Last 12 Months';

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Budget Flow</h2>
                    <p className="text-xs text-foreground-muted">Live view of income and spending</p>
                </div>
                <div className="flex items-center gap-2">
                    {(['MTD', '3M', 'YR'] as RangeKey[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setSelectedRange(range)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                selectedRange === range
                                    ? 'border-foreground text-foreground bg-card'
                                    : 'border-border text-foreground-muted bg-transparent'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="relative h-[480px]">
                    <motion.div
                        className="absolute top-4 left-4 z-10 flex flex-col space-y-1"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-foreground-muted w-fit">
                            Live Graph
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-card border border-border shadow-md">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-0.5">
                                {rangeLabel}
                            </div>
                            <div className="text-xl font-mono font-bold text-foreground">
                                {formatMoney(totalDisplayedSpend)}
                            </div>
                        </div>
                    </motion.div>

                    {loading || !isConnected ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <p className="text-sm text-foreground-muted">{EMPTY_STATE.subtitle}</p>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            key={selectedRange}
                            className="h-full"
                            initial={{ opacity: 0.6, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onNodeClick={onNodeClick}
                                nodeTypes={nodeTypes}
                                fitView
                                minZoom={0.5}
                                maxZoom={1.5}
                                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background gap={20} size={1} color="var(--border)" className="opacity-20" />
                                <Controls
                                    className="bg-card border-border text-foreground-muted fill-current"
                                    showInteractive={false}
                                />
                            </ReactFlow>
                        </motion.div>
                    )}
                </div>
            </GlassCard>
        </section>
    );
}
