// ═══════════════════════════════════════════════════════════════════════════
// BUDGET SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Core Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type BudgetPriority = 'aggressive' | 'balanced' | 'lifestyle';

export interface AutopilotConfig {
    userId: string;
    priority: BudgetPriority;
    autoAdjustEnabled: boolean;
    nonNegotiableCategories: string[];
    monthlyIncome: number;
    savingsTargetPercentage: number;
    activatedAt: string;
    updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget Categories & Tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryBudget {
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
    percentUsed: number;
    isFixed: boolean;
    status: 'healthy' | 'warning' | 'danger';
}

export interface BudgetSummary {
    month: string; // YYYY-MM format
    totalIncome: number;
    fixedCosts: number;
    savingsTarget: number;
    savingsActual: number;
    totalBudget: number;
    totalSpent: number;
    safeToSpend: number;
    daysRemaining: number;
    categoryBudgets: CategoryBudget[];
}

export interface MonthlySnapshot {
    id: string;
    userId: string;
    month: string;
    totalIncome: number;
    fixedCosts: number;
    savingsTarget: number;
    savingsActual: number;
    categoryBudgets: Record<string, number>;
    categoryActuals: Record<string, number>;
    createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Savings Goals
// ─────────────────────────────────────────────────────────────────────────────

export type GoalStatus = 'on_track' | 'behind' | 'ahead' | 'completed';

export interface SavingsGoal {
    id: string;
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
    category: string | null;
    linkedEventId: string | null;
    weeklyContribution: number | null;
    status: GoalStatus;
    createdAt: string;
    completedAt: string | null;
    // Computed fields
    daysRemaining?: number;
    percentComplete?: number;
    requiredWeekly?: number;
}

export interface CreateGoalInput {
    name: string;
    targetAmount: number;
    deadline?: string;
    category?: string;
    linkedEventId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────────────────────

export type EventSource = 'historical' | 'calendar' | 'news' | 'user';
export type EventConfidence = 'high' | 'medium' | 'low';

export interface HistoricalSpending {
    year: number;
    amount: number;
}

export interface DetectedEvent {
    id: string;
    userId: string;
    eventName: string;
    eventDate: string;
    category: string;
    estimatedCost: number;
    source: EventSource;
    confidence: EventConfidence;
    historicalData: HistoricalSpending[] | null;
    newsInsight: string | null;
    actionableAdvice: string;
    isDismissed: boolean;
    createdAt: string;
    // Computed fields
    daysAway?: number;
    urgency?: 'high' | 'medium' | 'low';
    linkedGoal?: SavingsGoal | null;
}

export interface CreateEventInput {
    eventName: string;
    eventDate: string;
    category: string;
    estimatedCost: number;
    source?: EventSource;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

export type AlertType = 'info' | 'warning' | 'breach';

export interface BudgetAlert {
    id: string;
    userId: string;
    transactionId: string | null;
    alertType: AlertType;
    category: string;
    message: string;
    suggestedActions: string[] | null;
    acknowledged: boolean;
    createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────────────────────────────────────

export type InsightType = 'optimization' | 'warning' | 'achievement' | 'pattern';

// ─────────────────────────────────────────────────────────────────────────────
// Decision Tracking / Reasoning
// ─────────────────────────────────────────────────────────────────────────────

export interface ReasoningDataPoint {
    label: string;
    value: string | number;
    unit?: string;
}

export interface ReasoningStep {
    phase: 'data' | 'analysis' | 'decision';
    title: string;
    detail: string;
    dataPoints?: ReasoningDataPoint[];
}

export interface InsightReasoning {
    steps: ReasoningStep[];
    confidence: number; // 0-1
    alternativeActions: string[];
    dataSourceDescription: string;
}

export interface BudgetInsight {
    id: string;
    userId: string;
    insightType: InsightType;
    title: string;
    description: string;
    impact: string | null;
    isActionable: boolean;
    actionType: string | null;
    actionPayload: Record<string, unknown> | null;
    dismissed: boolean;
    createdAt: string;
    reasoning?: InsightReasoning | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trend Data (for charts)
// ─────────────────────────────────────────────────────────────────────────────

export interface TrendDataPoint {
    month: string; // YYYY-MM
    value: number;
}

export interface CategoryTrend {
    category: string;
    dataPoints: TrendDataPoint[];
    slope: number; // monthly change in $
    rSquared: number;
    direction: 'increasing' | 'decreasing' | 'stable';
    projectedNextMonth: number;
}

export interface DayOfWeekData {
    day: string;
    average: number;
    total: number;
}

export interface TrendAnalytics {
    categoryTrends: CategoryTrend[];
    dayOfWeekData: DayOfWeekData[];
    topCategories: Array<{ category: string; total: number; percentOfBudget: number }>;
    monthOverMonthChange: number; // percentage
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget Simulation
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetSimulationResult {
    newTotalBudget: number;
    newSafeToSpend: number;
    newSavingsTarget: number;
    newSavingsActual: number;
    categoryStatuses: Array<{ category: string; oldStatus: string; newStatus: string }>;
    warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InitializeBudgetRequest {
    priority: BudgetPriority;
    autoAdjustEnabled: boolean;
    nonNegotiableCategories: string[];
}

export interface InitializeBudgetResponse {
    config: AutopilotConfig;
    initialBudget: BudgetSummary;
}

export interface AdjustBudgetRequest {
    category: string;
    newAmount: number;
    reason?: string;
}

export interface BudgetStatusResponse {
    isInitialized: boolean;
    config: AutopilotConfig | null;
    currentMonth: BudgetSummary | null;
    alerts: BudgetAlert[];
}

// ─────────────────────────────────────────────────────────────────────────────
// News Analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface NewsArticle {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
}

export interface AnalyzedNewsEvent {
    eventName: string;
    timeframe: string;
    affectedCategory: string;
    impactType: 'increase' | 'decrease';
    impactPercentage: number;
    reasoning: string;
    actionableAdvice: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Flow
// ─────────────────────────────────────────────────────────────────────────────

export interface SetupStepData {
    priority?: BudgetPriority;
    autoAdjustEnabled?: boolean;
    nonNegotiableCategories?: string[];
}

export type SetupStep = 'welcome' | 'priority' | 'auto-adjust' | 'non-negotiables' | 'processing' | 'complete';
