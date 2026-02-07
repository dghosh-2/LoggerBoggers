import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE VISUALIZATION SCHEMA
// Handles wide variety of stock research requests with flexible layouts
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// CHART CONFIGURATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Individual line/series on a chart */
export const ChartSeriesSchema = z.object({
    symbol: z.string().describe('Stock ticker symbol'),
    color: z.string().optional().describe('Line color (hex or CSS color)'),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
    lineWidth: z.number().min(1).max(5).default(2),
    showDataPoints: z.boolean().default(false),
    label: z.string().optional().describe('Custom label for legend'),
});

/** Chart type options */
export const ChartTypeSchema = z.enum([
    'line',           // Standard line chart
    'area',           // Filled area chart
    'candlestick',    // OHLC candlestick
    'bar',            // Bar chart
    'comparison',     // Normalized comparison (percentage change)
    'returns',        // Daily/period returns
]);

/** Single chart configuration */
export const ChartConfigSchema = z.object({
    id: z.string().describe('Unique chart identifier'),
    title: z.string().describe('Chart title'),
    subtitle: z.string().optional().describe('Chart subtitle'),
    chartType: ChartTypeSchema.default('line'),
    series: z.array(ChartSeriesSchema).min(1).describe('Lines/series to display'),
    
    // Axis configuration
    xAxis: z.object({
        label: z.string().default('Date'),
        showGrid: z.boolean().default(true),
    }).default({ label: 'Date', showGrid: true }),
    yAxis: z.object({
        label: z.string().default('Price ($)'),
        showGrid: z.boolean().default(true),
        format: z.enum(['currency', 'percent', 'number']).default('currency'),
        scale: z.enum(['linear', 'log']).default('linear'),
    }).default({ label: 'Price ($)', showGrid: true, format: 'currency', scale: 'linear' }),
    
    // Display options
    showLegend: z.boolean().default(true),
    showTooltip: z.boolean().default(true),
    height: z.enum(['sm', 'md', 'lg', 'xl']).default('md'),
    annotations: z.array(z.object({
        date: z.string(),
        label: z.string(),
        type: z.enum(['peak', 'trough', 'event', 'milestone']),
    })).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// RISK VISUALIZATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Risk gauge visualization */
export const RiskGaugeSchema = z.object({
    type: z.literal('gauge'),
    metric: z.enum(['volatility', 'beta', 'sharpe', 'maxDrawdown', 'var95']),
    symbol: z.string(),
    value: z.number(),
    min: z.number().default(0),
    max: z.number().default(100),
    thresholds: z.object({
        low: z.number(),
        medium: z.number(),
        high: z.number(),
    }).optional(),
    label: z.string(),
    description: z.string().optional(),
});

/** Risk comparison bar chart */
export const RiskComparisonSchema = z.object({
    type: z.literal('comparison_bar'),
    metric: z.enum(['volatility', 'beta', 'sharpe', 'maxDrawdown', 'var95']),
    data: z.array(z.object({
        symbol: z.string(),
        value: z.number(),
        label: z.string().optional(),
    })),
    title: z.string(),
    showBenchmark: z.boolean().default(false),
    benchmarkValue: z.number().optional(),
});

/** Risk distribution/histogram */
export const RiskDistributionSchema = z.object({
    type: z.literal('distribution'),
    symbol: z.string(),
    data: z.array(z.object({
        bucket: z.string(),
        frequency: z.number(),
    })),
    title: z.string(),
    showNormalCurve: z.boolean().default(false),
});

/** Risk heatmap for correlations */
export const RiskHeatmapSchema = z.object({
    type: z.literal('heatmap'),
    symbols: z.array(z.string()),
    correlations: z.array(z.array(z.number())),
    title: z.string().default('Correlation Matrix'),
});

/** Risk meter (simple visual indicator) */
export const RiskMeterSchema = z.object({
    type: z.literal('meter'),
    symbol: z.string(),
    riskLevel: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
    score: z.number().min(0).max(100),
    factors: z.array(z.object({
        name: z.string(),
        impact: z.enum(['positive', 'negative', 'neutral']),
        value: z.string(),
    })).optional(),
});

/** Union of all risk visualization types */
export const RiskVisualizationSchema = z.discriminatedUnion('type', [
    RiskGaugeSchema,
    RiskComparisonSchema,
    RiskDistributionSchema,
    RiskHeatmapSchema,
    RiskMeterSchema,
]);

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS & METRICS SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Key statistics card */
export const StatCardSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
    change: z.number().optional(),
    changeLabel: z.string().optional(),
    icon: z.enum(['trending_up', 'trending_down', 'dollar', 'percent', 'chart', 'warning', 'info']).optional(),
    color: z.enum(['default', 'success', 'warning', 'danger', 'info']).default('default'),
});

/** Statistics grid configuration */
export const StatsGridSchema = z.object({
    title: z.string().optional(),
    columns: z.number().min(1).max(6).default(4),
    stats: z.array(StatCardSchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// TABLE & DATA DISPLAY SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Data table configuration */
export const DataTableSchema = z.object({
    id: z.string(),
    title: z.string(),
    columns: z.array(z.object({
        key: z.string(),
        label: z.string(),
        format: z.enum(['text', 'currency', 'percent', 'number', 'date']).default('text'),
        sortable: z.boolean().default(true),
    })),
    rows: z.array(z.record(z.string(), z.any())),
    showPagination: z.boolean().default(false),
    pageSize: z.number().default(10),
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT & COMPOSITION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** Layout types for organizing multiple visualizations */
export const LayoutTypeSchema = z.enum([
    'single',           // Single full-width visualization
    'split',            // Two side-by-side
    'grid',             // Grid layout (2x2, 3x3, etc.)
    'stacked',          // Vertically stacked
    'dashboard',        // Mixed layout with sidebar
    'comparison',       // Side-by-side comparison layout
]);

/** Individual panel in a layout */
export const LayoutPanelSchema = z.object({
    id: z.string(),
    type: z.enum(['chart', 'risk', 'stats', 'table', 'recommendations', 'summary']),
    span: z.number().min(1).max(12).default(6).describe('Grid column span (out of 12)'),
    content: z.any().describe('Content configuration based on type'),
});

/** Complete layout configuration */
export const LayoutConfigSchema = z.object({
    type: LayoutTypeSchema,
    columns: z.number().min(1).max(4).default(2),
    gap: z.enum(['sm', 'md', 'lg']).default('md'),
    panels: z.array(LayoutPanelSchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI INSIGHTS & RECOMMENDATIONS SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** AI-generated insight */
export const InsightSchema = z.object({
    id: z.string(),
    type: z.enum(['bullish', 'bearish', 'neutral', 'warning', 'opportunity', 'info']),
    title: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    relatedSymbols: z.array(z.string()).optional(),
    actionable: z.boolean().default(false),
    action: z.string().optional(),
});

/** Recommendations panel configuration */
export const RecommendationsPanelSchema = z.object({
    summary: z.string(),
    insights: z.array(InsightSchema),
    riskWarnings: z.array(z.string()).optional(),
    disclaimer: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// USER QUESTIONS & AI SIDEBAR SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/** User question extracted from query */
export const UserQuestionSchema = z.object({
    question: z.string().describe('The question the user is asking'),
    category: z.enum(['risk', 'performance', 'comparison', 'prediction', 'general', 'technical']),
});

/** AI response to a user question */
export const AIResponseSchema = z.object({
    question: z.string(),
    answer: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    sources: z.array(z.string()).optional(),
});

/** AI Sidebar content configuration */
export const AISidebarContentSchema = z.object({
    summary: z.string().describe('Brief summary of the analysis'),
    userQuestions: z.array(UserQuestionSchema).optional(),
    aiResponses: z.array(AIResponseSchema).optional(),
    keyInsights: z.array(z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(['positive', 'negative', 'neutral', 'warning']),
    })).optional(),
    riskSummary: z.object({
        overallRisk: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
        explanation: z.string(),
        factors: z.array(z.object({
            name: z.string(),
            impact: z.enum(['positive', 'negative', 'neutral']),
            value: z.string(),
        })).optional(),
    }).optional(),
    personalizedInsights: z.array(z.object({
        title: z.string(),
        description: z.string(),
        relevance: z.string().optional(),
    })).optional(),
    additionalSections: z.array(z.object({
        title: z.string(),
        content: z.string(),
        icon: z.string().optional(),
    })).optional(),
});

// ─────────────────════════════════════════════════════════════════════════════
// MASTER ORCHESTRATOR OUTPUT SCHEMA
// This is what the AI returns to configure the entire visualization
// ═══════════════════════════════════════════════════════════════════════════

export const OrchestratorVisualizationSchema = z.object({
    // Request interpretation
    intent: z.string().describe('Summary of what the user is asking for'),
    queryType: z.enum([
        'single_stock',       // Analyzing one stock
        'comparison',         // Comparing multiple stocks
        'portfolio',          // Portfolio analysis
        'sector',             // Sector analysis
        'screening',          // Stock screening
        'risk_analysis',      // Risk-focused analysis
        'performance',        // Performance tracking
        'custom',             // Custom/complex request
    ]),
    
    // Data requirements
    symbols: z.array(z.string()).min(1).describe('Stock symbols to fetch'),
    timeRange: z.object({
        period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    }),
    dataGranularity: z.enum(['1m', '5m', '15m', '1h', '1d', '1wk', '1mo']).default('1d'),
    
    // ═══════════════════════════════════════════════════════════════════════
    // LEFT PANEL: VISUALS ONLY
    // ═══════════════════════════════════════════════════════════════════════
    
    // Visualization configuration
    layout: LayoutConfigSchema,
    
    // Chart configurations (can have multiple)
    charts: z.array(ChartConfigSchema).describe('Chart configurations'),
    
    // Risk visualizations
    riskVisualizations: z.array(RiskVisualizationSchema).optional(),
    
    // Statistics grid
    statsGrid: StatsGridSchema.optional(),
    
    // Data tables
    tables: z.array(DataTableSchema).optional(),
    
    // ═══════════════════════════════════════════════════════════════════════
    // RIGHT PANEL: AI SIDEBAR CONTENT
    // ═══════════════════════════════════════════════════════════════════════
    
    // AI Sidebar content
    sidebarContent: AISidebarContentSchema.optional(),
    
    // Extracted questions from user query
    extractedQuestions: z.array(z.string()).optional().describe('Questions extracted from user query to answer in sidebar'),
    
    // AI recommendations (legacy, kept for compatibility)
    recommendations: RecommendationsPanelSchema.optional(),
    
    // Risk layout: where to show risk info
    riskLayout: z.enum(['inline', 'sidebar_only', 'both', 'compact', 'detailed', 'comparison']).default('sidebar_only'),
    
    // Feature flags
    features: z.object({
        showRiskMetrics: z.boolean().default(true),
        showRecommendations: z.boolean().default(true),
        showStatistics: z.boolean().default(true),
        showCorrelations: z.boolean().default(false),
        enableDeepDive: z.boolean().default(true),
        showNews: z.boolean().default(false),
        showAISidebar: z.boolean().default(true),
        showRiskInSidebar: z.boolean().default(true),
        showPersonalizedInsights: z.boolean().default(true),
    }).default({
        showRiskMetrics: true,
        showRecommendations: true,
        showStatistics: true,
        showCorrelations: false,
        enableDeepDive: true,
        showNews: false,
        showAISidebar: true,
        showRiskInSidebar: true,
        showPersonalizedInsights: true,
    }),
    
    // Display preferences
    theme: z.object({
        colorScheme: z.enum(['default', 'monochrome', 'vibrant']).default('default'),
        chartStyle: z.enum(['modern', 'classic', 'minimal']).default('modern'),
    }).default({
        colorScheme: 'default',
        chartStyle: 'modern',
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export type ChartSeries = z.infer<typeof ChartSeriesSchema>;
export type ChartType = z.infer<typeof ChartTypeSchema>;
export type ChartConfig = z.infer<typeof ChartConfigSchema>;
export type RiskGauge = z.infer<typeof RiskGaugeSchema>;
export type RiskComparison = z.infer<typeof RiskComparisonSchema>;
export type RiskDistribution = z.infer<typeof RiskDistributionSchema>;
export type RiskHeatmap = z.infer<typeof RiskHeatmapSchema>;
export type RiskMeter = z.infer<typeof RiskMeterSchema>;
export type RiskVisualization = z.infer<typeof RiskVisualizationSchema>;
export type StatCard = z.infer<typeof StatCardSchema>;
export type StatsGrid = z.infer<typeof StatsGridSchema>;
export type DataTable = z.infer<typeof DataTableSchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
export type LayoutPanel = z.infer<typeof LayoutPanelSchema>;
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type Insight = z.infer<typeof InsightSchema>;
export type RecommendationsPanel = z.infer<typeof RecommendationsPanelSchema>;
export type UserQuestion = z.infer<typeof UserQuestionSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export type AISidebarContent = z.infer<typeof AISidebarContentSchema>;
export type OrchestratorVisualization = z.infer<typeof OrchestratorVisualizationSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CHART COLOR PALETTES
// ─────────────────────────────────────────────────────────────────────────────

export const CHART_PALETTES = {
    // Purple and blue palette for contrast against gold/amber liquid glass
    default: ['#8b5cf6', '#3b82f6', '#a855f7', '#6366f1', '#2563eb', '#c084fc', '#60a5fa', '#818cf8'],
    monochrome: ['#1a1a1a', '#4a4a4a', '#7a7a7a', '#aaaaaa', '#d4d4d4'],
    vibrant: ['#a855f7', '#3b82f6', '#8b5cf6', '#6366f1', '#2563eb', '#c084fc', '#60a5fa', '#818cf8'],
};

export const RISK_COLORS = {
    very_low: '#10b981',
    low: '#34d399',
    medium: '#fbbf24',
    high: '#f97316',
    very_high: '#ef4444',
};

export const CHART_HEIGHTS = {
    sm: 200,
    md: 320,
    lg: 400,
    xl: 500,
};
