import { create } from "zustand";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  price: number;
  change: number;
  changePercent: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
}

export interface Insight {
  id: string;
  type: "trend" | "subscription" | "spike" | "opportunity";
  title: string;
  description: string;
  change?: number;
  nodeIds?: string[];
  severity?: "info" | "warning" | "alert";
}

interface UserState {
  // Portfolio
  portfolioValue: number;
  portfolioChange: number;
  holdings: Holding[];
  
  // Transactions
  transactions: Transaction[];
  
  // Insights
  insights: Insight[];
  
  // Stats
  netCashflow: number;
  netCashflowChange: number;
  totalSubscriptions: number;
  subscriptionCount: number;
  
  // Actions
  setPortfolio: (value: number, change: number) => void;
  addHolding: (holding: Holding) => void;
  addTransaction: (transaction: Transaction) => void;
  addInsight: (insight: Insight) => void;
  loadSampleData: () => void;
}

const sampleHoldings: Holding[] = [
  { id: "1", symbol: "AAPL", name: "Apple Inc.", shares: 50, price: 178.50, change: 2.15, changePercent: 1.22 },
  { id: "2", symbol: "GOOGL", name: "Alphabet Inc.", shares: 25, price: 141.80, change: -0.72, changePercent: -0.51 },
  { id: "3", symbol: "MSFT", name: "Microsoft Corp.", shares: 30, price: 378.90, change: 4.20, changePercent: 1.12 },
  { id: "4", symbol: "NVDA", name: "NVIDIA Corp.", shares: 15, price: 721.30, change: 15.40, changePercent: 2.18 },
  { id: "5", symbol: "AMZN", name: "Amazon.com Inc.", shares: 20, price: 178.25, change: 1.30, changePercent: 0.73 },
];

const sampleTransactions: Transaction[] = [
  { id: "1", date: "2024-02-05", description: "Salary Deposit", amount: 5200, category: "Income", type: "income" },
  { id: "2", date: "2024-02-03", description: "Rent Payment", amount: 2100, category: "Housing", type: "expense" },
  { id: "3", date: "2024-02-02", description: "Whole Foods", amount: 127.50, category: "Groceries", type: "expense" },
  { id: "4", date: "2024-02-01", description: "Netflix", amount: 15.99, category: "Subscriptions", type: "expense" },
  { id: "5", date: "2024-01-31", description: "Uber Eats", amount: 45.00, category: "Dining", type: "expense" },
];

const sampleInsights: Insight[] = [
  { 
    id: "1", 
    type: "trend", 
    title: "Groceries +18% MoM", 
    description: "Your grocery spending increased significantly compared to last month.",
    change: 18,
    nodeIds: ["groceries"],
    severity: "warning"
  },
  { 
    id: "2", 
    type: "subscription", 
    title: "New subscription detected", 
    description: "We found a recurring $9.99/mo charge from Spotify.",
    nodeIds: ["subscriptions"],
    severity: "info"
  },
  { 
    id: "3", 
    type: "spike", 
    title: "Unusual spike Jan 18", 
    description: "Large dining expense of $245 detected on January 18th.",
    nodeIds: ["dining"],
    severity: "alert"
  },
  { 
    id: "4", 
    type: "opportunity", 
    title: "Savings goal on track", 
    description: "At current rate, you'll reach your $15k goal by August.",
    nodeIds: ["savings"],
    severity: "info"
  },
];

export const useUserStore = create<UserState>((set) => ({
  // Start with zeros - data loads after Plaid connection
  portfolioValue: 0,
  portfolioChange: 0,
  holdings: [], // Empty until connected
  transactions: [], // Empty until connected
  insights: [], // Empty until connected
  netCashflow: 0,
  netCashflowChange: 0,
  totalSubscriptions: 0,
  subscriptionCount: 0,

  setPortfolio: (value, change) =>
    set({ portfolioValue: value, portfolioChange: change }),

  addHolding: (holding) =>
    set((state) => ({ holdings: [...state.holdings, holding] })),

  addTransaction: (transaction) =>
    set((state) => ({ transactions: [...state.transactions, transaction] })),

  addInsight: (insight) =>
    set((state) => ({ insights: [...state.insights, insight] })),

  // Load sample data only when explicitly called (for demo purposes)
  loadSampleData: () =>
    set({
      holdings: sampleHoldings,
      transactions: sampleTransactions,
      insights: sampleInsights,
    }),
}));
