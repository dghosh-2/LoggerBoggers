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
  
  // Calculate portfolio value from holdings
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
      <div className="space-y-8">
        {/* Header with Total Value */}
        <GlassCard>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-sm text-foreground-muted mb-1">Total Portfolio Value</p>
              <div className="flex items-baseline gap-4">
                <h1 className="text-4xl font-semibold">
                  ${totalValue.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </h1>
                <div className={`flex items-center gap-1 text-lg font-medium ${
                  isPositive ? "text-success" : "text-destructive"
                }`}>
                  {isPositive ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}{percentageChange.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground-muted mt-1">
                {isPositive ? "+" : "-"}${Math.abs(totalChange).toLocaleString(undefined, { maximumFractionDigits: 0 })} this month
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary">
              <button
                onClick={() => setSelectedView("holdings")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedView === "holdings"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Holdings
              </button>
              <button
                onClick={() => setSelectedView("allocation")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedView === "allocation"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <PieChart className="w-4 h-4" />
                Allocation
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <PortfolioChart data={portfolioHistory} />
          </div>

          {/* AI Insight */}
          <GlassCard>
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Insight</h3>
                <p className="text-sm text-foreground-muted">Portfolio analysis</p>
              </div>
            </div>
            
            <p className="text-sm text-foreground-muted leading-relaxed mb-4">
              Your portfolio has grown 41% this year, outperforming the S&P 500 by 12%. 
              Consider rebalancing your tech allocation which is now 45% of your portfolio.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Risk Level</span>
                <span className="font-medium text-warning">Moderate-High</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Diversification</span>
                <span className="font-medium text-success">Good</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">YTD Return</span>
                <span className="font-medium text-success">+41.0%</span>
              </div>
            </div>

            <motion.button 
              onClick={() => setShowRecommendations(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              View Recommendations
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </GlassCard>
        </div>

        {/* Holdings or Allocation View */}
        {selectedView === "holdings" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Holdings</h2>
              <span className="text-sm text-foreground-muted">
                {portfolio.length} assets
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Portfolio Allocation</h2>
              <span className="text-sm text-foreground-muted">
                By asset value
              </span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Allocation Pie Chart */}
              <div className="h-[300px] flex items-center justify-center">
                <div className="relative w-[260px] h-[260px]">
                  {/* SVG Pie Chart */}
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {portfolio.reduce((acc, holding, index) => {
                      const percentage = (holding.value / totalValue) * 100;
                      const previousPercentages = portfolio
                        .slice(0, index)
                        .reduce((sum, h) => sum + (h.value / totalValue) * 100, 0);
                      
                      const colors = [
                        'var(--primary)',
                        'hsl(var(--success))',
                        'hsl(var(--warning))',
                        'hsl(var(--destructive))',
                        'hsl(var(--accent))',
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
                          strokeWidth="20"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedHolding(holding)}
                        />
                      );
                      return acc;
                    }, [] as JSX.Element[])}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-semibold">${(totalValue / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-foreground-muted">Total Value</p>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
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
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                      onClick={() => setSelectedHolding(holding)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                        <div>
                          <p className="font-medium text-sm">{holding.symbol}</p>
                          <p className="text-xs text-foreground-muted">{holding.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{percentage.toFixed(1)}%</p>
                        <p className="text-xs text-foreground-muted">
                          ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Allocation Breakdown */}
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-4">Asset Type Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { type: 'Tech', percentage: 45, color: 'bg-primary' },
                  { type: 'Finance', percentage: 25, color: 'bg-success' },
                  { type: 'Healthcare', percentage: 15, color: 'bg-warning' },
                  { type: 'Other', percentage: 15, color: 'bg-secondary' },
                ].map((sector) => (
                  <div key={sector.type} className="text-center">
                    <div className="h-2 rounded-full bg-secondary mb-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${sector.color}`} 
                        style={{ width: `${sector.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground-muted">{sector.type}</p>
                    <p className="text-sm font-medium">{sector.percentage}%</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Performance Prediction */}
        <GlassCard>
          <h3 className="font-semibold mb-4">12-Month Prediction</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Conservative", value: 68500, change: 8 },
              { label: "Expected", value: 76200, change: 20 },
              { label: "Optimistic", value: 85100, change: 34 },
            ].map((prediction) => (
              <motion.div
                key={prediction.label}
                className="p-4 rounded-xl bg-secondary text-center cursor-pointer hover:bg-secondary/80 transition-colors"
                whileHover={{ scale: 1.02 }}
                onClick={() => toast.info(`${prediction.label} scenario: $${prediction.value.toLocaleString()} projected`)}
              >
                <p className="text-xs text-foreground-muted mb-1">{prediction.label}</p>
                <p className="text-lg font-semibold">${(prediction.value / 1000).toFixed(1)}k</p>
                <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${prediction.change}%` }}
                  />
                </div>
                <p className="text-xs text-success mt-1">+{prediction.change}%</p>
              </motion.div>
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
        <div className="p-6 space-y-4">
          {recommendations.map((rec, index) => {
            const Icon = rec.icon;
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    rec.priority === "high" 
                      ? "bg-destructive/10" 
                      : rec.priority === "medium"
                      ? "bg-warning/10"
                      : "bg-accent/10"
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      rec.priority === "high" 
                        ? "text-destructive" 
                        : rec.priority === "medium"
                        ? "text-warning"
                        : "text-accent"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rec.priority === "high" 
                          ? "bg-destructive/10 text-destructive" 
                          : rec.priority === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-accent/10 text-accent"
                      }`}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-muted mb-2">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-primary font-medium">{rec.impact}</p>
                      <motion.button
                        onClick={() => handleApplyRecommendation(rec)}
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                        whileHover={{ x: 3 }}
                      >
                        Apply
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <motion.button
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium mt-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              toast.success("All recommendations applied!");
              setShowRecommendations(false);
            }}
          >
            Apply All Recommendations
          </motion.button>
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
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Current Value</p>
                <p className="text-3xl font-semibold">
                  ${selectedHolding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                selectedHolding.change >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {selectedHolding.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="font-medium">{selectedHolding.change >= 0 ? "+" : ""}{selectedHolding.change.toFixed(2)}%</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Shares</span>
                <span className="font-medium">{selectedHolding.shares}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Price per Share</span>
                <span className="font-medium">${selectedHolding.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Portfolio %</span>
                <span className="font-medium">{Math.round((selectedHolding.value / totalValue) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-foreground-muted">Day Change</span>
                <span className={`font-medium ${selectedHolding.change >= 0 ? "text-success" : "text-destructive"}`}>
                  {selectedHolding.change >= 0 ? "+" : ""}${((selectedHolding.value * selectedHolding.change) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                className="flex-1 py-3 rounded-xl bg-success/10 text-success font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  toast.success(`Buy order for ${selectedHolding.symbol} created`);
                  setSelectedHolding(null);
                }}
              >
                Buy More
              </motion.button>
              <motion.button
                className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  toast.info(`Sell order for ${selectedHolding.symbol} created`);
                  setSelectedHolding(null);
                }}
              >
                Sell
              </motion.button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
