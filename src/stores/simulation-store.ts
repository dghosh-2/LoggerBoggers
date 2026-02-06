import { create } from "zustand";

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

export interface SimulationResult {
  months: number[];
  cashBalance: number[];
  savingsTrajectory: number[];
  goalProgress: number;
  riskOfNegative: number;
}

interface SimulationState {
  // Sliders
  incomeChange: number;
  expenseChange: number;
  savingsRate: number;
  
  // Scenarios
  scenarios: SimulationScenario[];
  activeScenario: string | null;
  
  // Results
  results: SimulationResult | null;
  isSimulating: boolean;
  
  // Actions
  setIncomeChange: (value: number) => void;
  setExpenseChange: (value: number) => void;
  setSavingsRate: (value: number) => void;
  resetSimulation: () => void;
  toggleSimulation: () => void;
  runSimulation: () => void;
  addScenario: (scenario: SimulationScenario) => void;
  setActiveScenario: (id: string | null) => void;
}

// Simple simulation function
function simulateCashflow(
  baseIncome: number,
  baseExpenses: number,
  incomeChange: number,
  expenseChange: number,
  savingsRate: number
): SimulationResult {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const adjustedIncome = baseIncome * (1 + incomeChange / 100);
  const adjustedExpenses = baseExpenses * (1 + expenseChange / 100);
  const targetSavings = adjustedIncome * (savingsRate / 100);
  
  let balance = 5000; // Starting balance
  let savings = 10000; // Starting savings
  
  const cashBalance: number[] = [];
  const savingsTrajectory: number[] = [];
  
  for (let i = 0; i < 12; i++) {
    const monthlyNet = adjustedIncome - adjustedExpenses;
    const actualSavings = Math.min(targetSavings, Math.max(0, monthlyNet));
    
    balance += monthlyNet - actualSavings;
    savings += actualSavings;
    
    cashBalance.push(Math.round(balance));
    savingsTrajectory.push(Math.round(savings));
  }
  
  const goalProgress = Math.min(100, (savings / 50000) * 100);
  const riskOfNegative = cashBalance.some(b => b < 0) ? 
    (cashBalance.filter(b => b < 0).length / 12) * 100 : 0;
  
  return {
    months,
    cashBalance,
    savingsTrajectory,
    goalProgress: Math.round(goalProgress),
    riskOfNegative: Math.round(riskOfNegative),
  };
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  incomeChange: 0,
  expenseChange: 0,
  savingsRate: 25,
  scenarios: [],
  activeScenario: null,
  results: null,
  isSimulating: false,

  setIncomeChange: (value) => {
    set({ incomeChange: value });
    get().runSimulation();
  },

  setExpenseChange: (value) => {
    set({ expenseChange: value });
    get().runSimulation();
  },

  setSavingsRate: (value) => {
    set({ savingsRate: value });
    get().runSimulation();
  },

  resetSimulation: () => {
    set({
      incomeChange: 0,
      expenseChange: 0,
      savingsRate: 25,
      isSimulating: false,
    });
    get().runSimulation();
  },

  toggleSimulation: () => {
    set((state) => ({ isSimulating: !state.isSimulating }));
  },

  runSimulation: () => {
    const { incomeChange, expenseChange, savingsRate } = get();
    
    const results = simulateCashflow(
      9500,  // base income
      6400,  // base expenses
      incomeChange,
      expenseChange,
      savingsRate
    );
    
    set({ results });
  },

  addScenario: (scenario) =>
    set((state) => ({ scenarios: [...state.scenarios, scenario] })),

  setActiveScenario: (id) => set({ activeScenario: id }),
}));

// Initialize with default simulation
if (typeof window !== "undefined") {
  useSimulationStore.getState().runSimulation();
}
