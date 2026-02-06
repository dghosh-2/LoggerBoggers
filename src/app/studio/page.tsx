"use client";

import { 
  Play, 
  Pause, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target
} from "lucide-react";
import { useState } from "react";
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
    setIncomeChange,
    setExpenseChange,
    setSavingsRate,
    isSimulating,
    toggleSimulation,
    resetSimulation
  } = useSimulationStore();

  const [activeScenario, setActiveScenario] = useState<string | null>(null);

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
    toast.info("Simulation reset to defaults");
  };

  const handleToggleSimulation = () => {
    toggleSimulation();
    if (!isSimulating) {
      toast.success("Simulation started");
    } else {
      toast.info("Simulation paused");
    }
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
            <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
            <p className="text-foreground-muted mt-1">
              Simulate scenarios and plan your financial future
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GlassButton variant="secondary" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              Reset
            </GlassButton>
            <GlassButton
              variant={isSimulating ? "danger" : "primary"}
              onClick={handleToggleSimulation}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop
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
          <div className="space-y-6">
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
                    className={`w-full p-3 rounded-xl text-left transition-colors ${
                      activeScenario === scenario.id
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
              <h3 className="font-semibold mb-6">Adjustments</h3>
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
              </div>
            </GlassCard>

            {/* Goal Progress */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  Monthly Goal
                </h3>
                <span className="text-sm text-foreground-muted">${monthlyGoal.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden mb-3">
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

          {/* Graph Preview */}
          <div className="lg:col-span-2">
            <GlassCard className="h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Simulation Preview</h3>
                  <p className="text-sm text-foreground-muted">
                    {isSimulating ? "Running simulation..." : "Adjust parameters and simulate"}
                  </p>
                </div>
                {isSimulating && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-medium text-success">Live</span>
                  </div>
                )}
              </div>
              <FinancialGraph />
            </GlassCard>
          </div>
        </div>

        {/* Projected Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Projected Income</p>
                <p className="text-2xl font-semibold">
                  ${projectedIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                  ${projectedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                <p className="text-sm text-foreground-muted mb-1">Projected Savings</p>
                <p className="text-2xl font-semibold">
                  ${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${projectedSavings >= monthlyGoal ? "bg-success/10" : "bg-warning/10"}`}>
                <Target className={`w-5 h-5 ${projectedSavings >= monthlyGoal ? "text-success" : "text-warning"}`} />
              </div>
            </div>
            <p className={`text-sm mt-2 ${projectedSavings >= monthlyGoal ? "text-success" : "text-warning"}`}>
              {projectedSavings >= monthlyGoal ? "Goal achieved!" : `$${(monthlyGoal - projectedSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })} to goal`}
            </p>
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
