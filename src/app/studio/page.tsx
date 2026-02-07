"use client";

import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Send,
  MessageSquare,
  Loader2,
  Sliders,
  Link2
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassSlider } from "@/components/ui/glass-slider";
import { toast } from "@/components/ui/toast";
import { useSimulationStore } from "@/stores/simulation-store";
import { SimulationChart } from "@/components/charts/simulation-chart";
import { cn } from "@/lib/utils";
import { useFinancialData } from "@/hooks/useFinancialData";
import { GlassButton } from "@/components/ui/glass-button";

export default function StudioPage() {
  const router = useRouter();
  const { summary, isConnected, loading } = useFinancialData();
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
    aiResponse,
    isLoadingAI,
    simulationResult,
  } = useSimulationStore();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [aiQuery, setAiQuery] = useState('');

  const scenarios = [
    {
      id: "conservative",
      name: "Conservative",
      income: 5,
      expense: -10,
      savings: 30,
      description: "Reduce expenses, maintain income"
    },
    {
      id: "aggressive",
      name: "Aggressive",
      income: 0,
      expense: -25,
      savings: 50,
      description: "Maximize savings rate"
    },
    {
      id: "growth",
      name: "Growth",
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
    toast.info("Simulation reset");
  };

  const handleRunSimulation = async () => {
    await runSimulation();
    const totalSavings = Math.round(projectedSavings * simulationMonths);
    toast.success(`${simulationMonths} month projection: ${totalSavings >= 0 ? '+' : ''}$${totalSavings.toLocaleString()} net savings`);
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    await askAI(aiQuery);
  };

  // Use real data if connected, otherwise zeros
  const baseIncome = isConnected ? (summary?.monthly_income || 0) : 0;
  const baseExpenses = isConnected ? (summary?.monthly_spending || 0) : 0;
  const projectedIncome = baseIncome * (1 + incomeChange / 100);
  const projectedExpenses = baseExpenses * (1 + expenseChange / 100);
  const projectedSavings = projectedIncome - projectedExpenses;
  const monthlyGoal = 3500;
  const goalProgress = isConnected ? Math.min((projectedSavings / monthlyGoal) * 100, 100) : 0;

  // Show connect prompt if not connected
  if (!loading && !isConnected) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
            <p className="text-foreground-muted text-sm mt-1">
              Simulate financial scenarios and explore possibilities
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-full bg-secondary mb-4">
              <Link2 className="w-8 h-8 text-foreground-muted" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Accounts</h3>
            <p className="text-sm text-foreground-muted text-center mb-6 max-w-[400px]">
              Link your bank accounts via Plaid to run financial simulations based on your real spending data
            </p>
            <GlassButton 
              variant="primary" 
              size="md"
              onClick={() => router.push('/imports')}
            >
              Connect via Plaid
            </GlassButton>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Studio
            </h1>
            <p className="text-foreground-muted text-sm mt-1">
              Simulate financial scenarios and explore possibilities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSimulating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Simulate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Controls */}
          <div className="space-y-4">
            {/* Quick Scenarios */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-3 text-xs">Quick Scenarios</h3>
              <div className="space-y-1.5">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => applyScenario(scenario)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-all duration-150 cursor-pointer",
                      activeScenario === scenario.id
                        ? "bg-accent/10 border border-accent/20"
                        : "bg-secondary/50 hover:bg-secondary border border-transparent"
                    )}
                  >
                    <p className="font-medium text-xs">{scenario.name}</p>
                    <p className="text-[11px] text-foreground-muted mt-0.5">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Manual Controls */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-4 text-xs">Adjustments</h3>
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
                  label="Duration"
                  min={3}
                  max={36}
                  value={simulationMonths}
                  onChange={setSimulationMonths}
                  formatValue={(v) => `${v} mo`}
                />
              </div>
            </motion.div>

            {/* Goal Progress */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-elevated p-5"
            >
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-semibold flex items-center gap-1.5 text-xs">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Monthly Savings Goal
                </h3>
                <span className="text-xs font-mono text-foreground-muted tabular-nums">${monthlyGoal.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2.5">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-foreground-muted tabular-nums">Projected: ${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="font-semibold text-primary tabular-nums">{goalProgress.toFixed(0)}%</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Simulation Visualization */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card-elevated p-5"
            >
              <SimulationChart
                baseIncome={baseIncome}
                baseExpenses={baseExpenses}
                incomeChange={incomeChange}
                expenseChange={expenseChange}
                months={simulationMonths}
              />
            </motion.div>

            {/* Projected Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-foreground-muted">Projected Income</p>
                  <div className={cn(
                    "p-1 rounded-md",
                    incomeChange >= 0 ? "bg-success-soft" : "bg-destructive-soft"
                  )}>
                    {incomeChange >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-semibold font-mono tabular-nums">
                  ${projectedIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={cn(
                  "text-[11px] mt-0.5 tabular-nums",
                  incomeChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {incomeChange >= 0 ? "+" : ""}{incomeChange}% from current
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-foreground-muted">Projected Expenses</p>
                  <div className={cn(
                    "p-1 rounded-md",
                    expenseChange <= 0 ? "bg-success-soft" : "bg-destructive-soft"
                  )}>
                    {expenseChange <= 0 ? (
                      <TrendingDown className="w-3 h-3 text-success" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-lg font-semibold font-mono tabular-nums">
                  ${projectedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={cn(
                  "text-[11px] mt-0.5 tabular-nums",
                  expenseChange <= 0 ? "text-success" : "text-destructive"
                )}>
                  {expenseChange >= 0 ? "+" : ""}{expenseChange}% from current
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.11 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-foreground-muted">Net Savings</p>
                  <div className={cn(
                    "p-1 rounded-md",
                    projectedSavings >= 0 ? "bg-success-soft" : "bg-destructive-soft"
                  )}>
                    <Target className={cn(
                      "w-3 h-3",
                      projectedSavings >= 0 ? "text-success" : "text-destructive"
                    )} />
                  </div>
                </div>
                <p className="text-lg font-semibold font-mono tabular-nums">
                  ${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] mt-0.5 text-foreground-muted">
                  per month
                </p>
              </motion.div>
            </div>

            {/* AI Chat Section */}
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-3 flex items-center gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                Ask AI About Your Scenario
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  placeholder="e.g., What if rent increases by 10%?"
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none transition-colors text-xs placeholder:text-foreground-muted"
                />
                <button
                  onClick={handleAskAI}
                  disabled={isLoadingAI || !aiQuery.trim()}
                  className="px-3.5 py-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-lg bg-accent/[0.06] border border-accent/15"
                >
                  <p className="text-xs whitespace-pre-wrap text-foreground">{aiResponse}</p>
                </motion.div>
              )}

              {simulationResult?.insights && simulationResult.insights.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-medium text-foreground-muted uppercase tracking-wider">Insights</p>
                  {simulationResult.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-secondary/40 rounded-lg text-xs">
                      <div className="w-1 h-1 rounded-full bg-primary shrink-0 mt-1.5" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Monthly Projections */}
            {simulationResult?.projections && (
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-5"
              >
                <h3 className="font-semibold mb-3 text-xs">Monthly Projections</h3>
                <div className="overflow-x-auto -mx-2 px-2">
                  <div className="flex gap-2.5 pb-2">
                    {simulationResult.projections.slice(0, 6).map((proj, i) => (
                      <div key={i} className="min-w-[120px] p-3 bg-secondary/40 rounded-lg">
                        <p className="font-medium text-xs mb-2 text-foreground">{proj.monthName}</p>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Income</span>
                            <span className="text-success font-mono tabular-nums">${proj.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Expenses</span>
                            <span className="text-destructive font-mono tabular-nums">${proj.expenses.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="text-foreground-muted">Net</span>
                            <span className={cn(
                              "font-mono font-medium tabular-nums",
                              proj.balance >= 0 ? 'text-success' : 'text-destructive'
                            )}>
                              ${proj.balance.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
