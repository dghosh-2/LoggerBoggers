import { create } from "zustand";
import { SimulationOutput, NewsImpact } from "@/lib/simulation-engine";

export interface SimulationScenario {
  id: string;
  name: string;
  changes: {
    nodeId: string;
    field: string;
    originalValue: number;
    newValue: number;
  }[];
  createdAt: Date;
}

export interface NewsInsight {
  id: string;
  title: string;
  source: string;
  impact: 'positive' | 'negative';
  category: string;
  summary: string;
  suggestion: string;
}

interface SimulationState {
  // Sliders
  incomeChange: number;
  expenseChange: number;
  savingsRate: number;
  simulationMonths: number;

  // Scenarios
  scenarios: SimulationScenario[];
  activeScenario: string | null;

  // Custom Event Query
  customEventQuery: string;

  // AI Response
  aiResponse: string | null;
  isLoadingAI: boolean;

  // News Insights
  newsInsights: NewsInsight[];
  isLoadingNews: boolean;

  // Simulation Results
  simulationResult: SimulationOutput | null;
  isSimulating: boolean;

  // Actions
  setIncomeChange: (value: number) => void;
  setExpenseChange: (value: number) => void;
  setSavingsRate: (value: number) => void;
  setSimulationMonths: (value: number) => void;
  setCustomEventQuery: (query: string) => void;
  resetSimulation: () => void;
  toggleSimulation: () => void;
  runSimulation: () => Promise<void>;
  fetchNews: () => Promise<void>;
  askAI: (query: string) => Promise<void>;
  addScenario: (scenario: SimulationScenario) => void;
  setActiveScenario: (id: string | null) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  incomeChange: 0,
  expenseChange: 0,
  savingsRate: 25,
  simulationMonths: 12,
  scenarios: [],
  activeScenario: null,
  customEventQuery: '',
  aiResponse: null,
  isLoadingAI: false,
  newsInsights: [],
  isLoadingNews: false,
  simulationResult: null,
  isSimulating: false,

  setIncomeChange: (value) => {
    set({ incomeChange: value });
  },

  setExpenseChange: (value) => {
    set({ expenseChange: value });
  },

  setSavingsRate: (value) => {
    set({ savingsRate: value });
  },

  setSimulationMonths: (value) => {
    set({ simulationMonths: value });
  },

  setCustomEventQuery: (query) => {
    set({ customEventQuery: query });
  },

  resetSimulation: () => {
    set({
      incomeChange: 0,
      expenseChange: 0,
      savingsRate: 25,
      simulationMonths: 12,
      isSimulating: false,
      aiResponse: null,
      simulationResult: null,
      customEventQuery: '',
    });
  },

  toggleSimulation: () => {
    set((state) => ({ isSimulating: !state.isSimulating }));
  },

  runSimulation: async () => {
    const { incomeChange, expenseChange, savingsRate, customEventQuery, simulationMonths } = get();
    set({ isSimulating: true, isLoadingAI: customEventQuery ? true : false });

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeChangePercent: incomeChange,
          expenseChangePercent: expenseChange,
          savingsRatePercent: savingsRate,
          userQuery: customEventQuery || null,
          months: simulationMonths,
          includeNews: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        set({
          simulationResult: data.simulation,
          aiResponse: data.aiResponse,
          isLoadingAI: false,
          isSimulating: false, // Reset after completion
        });
      } else {
        set({ isLoadingAI: false, isSimulating: false });
      }
    } catch (error) {
      console.error('Simulation error:', error);
      set({ isLoadingAI: false, isSimulating: false });
    }
  },

  fetchNews: async () => {
    set({ isLoadingNews: true });

    try {
      const response = await fetch('/api/news');
      const data = await response.json();

      if (data.success) {
        set({ newsInsights: data.news, isLoadingNews: false });
      }
    } catch (error) {
      console.error('News fetch error:', error);
      set({ isLoadingNews: false });
    }
  },

  askAI: async (query: string) => {
    // Set the query and trigger a new simulation
    set({ customEventQuery: query });

    // Automatically run simulation with the AI query
    await get().runSimulation();
  },

  addScenario: (scenario) =>
    set((state) => ({ scenarios: [...state.scenarios, scenario] })),

  setActiveScenario: (id) => set({ activeScenario: id }),
}));

// Initialize with news on first load
if (typeof window !== "undefined") {
  useSimulationStore.getState().fetchNews();
}

