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
    TrendAnalytics,
    BudgetSimulationResult,
} from '@/types/budget';
import {
    initializeBudget,
    updateBudgetWithSpending,
    generateBudgetSummary,
    recalculateBudgetMetrics,
    simulateBudgetChanges,
} from '@/lib/budget/autopilot-engine';
import { generateAllInsights, generateTrendAnalytics } from '@/lib/budget/trend-analyzer';

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

    // Analytics state
    trendAnalytics: TrendAnalytics | null;
    cachedTransactions: Array<{ amount: number; category: string; date: string; name: string }>;

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
    applyInsightRecommendation: (insightId: string) => Promise<void>;

    // Actions - Trend Analytics
    generateTrends: () => void;
    simulateChanges: (changes: Record<string, number>) => BudgetSimulationResult | null;

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
    trendAnalytics: null,
    cachedTransactions: [],
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
            const cachedTrends = localStorage.getItem('budget_trendAnalytics');

            if (cachedConfig && cachedSummary) {
                set({
                    config: JSON.parse(cachedConfig),
                    currentMonth: JSON.parse(cachedSummary),
                    savingsGoals: cachedGoals ? JSON.parse(cachedGoals) : [],
                    upcomingEvents: cachedEvents ? JSON.parse(cachedEvents) : [],
                    insights: cachedInsights ? JSON.parse(cachedInsights) : [],
                    trendAnalytics: cachedTrends ? JSON.parse(cachedTrends) : null,
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
            let priority: BudgetPriority = 'balanced';
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                const content = profileData.content || '';
                const riskTolerance = extractRiskTolerance(content);
                priority = mapRiskToPriority(riskTolerance);
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
            const updatedBudgets = updateBudgetWithSpending(
                categoryBudgets,
                currentMonthData.transactions || []
            );

            // 8. Generate summary using recalculation engine
            const summary = recalculateBudgetMetrics(fullConfig, updatedBudgets, 0, 0);

            // 9. Cache transactions for trend analysis
            const allTransactions = transactionsData.transactions || [];

            set({
                config: fullConfig,
                currentMonth: summary,
                cachedTransactions: allTransactions,
                isInitialized: true,
            });

            // 10. Persist
            localStorage.setItem('budget_config', JSON.stringify(fullConfig));
            localStorage.setItem('budget_summary', JSON.stringify(summary));

            // 11. Generate insights and trends in background
            const state = get();
            if (allTransactions.length > 0) {
                // Generate trend analytics
                const trends = generateTrendAnalytics(allTransactions, summary.categoryBudgets);
                set({ trendAnalytics: trends });
                localStorage.setItem('budget_trendAnalytics', JSON.stringify(trends));

                // Generate insights
                const insights = generateAllInsights(
                    allTransactions,
                    summary,
                    fullConfig,
                    state.savingsGoals,
                    state.upcomingEvents
                );
                set({ insights });
                localStorage.setItem('budget_insights', JSON.stringify(insights));
            }

        } catch (error) {
            console.error('Failed to generate budget:', error);
        }
    },

    rebalanceBudget: async () => {
        set({ isLoading: true });
        try {
            await get().generateBudgetFromProfile();
        } catch (error) {
            console.error('Failed to rebalance:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchBudgetStatus: async () => {
        await get().generateBudgetFromProfile();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Budget Adjustment — Full Metric Recalculation
    // ─────────────────────────────────────────────────────────────────────────

    adjustCategoryBudget: async (category, newAmount) => {
        const { currentMonth, config } = get();
        if (!currentMonth || !config) return;

        // Update the specific category
        const updatedCategories = currentMonth.categoryBudgets.map(cat =>
            cat.category === category
                ? { ...cat, allocated: newAmount, remaining: newAmount - cat.spent }
                : cat
        );

        // Full recalculation of all metrics
        const newSummary = recalculateBudgetMetrics(config, updatedCategories, 0, 0);

        set({ currentMonth: newSummary });
        localStorage.setItem('budget_summary', JSON.stringify(newSummary));

        // Regenerate insights since budget changed
        const { cachedTransactions, savingsGoals, upcomingEvents } = get();
        if (cachedTransactions.length > 0) {
            const insights = generateAllInsights(
                cachedTransactions,
                newSummary,
                config,
                savingsGoals,
                upcomingEvents
            );
            set({ insights });
            localStorage.setItem('budget_insights', JSON.stringify(insights));
        }
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
        const stored = localStorage.getItem('budget_upcomingEvents');
        if (stored) {
            set({ upcomingEvents: JSON.parse(stored) });
        } else {
            // Mock events
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
    // Insights & Alerts
    // ─────────────────────────────────────────────────────────────────────────

    fetchInsights: async () => {
        const { currentMonth, config, cachedTransactions, savingsGoals, upcomingEvents } = get();

        // If we have transactions and budget data, generate real insights
        if (cachedTransactions.length > 0 && currentMonth && config) {
            const insights = generateAllInsights(
                cachedTransactions,
                currentMonth,
                config,
                savingsGoals,
                upcomingEvents
            );
            set({ insights });
            localStorage.setItem('budget_insights', JSON.stringify(insights));
            return;
        }

        // Fall back to stored insights
        const stored = localStorage.getItem('budget_insights');
        if (stored) {
            set({ insights: JSON.parse(stored) });
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

    applyInsightRecommendation: async (insightId) => {
        const { insights, currentMonth, config } = get();
        const insight = insights.find(i => i.id === insightId);
        if (!insight || !insight.actionPayload || !currentMonth || !config) return;

        try {
            switch (insight.actionType) {
                case 'reallocate': {
                    const { fromCategory, amount } = insight.actionPayload as {
                        fromCategory: string;
                        amount: number;
                    };
                    const catBudget = currentMonth.categoryBudgets.find(c => c.category === fromCategory);
                    if (catBudget) {
                        await get().adjustCategoryBudget(fromCategory, catBudget.allocated - (amount as number));
                    }
                    break;
                }

                case 'reduce_category': {
                    const { category, reductionAmount } = insight.actionPayload as {
                        category: string;
                        reductionAmount: number;
                    };
                    const catBudget = currentMonth.categoryBudgets.find(c => c.category === category);
                    if (catBudget) {
                        await get().adjustCategoryBudget(category, catBudget.allocated - (reductionAmount as number));
                    }
                    break;
                }

                case 'address_trend': {
                    const { category, suggestedCap } = insight.actionPayload as {
                        category: string;
                        suggestedCap: number;
                    };
                    await get().adjustCategoryBudget(category, suggestedCap);
                    break;
                }

                case 'prepare_for_event': {
                    const { fromCategory, shortage } = insight.actionPayload as {
                        fromCategory: string | null;
                        shortage: number;
                    };
                    if (fromCategory) {
                        const srcBudget = currentMonth.categoryBudgets.find(c => c.category === fromCategory);
                        if (srcBudget) {
                            await get().adjustCategoryBudget(fromCategory, srcBudget.allocated - shortage);
                        }
                    }
                    break;
                }

                case 'create_event_goal': {
                    const { goalName, targetAmount, deadline, weeklyContribution } = insight.actionPayload as {
                        goalName: string;
                        targetAmount: number;
                        deadline: string;
                        weeklyContribution: number;
                        eventId: string;
                    };
                    await get().createSavingsGoal({
                        name: goalName,
                        targetAmount,
                        deadline,
                    });
                    break;
                }

                case 'boost_goal': {
                    const { reallocationOptions } = insight.actionPayload as {
                        goalId: string;
                        requiredWeeklyIncrease: number;
                        reallocationOptions: Array<{ category: string; available: number }>;
                    };
                    // Pull from first available category
                    if (reallocationOptions && reallocationOptions.length > 0) {
                        const src = reallocationOptions[0];
                        const catBudget = currentMonth.categoryBudgets.find(c => c.category === src.category);
                        if (catBudget) {
                            const reduction = Math.min(src.available, catBudget.allocated * 0.3);
                            await get().adjustCategoryBudget(src.category, catBudget.allocated - reduction);
                        }
                    }
                    break;
                }

                default:
                    console.log('Unhandled insight action:', insight.actionType, insight.actionPayload);
            }

            // Dismiss the applied insight
            get().dismissInsight(insightId);
        } catch (error) {
            console.error('Failed to apply insight:', error);
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Trend Analytics
    // ─────────────────────────────────────────────────────────────────────────

    generateTrends: () => {
        const { cachedTransactions, currentMonth } = get();
        if (cachedTransactions.length === 0 || !currentMonth) return;

        const trends = generateTrendAnalytics(cachedTransactions, currentMonth.categoryBudgets);
        set({ trendAnalytics: trends });
        localStorage.setItem('budget_trendAnalytics', JSON.stringify(trends));
    },

    simulateChanges: (changes) => {
        const { currentMonth, config } = get();
        if (!currentMonth || !config) return null;

        return simulateBudgetChanges(currentMonth, config, changes, 0, 0);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // UI Actions
    // ─────────────────────────────────────────────────────────────────────────

    setSelectedCategory: (category) => set({ selectedCategory: category }),
    setSelectedGoal: (goal) => set({ selectedGoal: goal }),
    setSelectedEvent: (event) => set({ selectedEvent: event }),
}));
