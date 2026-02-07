"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Bell,
  Calendar,
  ChevronRight,
  Link2,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useInsightsStore } from "@/stores/insights-store";
import { GlassButton } from "@/components/ui/glass-button";
import { DogLoadingAnimation } from "@/components/ui/DogLoadingAnimation";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useStockHoldingsStore } from "@/stores/stock-holdings-store";

interface DisplayTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface TopHolding {
  symbol: string;
  name: string;
  value: number;
  dayChangePercent: number | null;
  dayPnlApprox: number | null;
}

interface PortfolioTotals {
  totalValue: number;
  dayChangeValue: number | null;
  dayChangePercent: number | null;
}

interface HoldingsWidgetResponse {
  portfolio: PortfolioTotals;
  movers: TopHolding[];
  coverage?: {
    quotedValue: number;
    totalValue: number;
    quotedHoldings: number;
    totalHoldings: number;
  };
}

const CATEGORY_PALETTE = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
  "var(--foreground-secondary)",
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { setCurrentView } = useInsightsStore();
  const [selectedTransaction, setSelectedTransaction] = useState<DisplayTransaction | null>(null);
  const [portfolioTotals, setPortfolioTotals] = useState<PortfolioTotals>({ totalValue: 0, dayChangeValue: null, dayChangePercent: null });
  const [topMovers, setTopMovers] = useState<TopHolding[]>([]);
  const [holdingsCoverage, setHoldingsCoverage] = useState<HoldingsWidgetResponse['coverage']>(undefined);
  const [topHoldingsLoading, setTopHoldingsLoading] = useState(false);
  const manualStockValue = useStockHoldingsStore((s) => s.getTotalValue());
  
  // Use the financial data hook for consistent data fetching and caching
  const { summary, loading, refetch } = useFinancialData();

  const transactions: DisplayTransaction[] = (summary?.recent_transactions || []).map((tx, index) => ({
    id: `tx-${index}`,
    description: tx.name,
    amount: -tx.amount,
    category: tx.category,
    date: new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const handleNotifications = () => {
    toast.info("No new notifications");
  };

  const handleCalendar = () => {
    setCurrentView('calendar');
    router.push('/insights');
  };

  // Prepare chart data
  const incomeVsSpendingData = summary?.monthly_trend?.map(item => ({
    month: item.month,
    Income: item.income,
    Spending: item.spending,
  })) || [];

  // Dashboard net worth is computed server-side in /api/data/summary from:
  // (depository + investment accounts + holdings) - (credit + loan liabilities).
  const displayNetWorth = Number(summary?.net_worth || 0) + (manualStockValue || 0);

  const netWorthTrendData = useMemo(() => {
    const trend = summary?.monthly_trend || [];
    if (!trend.length) return [];

    // Approximate net worth over time using monthly savings deltas.
    // We don't store historical balance snapshots, so this is a derived series.
    const savings = trend.map((m) => Number(m.income || 0) - Number(m.spending || 0));
    const totalSavings = savings.reduce((sum, v) => sum + v, 0);
    const currentNetWorth = Number(displayNetWorth || 0);
    const startingNetWorth = currentNetWorth - totalSavings;

    let running = startingNetWorth;
    return trend.map((m, i) => {
      running += savings[i] || 0;
      return { month: m.month, netWorth: Math.round(running * 100) / 100 };
    });
  }, [summary?.monthly_trend, displayNetWorth]);

  const categoryData = Object.entries(summary?.spending_by_category || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], idx) => ({
      name,
      value,
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }));

  useEffect(() => {
    if (!summary?.is_connected) return;

    let cancelled = false;
    const run = async () => {
      setTopHoldingsLoading(true);
      try {
        const res = await fetch('/api/data/top-holdings?movers=4&quoteMax=30');
        const data = (await res.json()) as HoldingsWidgetResponse;
        if (cancelled) return;
        setPortfolioTotals(data?.portfolio ?? { totalValue: 0, dayChangeValue: null, dayChangePercent: null });
        setTopMovers((data?.movers || []) as TopHolding[]);
        setHoldingsCoverage(data?.coverage);
      } catch (e) {
        if (!cancelled) {
          setPortfolioTotals({ totalValue: 0, dayChangeValue: null, dayChangePercent: null });
          setTopMovers([]);
          setHoldingsCoverage(undefined);
        }
      } finally {
        if (!cancelled) setTopHoldingsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [summary?.is_connected]);

  // Show loading state
  if (loading) {
    return (
      <PageTransition className="h-full min-h-0">
        <div className="flex h-full min-h-0 flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-foreground-muted text-sm mt-1">Your financial overview</p>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex items-center">
            <DogLoadingAnimation
              message="Loading your financial dashboard..."
              size="xl"
              className="w-screen relative left-1/2 -translate-x-1/2 justify-center"
              trackClassName="h-56 md:h-64 rounded-none bg-secondary/15 border-y border-border/60"
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Not connected state
  if (!summary?.is_connected) {
    return (
      <PageTransition className="h-full min-h-0">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-foreground-muted text-sm mt-1">Your financial overview</p>
            </div>
          </div>
          <GlassCard className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-secondary mb-4">
                <Link2 className="w-8 h-8 text-foreground-muted" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Your Accounts</h3>
              <p className="text-sm text-foreground-muted mb-6 max-w-sm">
                Link your bank accounts to see your financial data and insights
              </p>
              <GlassButton variant="primary" onClick={() => router.push('/imports')}>
                Connect via Plaid
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-xs font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground-muted">{entry.name}:</span>
            <span className="font-semibold font-mono">${entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageTransition className="h-full min-h-0">
      <div className="flex flex-col gap-3 md:gap-4 h-full min-h-0 pb-6 md:pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-foreground-muted text-xs md:text-sm mt-0.5 md:mt-1">Your financial overview</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              onClick={handleNotifications}
            >
              <Bell className="w-4 h-4 text-foreground-muted" />
            </button>
            <button
              className="p-1.5 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              onClick={handleCalendar}
            >
              <Calendar className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Main Charts Grid - 2x2 - Single-screen (no page scroll) */}
        <div className="grid flex-1 min-h-0 grid-cols-2 grid-rows-2 gap-3 md:gap-4">
          
          {/* Net Worth (12-month trend) */}
          <GlassCard delay={100} className="relative overflow-hidden p-3 md:p-6 h-full flex flex-col min-h-0">
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-foreground-muted">Net Worth</div>
                <div className={`mt-0.5 text-2xl md:text-4xl font-bold tracking-tight font-mono ${displayNetWorth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${displayNetWorth.toLocaleString()}
                </div>
                {netWorthTrendData.length >= 2 ? (
                  (() => {
                    const first = Number(netWorthTrendData[0].netWorth || 0);
                    const last = Number(netWorthTrendData[netWorthTrendData.length - 1].netWorth || 0);
                    const delta = last - first;
                    const pct = first !== 0 ? (delta / Math.abs(first)) * 100 : null;
                    const up = delta >= 0;
                    return (
                      <div className="mt-1 flex items-center gap-2">
                        <span className={up ? "text-success text-[10px] md:text-xs font-mono" : "text-destructive text-[10px] md:text-xs font-mono"}>
                          {up ? "+" : "-"}${Math.abs(delta).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        {typeof pct === 'number' ? (
                          <span className="text-[10px] md:text-xs text-foreground-muted font-mono">
                            ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}% / 12mo)
                          </span>
                        ) : null}
                      </div>
                    );
                  })()
                ) : (
                  <div className="mt-1 text-[10px] md:text-xs text-foreground-muted">Past 12 months</div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2 pt-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="text-xs text-foreground-muted">12 month trend</div>
              </div>
            </div>

            <div className="relative mt-2 md:mt-3 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthTrendData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
                      <stop offset="85%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 9 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 9 }}
                    tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net Worth"
                    stroke="var(--primary)"
                    strokeWidth={1.75}
                    fill="url(#nwGradient)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Top Holdings (Daily Performance) */}
          <GlassCard delay={150} className="p-3 md:p-6 h-full flex flex-col min-h-0">
            <div className="flex items-start justify-between gap-3 mb-2 md:mb-3">
              <div>
                <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-foreground-muted">Top Holdings</div>
                <div className="text-[10px] md:text-xs text-foreground-muted mt-0.5">Today&apos;s move</div>
              </div>

              <div className="text-right">
                <button
                  className="text-[11px] md:text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1"
                  onClick={() => router.push('/portfolio')}
                >
                  Portfolio
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="rounded-md bg-secondary/20 border border-border/60 p-3">
              <div className="text-[10px] md:text-xs text-foreground-muted">Stock Portfolio</div>
              <div className="mt-0.5 flex items-end justify-between gap-3">
                <div className="text-lg md:text-2xl font-semibold font-mono">
                  ${Number(portfolioTotals.totalValue || 0).toLocaleString()}
                </div>
                <div className="text-right">
                  {typeof portfolioTotals.dayChangePercent === 'number' && typeof portfolioTotals.dayChangeValue === 'number' ? (
                    (() => {
                      const pct = portfolioTotals.dayChangePercent;
                      const chg = portfolioTotals.dayChangeValue;
                      const isUp = pct >= 0;
                      return (
                        <>
                          <div className={`text-sm md:text-base font-semibold font-mono ${isUp ? 'text-success' : 'text-destructive'}`}>
                            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                          </div>
                          <div className={`text-[10px] md:text-xs font-mono ${isUp ? 'text-success' : 'text-destructive'}`}>
                            {chg >= 0 ? '+' : '-'}${Math.abs(chg).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-[10px] md:text-xs text-foreground-muted">--</div>
                  )}
                </div>
              </div>
              {holdingsCoverage && holdingsCoverage.totalValue > 0 && holdingsCoverage.quotedValue > 0 && holdingsCoverage.quotedValue < holdingsCoverage.totalValue ? (
                <div className="mt-1 text-[10px] text-foreground-muted">
                  Based on quotes for ~{Math.round((holdingsCoverage.quotedValue / holdingsCoverage.totalValue) * 100)}% of portfolio value
                </div>
              ) : null}
            </div>

            <div className="mt-2 md:mt-3 flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] md:text-xs font-medium text-foreground-muted">Top Movers (Today)</div>
              </div>
              <div className="space-y-1.5">
                {topHoldingsLoading ? (
                  <div className="text-xs text-foreground-muted">Loading holdings...</div>
                ) : topMovers.length === 0 ? (
                  <div className="text-xs text-foreground-muted">No movers available.</div>
                ) : (
                  topMovers.slice(0, 4).map((h, idx) => {
                    const pct = h.dayChangePercent;
                    const pnl = h.dayPnlApprox;
                    const isUp = typeof pct === 'number' ? pct >= 0 : null;
                    return (
                      <motion.div
                        key={`${h.symbol}-${idx}`}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + idx * 0.05 }}
                        className="flex items-center justify-between gap-3 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs md:text-sm font-semibold font-mono">{h.symbol}</span>
                            <span className="text-[10px] md:text-xs text-foreground-muted truncate">
                              {h.name || h.symbol}
                            </span>
                          </div>
                          <div className="text-[10px] md:text-xs text-foreground-muted font-mono">
                            ${Number(h.value || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {typeof pct === 'number' ? (
                            <>
                              <div className={`text-xs md:text-sm font-semibold font-mono ${isUp ? 'text-success' : 'text-destructive'}`}>
                                {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                              </div>
                              <div className={`text-[10px] md:text-xs font-mono ${isUp ? 'text-success' : 'text-destructive'}`}>
                                {typeof pnl === 'number' ? `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '--'}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] md:text-xs text-foreground-muted">--</div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

          </GlassCard>

          {/* Category Breakdown */}
          <GlassCard delay={200} className="p-3 md:p-6 h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div>
                <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-foreground-muted">Spending by Category</div>
                <p className="text-[10px] md:text-xs text-foreground-muted mt-0.5">This month</p>
              </div>
              <span className="text-lg md:text-2xl font-bold font-mono tabular-nums">
                ${summary.monthly_spending.toLocaleString()}
              </span>
            </div>
            <div className="flex-1 min-h-0 flex items-center gap-3 md:gap-6">
              <div className="w-[200px] h-[200px] md:w-[340px] md:h-[340px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg shadow-lg p-2">
                            <p className="text-xs font-medium">{data.name}</p>
                            <p className="text-xs font-mono">${data.value.toLocaleString()}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-1.5 md:space-y-2">
                {categoryData.map((cat, index) => (
                  <motion.div
                    key={cat.name}
                    className="flex items-center justify-between gap-3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                      <span className="text-[10px] md:text-sm text-foreground-muted truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-[10px] md:text-sm font-mono font-medium tabular-nums shrink-0">
                      ${cat.value.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Recent Transactions */}
          <GlassCard delay={250} className="p-3 md:p-6 h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div>
                <div className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-foreground-muted">Recent Transactions</div>
                <p className="text-[10px] md:text-xs text-foreground-muted mt-0.5">{transactions.length} transactions</p>
              </div>
              <button
                className="text-[11px] md:text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                onClick={handleCalendar}
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
              {transactions.slice(0, 6).map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.03 }}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      tx.amount > 0 ? "bg-success/20" : "bg-secondary"
                    }`}>
                      {tx.amount > 0 ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-foreground-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium truncate max-w-[180px] md:max-w-[260px]">{tx.description}</p>
                      <p className="text-[10px] md:text-xs text-foreground-muted">{tx.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      <p className={`text-xs md:text-sm font-mono font-medium ${tx.amount > 0 ? "text-success" : ""}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-[10px] md:text-xs text-foreground-muted">{tx.date}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Modal
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        title="Transaction Details"
        size="sm"
      >
        {selectedTransaction && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                selectedTransaction.amount > 0 ? "bg-success/20" : "bg-secondary"
              }`}>
                {selectedTransaction.amount > 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <CreditCard className="w-5 h-5 text-foreground-muted" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{selectedTransaction.description}</h3>
                <p className="text-xs text-foreground-muted">{selectedTransaction.category}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-foreground-muted">Amount</span>
                <span className={`text-lg font-semibold font-mono ${
                  selectedTransaction.amount > 0 ? "text-success" : ""
                }`}>
                  {selectedTransaction.amount > 0 ? "+" : ""}${Math.abs(selectedTransaction.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-foreground-muted">Date</span>
                <span className="text-sm font-medium">{selectedTransaction.date}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-foreground-muted">Category</span>
                <span className="px-2 py-0.5 rounded-md bg-secondary text-xs font-medium">
                  {selectedTransaction.category}
                </span>
              </div>
            </div>

            <button
              className="w-full py-2.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-85 transition-opacity cursor-pointer"
              onClick={() => {
                toast.success("Transaction categorized!");
                setSelectedTransaction(null);
              }}
            >
              Edit Category
            </button>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
