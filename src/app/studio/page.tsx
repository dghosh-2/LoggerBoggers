"use client";

import {
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Send,
  Newspaper,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  BarChart3,
  Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassSlider } from "@/components/ui/glass-slider";
import { FinancialGraph } from "@/components/graph/financial-graph";
import { toast } from "@/components/ui/toast";
import { useSimulationStore } from "@/stores/simulation-store";

export default function StudioPage() {
  const {
    incomeChange,
    expenseChange,
    savingsRate,
    simulationMonths,
    setIncomeChange,
    setExpenseChange,
    setSavingsRate,
    setSimulationMonths,
    isSimulating,
    resetSimulation,
    runSimulation,
    askAI,
    fetchNews,
    aiResponse,
    isLoadingAI,
    newsInsights,
    isLoadingNews,
    simulationResult,
  } = useSimulationStore();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Fetch news on mount
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const scenarios = [
    {
      id: "conservative",
      name: "Conservative Growth",
      income: 5,
      expense: -10,
      savings: 30,
      description: "Reduce expenses, maintain income"
    },
    {
      id: "aggressive",
      name: "Aggressive Savings",
      income: 0,
      expense: -25,
      savings: 50,
      description: "Maximize savings rate"
    },
    {
      id: "growth",
      name: "Income Growth",
      income: 20,
      expense: 5,
      savings: 35,
      description: "Focus on increasing income"
    },
  ];

  const applyScenario = (scenario: typeof scenarios[0]) => {
    setActiveScenario(scenario.id);
    setIncomeChange(scenario.income);
    setExpenseChange(scenario.expense);
    setSavingsRate(scenario.savings);
    toast.success(`Applied "${scenario.name}" scenario`);
  };

  const handleReset = () => {
    resetSimulation();
    setActiveScenario(null);
    setAiQuery('');
    toast.info("Simulation reset to defaults");
  };

  const handleRunSimulation = async () => {
    toast.success("Running simulation with news & historical data...");
    await runSimulation();
    toast.success("Simulation complete!");
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    toast.info("Analyzing with AI...");
    await askAI(aiQuery);
    toast.success("AI analysis complete!");
  };

  // Calculate projected values
  const baseIncome = 9500;
  const baseExpenses = 6400;
  const projectedIncome = baseIncome * (1 + incomeChange / 100);
  const projectedExpenses = baseExpenses * (1 + expenseChange / 100);
  const projectedSavings = projectedIncome - projectedExpenses;
  const monthlyGoal = 3500;
  const goalProgress = Math.min((projectedSavings / monthlyGoal) * 100, 100);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
            <p className="text-foreground-muted mt-1">
              Simulate scenarios with news & historical data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GlassButton variant="secondary" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              Reset
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleRunSimulation}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Simulate
                </>
              )}
            </GlassButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Quick Scenarios */}
            <GlassCard>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Scenarios
              </h3>
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario)}
                    className={`w-full p-3 rounded-xl text-left transition-colors ${activeScenario === scenario.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary hover:bg-secondary/80 border border-transparent"
                      }`}
                  >
                    <p className="font-medium text-sm">{scenario.name}</p>
                    <p className="text-xs text-foreground-muted">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Manual Controls */}
            <GlassCard>
              <h3 className="font-semibold mb-4">Adjustments</h3>
              <div className="space-y-5">
                <GlassSlider
                  label="Income Change"
                  min={-50}
                  max={50}
                  value={incomeChange}
                  onChange={setIncomeChange}
                  formatValue={(v) => `${v > 0 ? "+" : ""}${v}%`}
                />
                <GlassSlider
                  label="Expense Change"
                  min={-50}
                  max={50}
                  value={expenseChange}
                  onChange={setExpenseChange}
                  formatValue={(v) => `${v > 0 ? "+" : ""}${v}%`}
                />
                <GlassSlider
                  label="Target Savings Rate"
                  min={0}
                  max={70}
                  value={savingsRate}
                  onChange={setSavingsRate}
                  formatValue={(v) => `${v}%`}
                />
                <GlassSlider
                  label="Simulation Duration"
                  min={3}
                  max={36}
                  value={simulationMonths}
                  onChange={setSimulationMonths}
                  formatValue={(v) => `${v} months`}
                />
              </div>
            </GlassCard>

            {/* Goal Progress */}
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  Monthly Goal
                </h3>
                <span className="text-sm text-foreground-muted">${monthlyGoal.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Progress</span>
                <span className="font-semibold text-primary">{goalProgress.toFixed(0)}%</span>
              </div>
            </GlassCard>
          </div>

          {/* Graph & AI Section */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Simulation Preview</h3>
                  <p className="text-sm text-foreground-muted">
                    {simulationResult ? "Results include news impacts" : "Adjust parameters and simulate"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showBreakdown ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'
                      }`}
                  >
                    <BarChart3 className="w-3 h-3 inline mr-1" />
                    Breakdown
                  </button>
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showTimeline ? 'bg-primary text-white' : 'bg-secondary hover:bg-secondary/80'
                      }`}
                  >
                    <Clock className="w-3 h-3 inline mr-1" />
                    Timeline
                  </button>
                </div>
              </div>
              <FinancialGraph />
            </GlassCard>

            {/* Detailed Breakdown */}
            {showBreakdown && simulationResult?.breakdown && (
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Category Breakdown
                </h3>
                <div className="space-y-3">
                  {simulationResult.breakdown.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
                      <div>
                        <p className="font-medium text-sm">{cat.category}</p>
                        <p className="text-xs text-foreground-muted">
                          Base: ${cat.baseAmount} → Adjusted: ${cat.adjustedAmount}
                          {cat.newsImpact !== 0 && (
                            <span className={cat.newsImpact > 0 ? 'text-destructive' : 'text-success'}>
                              {' '}(News: {cat.newsImpact > 0 ? '+' : ''}${cat.newsImpact})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${cat.totalAmount}</p>
                        <p className={`text-xs ${cat.changePercent > 0 ? 'text-destructive' : 'text-success'}`}>
                          {cat.changePercent > 0 ? '+' : ''}{cat.changePercent}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Timeline */}
            {showTimeline && simulationResult?.timeline && simulationResult.timeline.length > 0 && (
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Event Timeline
                </h3>
                <div className="space-y-2">
                  {simulationResult.timeline.map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 bg-secondary/30 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="text-sm">{event}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Monthly Projections */}
            {simulationResult?.projections && (
              <GlassCard>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Monthly Projections
                </h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-2">
                    {simulationResult.projections.slice(0, 6).map((proj, i) => (
                      <div key={i} className="min-w-[140px] p-3 bg-secondary/50 rounded-xl">
                        <p className="font-medium text-sm mb-2">{proj.monthName}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Income</span>
                            <span className="text-success">${proj.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Expenses</span>
                            <span className="text-destructive">${proj.expenses.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Balance</span>
                            <span className={proj.balance >= 0 ? 'text-success' : 'text-destructive'}>
                              ${proj.balance.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {proj.newsEffects && proj.newsEffects.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            {proj.newsEffects.map((effect, j) => (
                              <p key={j} className="text-xs text-primary">{effect}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* AI Chat Section */}
            <GlassCard>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Ask AI About Scenarios
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  placeholder="e.g., What if rent increases and I get a raise?"
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                />
                <GlassButton
                  variant="primary"
                  onClick={handleAskAI}
                  disabled={isLoadingAI || !aiQuery.trim()}
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </GlassButton>
              </div>

              {/* AI Response */}
              {aiResponse && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-4">
                  <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                </div>
              )}

              {/* Simulation Insights */}
              {simulationResult?.insights && simulationResult.insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide">Insights</p>
                  {simulationResult.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-secondary/30 rounded-lg text-sm">
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Historical Comparison */}
              {simulationResult?.historicalComparison && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">vs Historical</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-secondary/30 rounded-lg text-center">
                      <p className="text-foreground-muted">Before</p>
                      <p className="font-semibold">${simulationResult.historicalComparison.avgMonthlyExpensesBefore}/mo</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded-lg text-center">
                      <p className="text-foreground-muted">Projected</p>
                      <p className="font-semibold">${simulationResult.historicalComparison.avgMonthlyExpensesAfter}/mo</p>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded-lg text-center">
                      <p className="text-foreground-muted">Savings Δ</p>
                      <p className={`font-semibold ${simulationResult.historicalComparison.savingsRateChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {simulationResult.historicalComparison.savingsRateChange > 0 ? '+' : ''}{simulationResult.historicalComparison.savingsRateChange}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* News Insights Panel */}
        <GlassCard>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            Financial News (Integrated in Simulation)
            {isLoadingNews && <Loader2 className="w-4 h-4 animate-spin text-foreground-muted" />}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {newsInsights.map((news) => (
              <div
                key={news.id}
                className={`p-3 rounded-xl border ${news.impact === 'positive'
                  ? 'bg-success/5 border-success/20'
                  : 'bg-destructive/5 border-destructive/20'
                  }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {news.impact === 'positive' ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-xs">{news.title}</p>
                    <p className="text-xs text-foreground-muted">{news.source}</p>
                  </div>
                </div>
                <p className="text-xs font-medium text-primary">💡 {news.suggestion}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Projected Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Projected Income</p>
                <p className="text-2xl font-semibold">
                  ${simulationResult?.totalIncome ? (simulationResult.totalIncome / 12).toLocaleString(undefined, { maximumFractionDigits: 0 }) : projectedIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                </p>
              </div>
              <div className={`p-2 rounded-lg ${incomeChange >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                {incomeChange >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>
            <p className={`text-sm mt-2 ${incomeChange >= 0 ? "text-success" : "text-destructive"}`}>
              {incomeChange >= 0 ? "+" : ""}{incomeChange}% from current
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Projected Expenses</p>
                <p className="text-2xl font-semibold">
                  ${simulationResult?.totalExpenses ? (simulationResult.totalExpenses / 12).toLocaleString(undefined, { maximumFractionDigits: 0 }) : projectedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                </p>
              </div>
              <div className={`p-2 rounded-lg ${expenseChange <= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                {expenseChange <= 0 ? (
                  <TrendingDown className="w-5 h-5 text-success" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-destructive" />
                )}
              </div>
            </div>
            <p className={`text-sm mt-2 ${expenseChange <= 0 ? "text-success" : "text-destructive"}`}>
              {expenseChange >= 0 ? "+" : ""}{expenseChange}% from current
            </p>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">End Balance (12mo)</p>
                <p className="text-2xl font-semibold">
                  ${simulationResult?.endBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${(simulationResult?.endBalance ?? projectedSavings) >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                <Target className={`w-5 h-5 ${(simulationResult?.endBalance ?? projectedSavings) >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
            </div>
            <p className={`text-sm mt-2 ${simulationResult?.riskScore === 0 ? "text-success" : "text-warning"}`}>
              {simulationResult?.riskScore === 0 ? "No risk of negative balance" : `${simulationResult?.riskScore}% risk score`}
            </p>
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
