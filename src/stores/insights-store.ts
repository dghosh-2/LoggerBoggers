import { create } from 'zustand';
import { InsightItem } from '@/lib/mock-data';

interface InsightsState {
    selectedInsightId: string | null;
    selectedCategory: string | null;
    selectedMonth: string;
    selectedRange: 'MTD' | '3M' | 'YR' | 'All'; // Updated 12M -> YR
    currentView: 'graph' | 'calendar' | 'analysis' | 'trends' | 'subscriptions'; // Track active view
    visibleGraphLayers: string[]; // ['base', 'sandbox', 'overlay']
    explainingInsightId: string | null; // Controls the deep dive panel
    explainingItem: any | null; // Using any to avoid circular dependency
    activeSim: any | null; // Active simulation modal data
    budgets: Record<string, number>; // Category budget caps
    reductionGoals: Record<string, number>; // Category -> reduction %
    selectedDate: string | null; // Selected date in calendar view (YYYY-MM-DD format)

    setSelectedInsightId: (id: string | null) => void;
    setExplainingInsightId: (id: string | null) => void;
    setExplainingItem: (item: any | null) => void;
    setActiveSim: (sim: any | null) => void;
    setBudget: (category: string, amount: number) => void;
    setReductionGoal: (category: string, percent: number) => void;
    clearReductionGoal: (category: string) => void;
    setSelectedCategory: (category: string | null) => void;
    setSelectedMonth: (month: string) => void;
    setSelectedRange: (range: 'MTD' | '3M' | 'YR' | 'All') => void;
    setCurrentView: (view: 'graph' | 'calendar' | 'analysis' | 'trends' | 'subscriptions') => void;
    toggleGraphLayer: (layer: string) => void;
    setSelectedDate: (date: string | null) => void;
}

export const useInsightsStore = create<InsightsState>((set) => ({
    selectedInsightId: null,
    selectedCategory: null,
    selectedMonth: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }),
    selectedRange: 'MTD',
    currentView: 'graph',
    visibleGraphLayers: ['base'],
    explainingInsightId: null,
    explainingItem: null, // NEW: For passing ad-hoc objects (matches InsightItem interface)
    activeSim: null,
    budgets: {},
    reductionGoals: {},
    selectedDate: null,

    setSelectedInsightId: (id) => set({ selectedInsightId: id, selectedCategory: null }),
    setExplainingInsightId: (id) => set({ explainingInsightId: id, explainingItem: null }), // Clear manual item if ID set
    setExplainingItem: (item) => set({ explainingItem: item, explainingInsightId: null }), // Clear ID if item set
    setActiveSim: (sim) => set({ activeSim: sim }),
    setBudget: (category, amount) => set((state) => ({ budgets: { ...state.budgets, [category]: amount } })),
    setReductionGoal: (category, percent) => set((state) => ({ reductionGoals: { ...state.reductionGoals, [category]: percent } })),
    clearReductionGoal: (category) => set((state) => {
        const { [category]: _, ...rest } = state.reductionGoals;
        return { reductionGoals: rest };
    }),
    setSelectedCategory: (category) => set({ selectedCategory: category, selectedInsightId: null }),
    setSelectedMonth: (month) => set({ selectedMonth: month }),
    setSelectedRange: (range) => set({ selectedRange: range }),
    setCurrentView: (view) => set({ currentView: view }),
    toggleGraphLayer: (layer) =>
        set((state) => ({
            visibleGraphLayers: state.visibleGraphLayers.includes(layer)
                ? state.visibleGraphLayers.filter(l => l !== layer)
                : [...state.visibleGraphLayers, layer]
        })),
    setSelectedDate: (date) => set({ selectedDate: date }),
}));
