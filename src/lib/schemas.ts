import { z } from 'zod';

// User's natural language query input
export const UserQuerySchema = z.object({
    query: z.string().describe('Natural language query from the user'),
});

// Orchestrator output - structured query parameters
export const OrchestratorOutputSchema = z.object({
    symbols: z.array(z.string()).describe('Stock symbols to analyze (e.g., ["AAPL", "GOOGL"])'),
    timeRange: z.object({
        start: z.string().describe('Start date in ISO format'),
        end: z.string().describe('End date in ISO format'),
        period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).describe('Time period shorthand'),
    }),
    queryType: z.enum(['single', 'comparison', 'analysis']).describe('Type of analysis requested'),
    features: z.object({
        annotations: z.boolean().default(true),
        risk: z.boolean().default(true),
        recommendations: z.boolean().default(true),
    }).describe('Requested features'),
    intent: z.string().describe('Summary of user intent'),
});

// Stock data from Yahoo Finance
export const StockDataPointSchema = z.object({
    date: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number(),
    adjClose: z.number().optional(),
});

export const StockDataSchema = z.object({
    symbol: z.string(),
    name: z.string().optional(),
    data: z.array(StockDataPointSchema),
    metadata: z.object({
        currency: z.string().optional(),
        exchangeName: z.string().optional(),
        instrument: z.string().optional(),
    }).optional(),
});

// Visualization instructions
export const VisualizationSchema = z.object({
    chartType: z.enum(['line', 'area', 'candlestick', 'comparison']),
    data: z.array(StockDataSchema),
    config: z.object({
        title: z.string(),
        xAxis: z.string(),
        yAxis: z.string(),
        colors: z.array(z.string()).optional(),
        showGrid: z.boolean().default(true),
        showLegend: z.boolean().default(true),
    }),
});

// AI Annotations
export const AnnotationSchema = z.object({
    annotations: z.array(z.object({
        date: z.string(),
        symbol: z.string(),
        type: z.enum(['peak', 'trough', 'significant_event', 'trend_change']),
        text: z.string(),
        value: z.number(),
    })),
});

// AI Recommendations
export const RecommendationSchema = z.object({
    summary: z.string().describe('Overall recommendation summary'),
    insights: z.array(z.object({
        title: z.string(),
        description: z.string(),
        relevance: z.string().describe('Why this is relevant to the user'),
    })),
    contextualAdvice: z.string().describe('Advice based on user profile'),
    riskAlignment: z.string().describe('How this aligns with user risk tolerance'),
});

// Risk Analysis
export const RiskMetricsSchema = z.object({
    symbol: z.string(),
    metrics: z.object({
        volatility: z.number().describe('Standard deviation of returns'),
        beta: z.number().optional().describe('Beta relative to market'),
        sharpeRatio: z.number().optional().describe('Risk-adjusted return'),
        maxDrawdown: z.number().describe('Maximum observed loss from peak'),
        var95: z.number().optional().describe('Value at Risk (95% confidence)'),
    }),
    riskLevel: z.enum(['low', 'medium', 'high', 'very_high']),
    visualizations: z.array(z.object({
        type: z.enum(['gauge', 'heatmap', 'distribution']),
        data: z.any(),
        label: z.string(),
    })),
});

// Deep Dive Analysis (for double-click feature)
export const DeepDiveSchema = z.object({
    date: z.string(),
    symbol: z.string(),
    priceInfo: z.object({
        open: z.number(),
        close: z.number(),
        high: z.number(),
        low: z.number(),
        change: z.number(),
        changePercent: z.number(),
    }),
    news: z.array(z.object({
        title: z.string(),
        source: z.string(),
        url: z.string().optional(),
        date: z.string(),
        summary: z.string().optional(),
    })),
    analysis: z.string().describe('AI-generated analysis of why the price moved'),
    context: z.string().describe('Broader market context for that period'),
});

// User Profile (from data.md)
export const UserProfileSchema = z.object({
    age: z.number(),
    location: z.string(),
    riskTolerance: z.enum(['Low', 'Medium', 'High', 'Aggressive']),
    debtProfile: z.string(),
    incomeStatus: z.string(),
    customRequest: z.string().optional(),
});

// Type exports
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;
export type StockData = z.infer<typeof StockDataSchema>;
export type StockDataPoint = z.infer<typeof StockDataPointSchema>;
export type Visualization = z.infer<typeof VisualizationSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type DeepDive = z.infer<typeof DeepDiveSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
