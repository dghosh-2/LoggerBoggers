"use client";

import React, { useEffect, useMemo } from 'react';
import ReactFlow, {
  Controls,
  useNodesState,
  useEdgesState,
  Background
} from 'reactflow';
import 'reactflow/dist/style.css';
import { INITIAL_NODES, INITIAL_EDGES, MOCK_INSIGHTS, MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { useInsightsStore } from '@/stores/insights-store';
import CustomNode from './custom-node';

export function FinancialGraph() {
  // Note: Renamed from FinancialGraphViewer to FinancialGraph for compatibility with existing import
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const { selectedInsightId, selectedCategory, setSelectedCategory, selectedRange } = useInsightsStore();

  // Calculate node amounts based on selected range
  const filteredNodes = useMemo(() => {
    const now = new Date('2026-02-01');
    const rangeTransactions = MOCK_TRANSACTIONS.filter(t => {
      const date = new Date(t.date);
      if (selectedRange === 'MTD') {
        return date.getMonth() === 0 && date.getFullYear() === 2026;
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

    const categoryTotals: Record<string, number> = {};
    rangeTransactions.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    // Income is mocked as 1.2x expenses for simplicity in this dynamic view
    const totalIncome = Math.round(totalExpenses * 1.2);

    return INITIAL_NODES.map(node => {
      let amount = node.data.amount; // Default static

      if (node.id === 'root-income') {
        amount = totalIncome;
      } else if (node.id === 'root-account') {
        amount = totalIncome; // Simplified flow
      } else if (node.id === 'group-expenses') {
        amount = totalExpenses;
      } else if (categoryTotals[node.data.label]) {
        amount = categoryTotals[node.data.label];
      } else if (node.data.type === 'expense' && !categoryTotals[node.data.label]) {
        // If filtering removes all txns for a category, set to 0
        amount = 0;
      }

      // Fix float precision (e.g. 896.900001 -> 896.90) and consistent string format
      const formattedAmount = typeof amount === 'number'
        ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : amount;

      return {
        ...node,
        data: { ...node.data, amount: formattedAmount }
      };
    });

  }, [selectedRange]);

  // Update nodes when logic changes
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
        eds.map((edge) => ({ ...edge, animated: true, style: { stroke: '#3f3f46', opacity: 1 } }))
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
          const targetNode = INITIAL_NODES.find(n => n.id === edge.target);
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
            stroke: isHighlighted ? '#22c55e' : '#3f3f46',
            opacity: isHighlighted ? 1 : 0.1,
            strokeWidth: isHighlighted ? 2 : 1
          }
        }
      })
    );

  }, [selectedInsightId, selectedCategory, setNodes, setEdges]);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-1">
        <div className="px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs font-medium text-zinc-400 backdrop-blur-md w-fit">
          Live Graph
        </div>

        {/* Total Overlay */}
        <div className="px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md shadow-2xl">
          <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-0.5">
            {selectedRange === 'MTD' ? 'This Month' : selectedRange === '3M' ? 'Last 3 Months' : 'Yearly Total'}
          </div>
          <div className="text-xl font-mono font-bold text-white">
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
        <Background gap={20} size={1} color="#333" className="opacity-20" />
        <Controls
          className="bg-zinc-900 border-zinc-800 text-zinc-400 fill-current"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
