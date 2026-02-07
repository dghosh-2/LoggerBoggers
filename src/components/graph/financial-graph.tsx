"use client";

import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Controls,
  useNodesState,
  useEdgesState,
  Background,
  Node,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MOCK_INSIGHTS } from '@/lib/mock-data';
import { useInsightsStore } from '@/stores/insights-store';
import { useThemeStore } from '@/stores/theme-store';
import { useFinancialData } from '@/hooks/useFinancialData';
import CustomNode from './custom-node';
import { Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/glass-button';

import { getTopCategories, isOtherCategory, MAX_DISPLAYED_CATEGORIES, STANDARD_CATEGORIES } from '@/lib/categories';

// Category to icon mapping - synced with STANDARD_CATEGORIES
const CATEGORY_ICONS: Record<string, string> = {
  'Food & Drink': 'Utensils',
  'Transportation': 'Car',
  'Shopping': 'ShoppingBag',
  'Entertainment': 'Tv',
  'Bills & Utilities': 'Zap',
  'Health & Fitness': 'Dumbbell',
  'Travel': 'Plane',
  'Personal Care': 'Sparkles',
  'Education': 'GraduationCap',
  'Other': 'MoreHorizontal',
};

export function FinancialGraph() {
  const router = useRouter();
  const { selectedInsightId, selectedCategory, setSelectedCategory, selectedRange } = useInsightsStore();
  const { theme } = useThemeStore();
  const { transactions, summary, isConnected, loading } = useFinancialData();
  const isDark = theme === 'dark';

  // Generate dynamic nodes and edges based on real data
  const { dynamicNodes, dynamicEdges, totalIncome, totalExpenses } = useMemo(() => {
    const now = new Date();


    // Filter transactions by range
    const rangeTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      if (selectedRange === 'MTD') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (selectedRange === '3M') {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        return date >= threeMonthsAgo;
      } else if (selectedRange === 'YR') {
        const twelveMonthsAgo = new Date(now);
        twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
        return date >= twelveMonthsAgo;
      }
      return true;
    });

    // Calculate category totals
    const categoryTotals: Record<string, number> = {};
    rangeTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const totalExp = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    // Use real income from summary if available
    const totalInc = summary?.monthly_income
      ? (selectedRange === 'MTD' ? summary.monthly_income : summary.monthly_income * (selectedRange === '3M' ? 3 : 12))
      : Math.round(totalExp * 1.2);

    // Use centralized logic to determine groupings
    // We use MAX_DISPLAYED_CATEGORIES to match other views
    const topCategories = getTopCategories(categoryTotals, MAX_DISPLAYED_CATEGORIES);

    const finalCategories: Record<string, number> = {};
    let otherTotal = 0;

    Object.entries(categoryTotals).forEach(([cat, amount]) => {
      if (isOtherCategory(cat, topCategories)) {
        otherTotal += amount;
      } else {
        finalCategories[cat] = amount;
      }
    });

    if (otherTotal > 0) {
      finalCategories['Other'] = otherTotal;
    }

    // Sort for display (largest first)
    const sortedCategories = Object.entries(finalCategories)
      .sort((a, b) => b[1] - a[1]);

    // Create nodes
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Income node
    nodes.push({
      id: 'income',
      type: 'custom',
      position: { x: 350, y: 0 },
      data: {
        label: 'Income',
        amount: isConnected ? `$${Math.round(totalInc).toLocaleString()}` : '$0',
        type: 'income',
        icon: 'Wallet'
      }
    });

    // Account node
    nodes.push({
      id: 'account',
      type: 'custom',
      position: { x: 350, y: 150 },
      data: {
        label: 'Main Account',
        amount: isConnected ? `$${Math.round(totalInc - totalExp).toLocaleString()}` : '$0',
        type: 'account',
        icon: 'CreditCard'
      }
    });

    // Edge from income to account
    edges.push({
      id: 'e-income-account',
      source: 'income',
      target: 'account',
      animated: true,
      style: { stroke: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }
    });

    // Create expense category nodes
    const startX = 0;
    const spacing = 140;

    sortedCategories.forEach(([category, amount], index) => {
      const nodeId = `cat-${index}`;
      nodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: startX + (index * spacing), y: 320 },
        data: {
          label: category,
          amount: isConnected ? `-$${Math.round(amount).toLocaleString()}` : '$0',
          type: 'expense',
          icon: CATEGORY_ICONS[category] || 'MoreHorizontal'
        }
      });

      edges.push({
        id: `e-account-${nodeId}`,
        source: 'account',
        target: nodeId,
        animated: true,
        style: { stroke: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }
      });
    });

    // If no categories, show placeholder nodes
    if (sortedCategories.length === 0) {
      const defaultCategories = ['Shopping', 'Food & Drink', 'Bills & Utilities', 'Transportation', 'Entertainment', 'Other'];
      defaultCategories.forEach((category, index) => {
        const nodeId = `cat-${index}`;
        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: startX + (index * spacing), y: 320 },
          data: {
            label: category,
            amount: '$0',
            type: 'expense',
            icon: CATEGORY_ICONS[category] || 'MoreHorizontal'
          }
        });

        edges.push({
          id: `e-account-${nodeId}`,
          source: 'account',
          target: nodeId,
          animated: true,
          style: { stroke: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)' }
        });
      });
    }

    return {
      dynamicNodes: nodes,
      dynamicEdges: edges,
      totalIncome: totalInc,
      totalExpenses: totalExp
    };
  }, [selectedRange, transactions, summary, isConnected, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState(dynamicNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(dynamicEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(dynamicNodes);
    setEdges(dynamicEdges);
  }, [dynamicNodes, dynamicEdges, setNodes, setEdges]);

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

  // Calculate total displayed spend dynamically from the nodes themselves
  // This resolves the mismatch between "mock logic" and "displayed nodes"
  const totalDisplayedSpend = useMemo(() => {
    // Sum all 'expense' type nodes (leaf nodes)
    // or just use the group-expenses node if it's accurate. 
    // Safer to sum leaf nodes to avoid syncing issues.
    return nodes
      .filter(n => n.data.type === 'expense')
      .reduce((sum, n) => {
        // Parse "$1,234.56" back to number
        const val = parseFloat(String(n.data.amount).replace(/[^0-9.-]+/g, ""));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  }, [nodes]);

  useEffect(() => {
    const edgeColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';

    if (!selectedInsightId && !selectedCategory) {
      // Reset styles if nothing selected
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: false,
          style: { opacity: 1, filter: 'grayscale(0%)' },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({ ...edge, animated: true, style: { stroke: edgeColor, opacity: 1 } }))
      );
      return;
    }

    const currentInsight = MOCK_INSIGHTS.find((i) => i.id === selectedInsightId);

    // Highlight Logic
    setNodes((nds) =>
      nds.map((node) => {
        let isHighlighted = false;

        if (selectedCategory) {
          isHighlighted = node.data.label === selectedCategory;
        } else if (currentInsight) {
          isHighlighted = currentInsight.relatedNodeIds.includes(node.id);
        }

        return {
          ...node,
          selected: isHighlighted,
          style: {
            opacity: isHighlighted ? 1 : 0.3,
            filter: isHighlighted ? 'none' : 'grayscale(100%)',
            transition: 'all 0.4s ease',
          },
        };
      })
    );

    // Fade edges
    setEdges((eds) =>
      eds.map((edge) => {
        let isHighlighted = false;

        if (selectedCategory) {
          const targetNode = dynamicNodes.find(n => n.id === edge.target);
          if (targetNode && targetNode.data.label === selectedCategory) {
            isHighlighted = true;
          }
        } else if (currentInsight) {
          isHighlighted = currentInsight.relatedNodeIds.includes(edge.target);
        }

        return {
          ...edge,
          animated: isHighlighted,
          style: {
            stroke: isHighlighted ? (isDark ? '#34d399' : '#059669') : edgeColor,
            opacity: isHighlighted ? 1 : 0.1,
            strokeWidth: isHighlighted ? 2 : 1
          }
        }
      })
    );

  }, [selectedInsightId, selectedCategory, setNodes, setEdges, isDark]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden relative bg-background-secondary dark:bg-background-secondary">
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="px-3 py-1.5 rounded-full bg-card/90 dark:bg-card/80 border border-border text-xs font-medium text-foreground-muted backdrop-blur-md w-fit shadow-sm">
          Live Graph
        </div>

        {/* Total Overlay */}
        <div className="px-4 py-3 rounded-xl bg-card/95 dark:bg-card/90 border border-border backdrop-blur-md shadow-lg">
          <div className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted mb-1">
            {selectedRange === 'MTD' ? 'This Month' : selectedRange === '3M' ? 'Last 3 Months' : 'Yearly Total'}
          </div>
          <div className="text-xl font-mono font-bold text-foreground">
            ${totalDisplayedSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

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
        <Background
          gap={20}
          size={1}
          color={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}
        />
        <Controls
          className="!bg-card !border-border !rounded-lg !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground-muted [&>button:hover]:!bg-secondary"
          showInteractive={false}
          style={{ left: 10, bottom: 10 }}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}
