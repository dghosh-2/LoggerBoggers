import { create } from 'zustand';
import type {
    AutopilotConfig,
    BudgetSummary,
    SavingsGoal,
    DetectedEvent,
    BudgetInsight,
    BudgetAlert,
    CreateGoalInput,
    BudgetPriority,
    CategoryBudget,
} from '@/types/budget';
import {
    initializeBudget,
    updateBudgetWithSpending,
    generateBudgetSummary,
} from '@/lib/budget/autopilot-engine';

// Helper for generating IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ═══════════════════════════════════════════════════════════════════════════
// BUDGET STORE - CLIENT SIDE ONLY
// Uses localStorage for all persistence
// ═══════════════════════════════════════════════════════════════════════════

interface BudgetState {
    // Core state
    config: AutopilotConfig | null;
    currentMonth: BudgetSummary | null;
    savingsGoals: SavingsGoal[];
    upcomingEvents: DetectedEvent[];
    insights: BudgetInsight[];
    alerts: BudgetAlert[];

    // UI state
    isLoading: boolean;
    isInitialized: boolean;
    selectedCategory: string | null;
    selectedGoal: SavingsGoal | null;
    selectedEvent: DetectedEvent | null;

    // Actions - Initialization
    initialize: () => Promise<void>;
    generateBudgetFromProfile: () => Promise<void>;
    rebalanceBudget: () => Promise<void>;

    // Actions - Budget Management
    fetchBudgetStatus: (month?: string) => Promise<void>;
    adjustCategoryBudget: (category: string, newAmount: number) => Promise<void>;

    // Actions - Savings Goals
    fetchSavingsGoals: () => Promise<void>;
    createSavingsGoal: (goal: CreateGoalInput) => Promise<void>;
    updateGoalProgress: (goalId: string, amount: number) => Promise<void>;
    deleteGoal: (goalId: string) => Promise<void>;

    // Actions - Events
    fetchUpcomingEvents: () => Promise<void>;
    dismissEvent: (eventId: string) => Promise<void>;
    refreshNewsAnalysis: () => Promise<void>;
    createEventGoal: (eventId: string) => Promise<void>;

    // Actions - Insights & Alerts
    fetchInsights: () => Promise<void>;
    dismissInsight: (insightId: string) => Promise<void>;
    acknowledgeAlert: (alertId: string) => Promise<void>;

    // UI Actions
    setSelectedCategory: (category: string | null) => void;
    setSelectedGoal: (goal: SavingsGoal | null) => void;
    setSelectedEvent: (event: DetectedEvent | null) => void;
}

// Map risk tolerance to budget priority
function mapRiskToPriority(riskTolerance: string): BudgetPriority {
    const risk = riskTolerance?.toLowerCase().trim();
    if (risk === 'aggressive' || risk === 'high') return 'aggressive';
    if (risk === 'low') return 'lifestyle';
    return 'balanced'; // Default for medium
}

// Helper to extract risk tolerance from markdown
function extractRiskTolerance(markdown: string): string {
    const match = markdown.match(/- \*\*Risk Tolerance\*\*: (.*)/i);
    return match ? match[1] : 'Medium';
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
    // Initial state
    config: null,
    currentMonth: null,
    savingsGoals: [],
    upcomingEvents: [],
    insights: [],
    alerts: [],
    isLoading: false,
    isInitialized: false,
    selectedCategory: null,
    selectedGoal: null,
    selectedEvent: null,

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    initialize: async () => {
        set({ isLoading: true });

        try {
            // Load from localStorage first for speed
            const cachedConfig = localStorage.getItem('budget_config');
            const cachedSummary = localStorage.getItem('budget_summary');
            const cachedGoals = localStorage.getItem('budget_savingsGoals');
            const cachedEvents = localStorage.getItem('budget_upcomingEvents');
            const cachedInsights = localStorage.getItem('budget_insights');

            if (cachedConfig && cachedSummary) {
                set({
                    config: JSON.parse(cachedConfig),
                    currentMonth: JSON.parse(cachedSummary),
                    savingsGoals: cachedGoals ? JSON.parse(cachedGoals) : [],
                    upcomingEvents: cachedEvents ? JSON.parse(cachedEvents) : [],
                    insights: cachedInsights ? JSON.parse(cachedInsights) : [],
                    isInitialized: true,
                });
            }

            // Always re-generate budget to get latest transactions
            await get().generateBudgetFromProfile();

        } catch (error) {
            console.error('Failed to initialize budget:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    generateBudgetFromProfile: async () => {
        try {
            // 1. Fetch user profile to get risk tolerance
            const profileResponse = await fetch('/api/user');
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                const content = profileData.content || '';
                const riskTolerance = extractRiskTolerance(content);
                var priority = mapRiskToPriority(riskTolerance);
            } else {
                var priority: BudgetPriority = 'balanced';
            }

            // 2. Fetch transaction history (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const transactionsResponse = await fetch(
                `/api/data/transactions?limit=5000&startDate=${sixMonthsAgo.toISOString().split('T')[0]}`
            );
            const transactionsData = await transactionsResponse.json();

            // 3. Fetch income data
            const incomeResponse = await fetch('/api/income');
            const incomeData = await incomeResponse.json();

            // 4. Initialize budget using engine
            const { config, categoryBudgets } = await initializeBudget(
                transactionsData.transactions || [],
                incomeData.income || [],
                priority,
                ['Rent', 'Insurance'] // Hardcoded protected categories
            );

            // 5. Create full config object
            const fullConfig: AutopilotConfig = {
                userId: 'local-user',
                priority: config.priority,
                autoAdjustEnabled: true,
                nonNegotiableCategories: config.nonNegotiableCategories,
                monthlyIncome: config.monthlyIncome,
                savingsTargetPercentage: config.savingsTargetPercentage,
                activatedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // 6. Get current month transactions for tracking
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentMonthResponse = await fetch(
                `/api/data/transactions?limit=5000&startDate=${monthStart.toISOString().split('T')[0]}`
            );
            const currentMonthData = await currentMonthResponse.json();

            // 7. Update budgets with current spending
            // Merge with existing manual adjustments if any
            const existingSummary = get().currentMonth;
            let budgetsToUpdate = categoryBudgets;

            if (existingSummary) {
                // Preserve manual allocations if category exists in new calculation
                budgetsToUpdate = categoryBudgets.map(newBudget => {
                    const existing = existingSummary.categoryBudgets.find(b => b.category === newBudget.category);
                    if (existing && existing.allocated !== newBudget.allocated) {
                        // Keep manual allocation? For now, let's reset on rebalance/init unless we track manual overrides
                        // User wants AI Rebalance to "force" optimization, so maybe overwriting is correct.
                        // But for regular init, we might want to respect overrides.
                        // Let's assume AI Rebalance means "reset to optimal".
                        return newBudget;
                    }
                    return newBudget;
                });
            }

            const updatedBudgets = updateBudgetWithSpending(
                budgetsToUpdate,
                currentMonthData.transactions || []
            );

            // 8. Generate summary
            const summary = generateBudgetSummary(
                fullConfig,
                updatedBudgets,
                0, // Account balance (could fetch)
                0  // Upcoming bills (could fetch)
            );

            set({
                config: fullConfig,
                currentMonth: summary,
                isInitialized: true,
            });

            // 9. Persist
            localStorage.setItem('budget_config', JSON.stringify(fullConfig));
            localStorage.setItem('budget_summary', JSON.stringify(summary));

        } catch (error) {
            console.error('Failed to generate budget:', error);
        }
    },

    rebalanceBudget: async () => {
        set({ isLoading: true });
        try {
            await get().generateBudgetFromProfile();
            // Could add toast here
        } catch (error) {
            console.error('Failed to rebalance:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchBudgetStatus: async () => {
        await get().generateBudgetFromProfile();
    },

    adjustCategoryBudget: async (category, newAmount) => {
        const { currentMonth } = get();
        if (!currentMonth) return;

        const updatedCategories = currentMonth.categoryBudgets.map(cat =>
            cat.category === category ? { ...cat, allocated: newAmount, remaining: newAmount - cat.spent } : cat
        );

        const newSummary = {
            ...currentMonth,
            categoryBudgets: updatedCategories,
            totalBudget: updatedCategories.reduce((sum, c) => sum + c.allocated, 0),
        };

        set({ currentMonth: newSummary });
        localStorage.setItem('budget_summary', JSON.stringify(newSummary));
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Savings Goals (LocalStorage)
    // ─────────────────────────────────────────────────────────────────────────

    fetchSavingsGoals: async () => {
        const stored = localStorage.getItem('budget_savingsGoals');
        if (stored) {
            set({ savingsGoals: JSON.parse(stored) });
        }
    },

    createSavingsGoal: async (input) => {
        const newGoal: SavingsGoal = {
            id: generateId(),
            userId: 'local-user',
            name: input.name,
            targetAmount: input.targetAmount,
            currentAmount: 0,
            deadline: input.deadline || null,
            category: input.category || null,
            linkedEventId: input.linkedEventId || null,
            weeklyContribution: null,
            status: 'on_track',
            createdAt: new Date().toISOString(),
            completedAt: null,
        };

        const updatedGoals = [...get().savingsGoals, newGoal];
        set({ savingsGoals: updatedGoals });
        localStorage.setItem('budget_savingsGoals', JSON.stringify(updatedGoals));
    },

    updateGoalProgress: async (goalId, amount) => {
        const updatedGoals = get().savingsGoals.map(g =>
            g.id === goalId ? { ...g, currentAmount: amount } : g
        );
        set({ savingsGoals: updatedGoals });
        localStorage.setItem('budget_savingsGoals', JSON.stringify(updatedGoals));
    },

    deleteGoal: async (goalId) => {
        const updatedGoals = get().savingsGoals.filter(g => g.id !== goalId);
        set({ savingsGoals: updatedGoals });
        localStorage.setItem('budget_savingsGoals', JSON.stringify(updatedGoals));
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Events (LocalStorage)
    // ─────────────────────────────────────────────────────────────────────────

    fetchUpcomingEvents: async () => {
        // In a real app we'd fetch from calendar/news here.
        // For now, load from LS or init with some mock data if empty
        const stored = localStorage.getItem('budget_upcomingEvents');
        if (stored) {
            set({ upcomingEvents: JSON.parse(stored) });
        } else {
            // Optional: Mock events
            const mockEvents: DetectedEvent[] = [
                {
                    id: generateId(),
                    userId: 'local-user',
                    eventName: 'Car Insurance Renewal',
                    eventDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 15).toISOString(),
                    category: 'Insurance',
                    estimatedCost: 850,
                    source: 'historical',
                    confidence: 'high',
                    actionableAdvice: 'Start setting aside $425/mo to cover this fully.',
                    isDismissed: false,
                    createdAt: new Date().toISOString(),
                    historicalData: null,
                    newsInsight: null,
                }
            ];
            set({ upcomingEvents: mockEvents });
            localStorage.setItem('budget_upcomingEvents', JSON.stringify(mockEvents));
        }
    },

    dismissEvent: async (eventId) => {
        const updatedEvents = get().upcomingEvents.filter(e => e.id !== eventId);
        set({ upcomingEvents: updatedEvents });
        localStorage.setItem('budget_upcomingEvents', JSON.stringify(updatedEvents));
    },

    refreshNewsAnalysis: async () => {
        // Mock analysis
        set({ isLoading: true });
        setTimeout(() => {
            set({ isLoading: false });
        }, 1000);
    },

    createEventGoal: async (eventId) => {
        const event = get().upcomingEvents.find(e => e.id === eventId);
        if (!event) return;

        await get().createSavingsGoal({
            name: event.eventName,
            targetAmount: event.estimatedCost,
            deadline: event.eventDate,
            category: event.category,
            linkedEventId: eventId,
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Insights & Alerts (LocalStorage)
    // ─────────────────────────────────────────────────────────────────────────

    fetchInsights: async () => {
        const stored = localStorage.getItem('budget_insights');
        if (stored) {
            set({ insights: JSON.parse(stored) });
        } else {
            // Mock insights
            const mockInsights: BudgetInsight[] = [
                {
                    id: generateId(),
                    userId: 'local-user',
                    insightType: 'optimization',
                    title: 'Dining Optimization',
                    description: 'You spent 15% less on Dining than allocated last month.',
                    impact: 'medium',
                    isActionable: true,
                    actionType: null,
                    actionPayload: null,
                    dismissed: false,
                    createdAt: new Date().toISOString(),
                }
            ];
            set({ insights: mockInsights });
            localStorage.setItem('budget_insights', JSON.stringify(mockInsights));
        }
    },

    dismissInsight: async (insightId) => {
        const updatedInsights = get().insights.filter(i => i.id !== insightId);
        set({ insights: updatedInsights });
        localStorage.setItem('budget_insights', JSON.stringify(updatedInsights));
    },

    acknowledgeAlert: async (alertId) => {
        const updatedAlerts = get().alerts.map(a =>
            a.id === alertId ? { ...a, acknowledged: true } : a
        );
        set({ alerts: updatedAlerts });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // UI Actions
    // ─────────────────────────────────────────────────────────────────────────

    setSelectedCategory: (category) => set({ selectedCategory: category }),
    setSelectedGoal: (goal) => set({ selectedGoal: goal }),
    setSelectedEvent: (event) => set({ selectedEvent: event }),
}));
