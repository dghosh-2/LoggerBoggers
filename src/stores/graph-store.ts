import { create } from "zustand";

export interface GraphNode {
  id: string;
  type: "income" | "account" | "expense" | "savings" | "debt" | "goal" | "investment";
  label: string;
  amount: number;
  frequency: "monthly" | "weekly" | "yearly" | "one-time";
  x: number;
  y: number;
  color?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  percentage?: number;
  label?: string;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  highlightedNodes: string[];
  viewMode: "view" | "edit";
  overlayMode: "sandbox" | "actual" | "overlay";
  
  // Actions
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setHighlightedNodes: (ids: string[]) => void;
  setViewMode: (mode: "view" | "edit") => void;
  setOverlayMode: (mode: "sandbox" | "actual" | "overlay") => void;
  loadSampleData: () => void;
}

// Sample data for demo
const sampleNodes: GraphNode[] = [
  { id: "salary", type: "income", label: "Salary", amount: 5200, frequency: "monthly", x: 100, y: 200 },
  { id: "checking", type: "account", label: "Checking", amount: 3500, frequency: "monthly", x: 350, y: 200 },
  { id: "savings", type: "savings", label: "Savings", amount: 800, frequency: "monthly", x: 600, y: 100 },
  { id: "rent", type: "expense", label: "Rent", amount: 2100, frequency: "monthly", x: 600, y: 200 },
  { id: "groceries", type: "expense", label: "Groceries", amount: 450, frequency: "monthly", x: 600, y: 300 },
  { id: "utilities", type: "expense", label: "Utilities", amount: 150, frequency: "monthly", x: 600, y: 400 },
  { id: "dining", type: "expense", label: "Dining", amount: 300, frequency: "monthly", x: 500, y: 350 },
  { id: "subscriptions", type: "expense", label: "Subscriptions", amount: 48, frequency: "monthly", x: 700, y: 350 },
];

const sampleEdges: GraphEdge[] = [
  { id: "e1", source: "salary", target: "checking", amount: 5200 },
  { id: "e2", source: "checking", target: "savings", amount: 800, percentage: 15 },
  { id: "e3", source: "checking", target: "rent", amount: 2100, percentage: 40 },
  { id: "e4", source: "checking", target: "groceries", amount: 450, percentage: 9 },
  { id: "e5", source: "checking", target: "utilities", amount: 150, percentage: 3 },
  { id: "e6", source: "checking", target: "dining", amount: 300, percentage: 6 },
  { id: "e7", source: "checking", target: "subscriptions", amount: 48, percentage: 1 },
];

export const useGraphStore = create<GraphState>((set) => ({
  nodes: sampleNodes,
  edges: sampleEdges,
  selectedNode: null,
  highlightedNodes: [],
  viewMode: "view",
  overlayMode: "actual",

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  addEdge: (edge) =>
    set((state) => ({ edges: [...state.edges, edge] })),

  removeEdge: (id) =>
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),

  setSelectedNode: (id) => set({ selectedNode: id }),

  setHighlightedNodes: (ids) => set({ highlightedNodes: ids }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setOverlayMode: (mode) => set({ overlayMode: mode }),

  loadSampleData: () => set({ nodes: sampleNodes, edges: sampleEdges }),
}));
