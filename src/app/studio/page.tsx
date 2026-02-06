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
  Sliders
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassSlider } from "@/components/ui/glass-slider";
import { toast } from "@/components/ui/toast";
import { useSimulationStore } from "@/stores/simulation-store";
import { SimulationChart } from "@/components/charts/simulation-chart";
import { cn } from "@/lib/utils";

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sliders className="w-6 h-6 text-primary" />
              </div>
              Studio
            </h1>
            <p className="text-foreground-muted mt-1">
              Simulate financial scenarios and explore possibilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
            </motion.button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Quick Scenarios */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-4 text-sm">Quick Scenarios</h3>
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <motion.button
                    key={scenario.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => applyScenario(scenario)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all duration-200",
                      activeScenario === scenario.id
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-secondary/50 hover:bg-secondary border border-transparent"
                    )}
                  >
                    <p className="font-medium text-sm">{scenario.name}</p>
                    <p className="text-xs text-foreground-muted mt-0.5">{scenario.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Manual Controls */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-5 text-sm">Adjustments</h3>
              <div className="space-y-6">
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-elevated p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary" />
                  Monthly Savings Goal
                </h3>
                <span className="text-sm font-mono text-foreground-muted">${monthlyGoal.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground-muted">Projected: ${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="font-semibold text-primary">{goalProgress.toFixed(0)}%</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Simulation Visualization */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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
            <div className="grid grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-foreground-muted">Projected Income</p>
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    incomeChange >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {incomeChange >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xl font-semibold font-mono">
                  ${projectedIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  incomeChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {incomeChange >= 0 ? "+" : ""}{incomeChange}% from current
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-foreground-muted">Projected Expenses</p>
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    expenseChange <= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {expenseChange <= 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xl font-semibold font-mono">
                  ${projectedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  expenseChange <= 0 ? "text-success" : "text-destructive"
                )}>
                  {expenseChange >= 0 ? "+" : ""}{expenseChange}% from current
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-elevated p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-foreground-muted">Net Savings</p>
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    projectedSavings >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    <Target className={cn(
                      "w-3.5 h-3.5",
                      projectedSavings >= 0 ? "text-success" : "text-destructive"
                    )} />
                  </div>
                </div>
                <p className="text-xl font-semibold font-mono">
                  ${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-1 text-foreground-muted">
                  per month
                </p>
              </motion.div>
            </div>

            {/* AI Chat Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-elevated p-5"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-primary" />
                Ask AI About Your Scenario
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  placeholder="e.g., What if rent increases by 10%?"
                  className="flex-1 px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:outline-none transition-colors text-sm placeholder:text-foreground-muted"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAskAI}
                  disabled={isLoadingAI || !aiQuery.trim()}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>

              {/* AI Response */}
              {aiResponse && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/10"
                >
                  <p className="text-sm whitespace-pre-wrap text-foreground">{aiResponse}</p>
                </motion.div>
              )}

              {/* Simulation Insights */}
              {simulationResult?.insights && simulationResult.insights.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Insights</p>
                  {simulationResult.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-secondary/30 rounded-xl text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Monthly Projections */}
            {simulationResult?.projections && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-elevated p-5"
              >
                <h3 className="font-semibold mb-4 text-sm">Monthly Projections</h3>
                <div className="overflow-x-auto -mx-2 px-2">
                  <div className="flex gap-3 pb-2">
                    {simulationResult.projections.slice(0, 6).map((proj, i) => (
                      <div key={i} className="min-w-[130px] p-3 bg-secondary/30 rounded-xl">
                        <p className="font-medium text-sm mb-2 text-foreground">{proj.monthName}</p>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Income</span>
                            <span className="text-success font-mono">${proj.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-foreground-muted">Expenses</span>
                            <span className="text-destructive font-mono">${proj.expenses.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="text-foreground-muted">Net</span>
                            <span className={cn(
                              "font-mono font-medium",
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
