"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Target,
  Shield,
  Zap,
  ChevronRight
} from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { HoldingCard } from "@/components/cards/holding-card";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useUserStore } from "@/stores/user-store";

const portfolioHistory = [
  { date: "Jan", value: 45000 },
  { date: "Feb", value: 47500 },
  { date: "Mar", value: 46200 },
  { date: "Apr", value: 49800 },
  { date: "May", value: 52100 },
  { date: "Jun", value: 54750 },
  { date: "Jul", value: 53200 },
  { date: "Aug", value: 56400 },
  { date: "Sep", value: 58100 },
  { date: "Oct", value: 61200 },
  { date: "Nov", value: 59800 },
  { date: "Dec", value: 63450 },
];

const recommendations = [
  {
    id: "1",
    title: "Rebalance Tech Holdings",
    description: "Your tech allocation is at 45%, above the recommended 35%. Consider shifting some to bonds.",
    impact: "Reduce portfolio volatility by 15%",
    priority: "high",
    icon: Shield,
  },
  {
    id: "2",
    title: "Tax-Loss Harvesting Opportunity",
    description: "Selling XYZ position would generate a $2,400 tax loss that can offset gains.",
    impact: "Save approximately $600 in taxes",
    priority: "medium",
    icon: Target,
  },
  {
    id: "3",
    title: "Increase International Exposure",
    description: "Adding 10% international stocks could improve diversification and returns.",
    impact: "Potential 2-3% return improvement",
    priority: "low",
    icon: Zap,
  },
];

export default function PortfolioPage() {
  const { holdings } = useUserStore();
  const [selectedView, setSelectedView] = useState<"holdings" | "allocation">("holdings");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<typeof portfolio[0] | null>(null);
  
  const portfolio = holdings.map(h => ({
    id: h.id,
    symbol: h.symbol,
    name: h.name,
    value: h.shares * h.price,
    change: h.changePercent,
    shares: h.shares,
    price: h.price,
  }));
  
  const totalValue = portfolio.reduce((sum, h) => sum + h.value, 0);
  const totalChange = portfolio.reduce((sum, h) => sum + (h.value * h.change / 100), 0);
  const percentageChange = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;
  const isPositive = percentageChange >= 0;

  const handleApplyRecommendation = (rec: typeof recommendations[0]) => {
    toast.success(`${rec.title} applied to your portfolio`);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header with Total Value */}
        <GlassCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-foreground-muted mb-1 uppercase tracking-wider">Total Portfolio Value</p>
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl font-semibold tabular-nums">
                  ${totalValue.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </h1>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? "text-success" : "text-destructive"
                }`}>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="tabular-nums">
                    {isPositive ? "+" : ""}{percentageChange.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                {isPositive ? "+" : "-"}${Math.abs(totalChange).toLocaleString(undefined, { maximumFractionDigits: 0 })} this month
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-secondary">
              <button
                onClick={() => setSelectedView("holdings")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                  selectedView === "holdings"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Holdings
              </button>
              <button
                onClick={() => setSelectedView("allocation")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                  selectedView === "allocation"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                Allocation
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2">
            <PortfolioChart data={portfolioHistory} />
          </div>

          {/* AI Insight */}
          <GlassCard>
            <div className="flex items-start gap-2.5 mb-3">
              <div className="p-1.5 rounded-md bg-secondary">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">AI Insight</h3>
                <p className="text-[11px] text-foreground-muted">Portfolio analysis</p>
              </div>
            </div>
            
            <p className="text-xs text-foreground-muted leading-relaxed mb-4">
              Your portfolio has grown 41% this year, outperforming the S&P 500 by 12%. 
              Consider rebalancing your tech allocation which is now 45% of your portfolio.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">Risk Level</span>
                <span className="font-medium text-warning">Moderate-High</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">Diversification</span>
                <span className="font-medium text-success">Good</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">YTD Return</span>
                <span className="font-medium text-success tabular-nums">+41.0%</span>
              </div>
            </div>

            <button 
              onClick={() => setShowRecommendations(true)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-background-tertiary transition-colors duration-150 cursor-pointer"
            >
              View Recommendations
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </GlassCard>
        </div>

        {/* Holdings or Allocation View */}
        {selectedView === "holdings" ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Your Holdings</h2>
              <span className="text-xs text-foreground-muted">
                {portfolio.length} assets
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {portfolio.map((holding) => (
                <div 
                  key={holding.id} 
                  onClick={() => setSelectedHolding(holding)}
                  className="cursor-pointer"
                >
                  <HoldingCard
                    symbol={holding.symbol}
                    name={holding.name}
                    value={holding.value}
                    change={holding.change}
                    percentage={Math.round((holding.value / totalValue) * 100)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <GlassCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold">Portfolio Allocation</h2>
              <span className="text-xs text-foreground-muted">
                By asset value
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Allocation Pie Chart */}
              <div className="h-[280px] flex items-center justify-center">
                <div className="relative w-[240px] h-[240px]">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {portfolio.reduce((acc, holding, index) => {
                      const percentage = (holding.value / totalValue) * 100;
                      const previousPercentages = portfolio
                        .slice(0, index)
                        .reduce((sum, h) => sum + (h.value / totalValue) * 100, 0);
                      
                      const colors = [
                        'var(--primary)',
                        'var(--success)',
                        'var(--warning)',
                        'var(--destructive)',
                        'var(--accent)',
                        '#8b5cf6',
                        '#ec4899',
                        '#14b8a6',
                      ];
                      
                      const circumference = 2 * Math.PI * 40;
                      const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((previousPercentages / 100) * circumference);
                      
                      acc.push(
                        <circle
                          key={holding.id}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={colors[index % colors.length]}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedHolding(holding)}
                        />
                      );
                      return acc;
                    }, [] as React.JSX.Element[])}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold tabular-nums">${(totalValue / 1000).toFixed(1)}k</p>
                    <p className="text-[11px] text-foreground-muted">Total Value</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                {portfolio.map((holding, index) => {
                  const percentage = (holding.value / totalValue) * 100;
                  const colors = [
                    'bg-primary',
                    'bg-success',
                    'bg-warning',
                    'bg-destructive',
                    'bg-accent',
                    'bg-violet-500',
                    'bg-pink-500',
                    'bg-teal-500',
                  ];
                  
                  return (
                    <motion.div
                      key={holding.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors duration-150"
                      onClick={() => setSelectedHolding(holding)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`} />
                        <div>
                          <p className="font-medium text-xs">{holding.symbol}</p>
                          <p className="text-[11px] text-foreground-muted">{holding.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-xs tabular-nums">{percentage.toFixed(1)}%</p>
                        <p className="text-[11px] text-foreground-muted tabular-nums">
                          ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Allocation Breakdown */}
            <div className="mt-6 pt-5 border-t border-border">
              <h3 className="text-xs font-medium mb-3">Asset Type Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'Tech', percentage: 45, color: 'bg-primary' },
                  { type: 'Finance', percentage: 25, color: 'bg-success' },
                  { type: 'Healthcare', percentage: 15, color: 'bg-warning' },
                  { type: 'Other', percentage: 15, color: 'bg-secondary' },
                ].map((sector) => (
                  <div key={sector.type} className="text-center">
                    <div className="h-1.5 rounded-full bg-secondary mb-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${sector.color}`} 
                        style={{ width: `${sector.percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-foreground-muted">{sector.type}</p>
                    <p className="text-xs font-medium tabular-nums">{sector.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Performance Prediction */}
        <GlassCard>
          <h3 className="text-sm font-semibold mb-3">12-Month Prediction</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Conservative", value: 68500, change: 8 },
              { label: "Expected", value: 76200, change: 20 },
              { label: "Optimistic", value: 85100, change: 34 },
            ].map((prediction) => (
              <div
                key={prediction.label}
                className="p-3.5 rounded-lg bg-secondary text-center cursor-pointer hover:bg-background-tertiary transition-colors duration-150"
                onClick={() => toast.info(`${prediction.label} scenario: $${prediction.value.toLocaleString()} projected`)}
              >
                <p className="text-[11px] text-foreground-muted mb-1">{prediction.label}</p>
                <p className="text-lg font-semibold tabular-nums">${(prediction.value / 1000).toFixed(1)}k</p>
                <div className="mt-2 h-1 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${prediction.change}%` }}
                  />
                </div>
                <p className="text-[11px] text-success mt-1 tabular-nums">+{prediction.change}%</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Recommendations Modal */}
      <Modal
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        title="AI Recommendations"
        subtitle="Personalized suggestions to optimize your portfolio"
        size="lg"
      >
        <div className="p-5 space-y-3">
          {recommendations.map((rec, index) => {
            const Icon = rec.icon;
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors duration-150"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    rec.priority === "high" 
                      ? "bg-destructive-soft" 
                      : rec.priority === "medium"
                      ? "bg-warning-soft"
                      : "bg-primary-soft"
                  }`}>
                    <Icon className={`w-4 h-4 ${
                      rec.priority === "high" 
                        ? "text-destructive" 
                        : rec.priority === "medium"
                        ? "text-warning"
                        : "text-primary"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold">{rec.title}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        rec.priority === "high" 
                          ? "bg-destructive-soft text-destructive" 
                          : rec.priority === "medium"
                          ? "bg-warning-soft text-warning"
                          : "bg-primary-soft text-primary"
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted mb-2">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-primary font-medium">{rec.impact}</p>
                      <button
                        onClick={() => handleApplyRecommendation(rec)}
                        className="flex items-center gap-0.5 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer"
                      >
                        Apply
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <button
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium mt-3 hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => {
              toast.success("All recommendations applied!");
              setShowRecommendations(false);
            }}
          >
            Apply All Recommendations
          </button>
        </div>
      </Modal>

      {/* Holding Details Modal */}
      <Modal
        isOpen={selectedHolding !== null}
        onClose={() => setSelectedHolding(null)}
        title={selectedHolding?.name || ""}
        subtitle={selectedHolding?.symbol}
        size="sm"
      >
        {selectedHolding && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-foreground-muted">Current Value</p>
                <p className="text-2xl font-semibold tabular-nums">
                  ${selectedHolding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs ${
                selectedHolding.change >= 0 ? "bg-success-soft text-success" : "bg-destructive-soft text-destructive"
              }`}>
                {selectedHolding.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="font-medium tabular-nums">{selectedHolding.change >= 0 ? "+" : ""}{selectedHolding.change.toFixed(2)}%</span>
              </div>
            </div>

            <div className="space-y-0">
              <div className="flex justify-between items-center py-2.5 border-b border-border">
                <span className="text-xs text-foreground-muted">Shares</span>
                <span className="text-sm font-medium tabular-nums">{selectedHolding.shares}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border">
                <span className="text-xs text-foreground-muted">Price per Share</span>
                <span className="text-sm font-medium tabular-nums">${selectedHolding.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-border">
                <span className="text-xs text-foreground-muted">Portfolio %</span>
                <span className="text-sm font-medium tabular-nums">{Math.round((selectedHolding.value / totalValue) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-xs text-foreground-muted">Day Change</span>
                <span className={`text-sm font-medium tabular-nums ${selectedHolding.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {selectedHolding.change >= 0 ? "+" : ""}${((selectedHolding.value * selectedHolding.change) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 rounded-lg bg-success-soft text-success text-sm font-medium hover:bg-success/15 transition-colors cursor-pointer"
                onClick={() => {
                  toast.success(`Buy order for ${selectedHolding.symbol} created`);
                  setSelectedHolding(null);
                }}
              >
                Buy More
              </button>
              <button
                className="flex-1 py-2.5 rounded-lg bg-destructive-soft text-destructive text-sm font-medium hover:bg-destructive/15 transition-colors cursor-pointer"
                onClick={() => {
                  toast.info(`Sell order for ${selectedHolding.symbol} created`);
                  setSelectedHolding(null);
                }}
              >
                Sell
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
