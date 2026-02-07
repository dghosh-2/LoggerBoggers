"use client";

import { useState, useEffect } from "react";
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

interface FinancialSummary {
  is_connected: boolean;
  total_spending: number;
  total_income: number;
  net_worth: number;
  monthly_spending: number;
  monthly_income: number;
  spending_by_category: Record<string, number>;
  recent_transactions: Array<{ name: string; amount: number; category: string; date: string }>;
  monthly_trend: Array<{ month: string; spending: number; income: number }>;
}

interface DisplayTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Shopping': '#8B5CF6',
  'Food & Drink': '#F59E0B',
  'Bills & Utilities': '#3B82F6',
  'Transportation': '#10B981',
  'Health & Fitness': '#EC4899',
  'Entertainment': '#6366F1',
  'Personal Care': '#14B8A6',
  'Travel': '#F97316',
  'Education': '#A855F7',
  'Other': '#6B7280',
};

export default function DashboardPage() {
  const router = useRouter();
  const { setCurrentView } = useInsightsStore();
  const [selectedTransaction, setSelectedTransaction] = useState<DisplayTransaction | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const transactions: DisplayTransaction[] = (summary?.recent_transactions || []).map((tx, index) => ({
    id: `tx-${index}`,
    description: tx.name,
    amount: -tx.amount,
    category: tx.category,
    date: new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const categoryData = Object.entries(summary?.spending_by_category || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#6B7280',
    }));

  const savingsData = summary?.monthly_trend?.map(item => ({
    month: item.month,
    savings: item.income - item.spending,
  })) || [];

  // Show loading state
  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-foreground-muted text-sm mt-1">Your financial overview</p>
            </div>
          </div>
          <GlassCard>
            <DogLoadingAnimation message="Loading your financial dashboard..." size="lg" />
          </GlassCard>
        </div>
      </PageTransition>
    );
  }

  // Not connected state
  if (!summary?.is_connected) {
    return (
      <PageTransition>
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
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-foreground-muted text-sm mt-1">Your financial overview</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              onClick={handleNotifications}
            >
              <Bell className="w-4 h-4 text-foreground-muted" />
            </button>
            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer"
              onClick={handleCalendar}
            >
              <Calendar className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Main Charts Grid - 2x2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Income vs Spending Line Chart */}
          <GlassCard delay={100}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Income vs Spending</h2>
                <p className="text-xs text-foreground-muted mt-0.5">12-month trend</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-foreground-muted">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-foreground-muted">Spending</span>
                </div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeVsSpendingData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="Income" 
                    stroke="var(--success)" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Spending" 
                    stroke="var(--destructive)" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Bottom stats */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
                <div className="w-2 h-2 rounded-full bg-success" />
                <div>
                  <p className="text-xs text-foreground-muted">Monthly Income</p>
                  <p className="text-sm font-semibold font-mono text-success">
                    ${summary.monthly_income.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <div>
                  <p className="text-xs text-foreground-muted">Monthly Spending</p>
                  <p className="text-sm font-semibold font-mono text-destructive">
                    ${summary.monthly_spending.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Savings Trend Area Chart */}
          <GlassCard delay={150}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Monthly Savings</h2>
                <p className="text-xs text-foreground-muted mt-0.5">Net savings over time</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-foreground-muted">Net Worth</p>
                <p className={`text-lg font-bold font-mono ${summary.net_worth >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${summary.net_worth.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={savingsData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="savings" 
                    name="Savings"
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    fill="url(#savingsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Savings rate */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-foreground-muted">Savings Rate</span>
                <span className="text-xs font-semibold">
                  {summary.monthly_income > 0 
                    ? Math.round(((summary.monthly_income - summary.monthly_spending) / summary.monthly_income) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${Math.min(100, Math.max(0, summary.monthly_income > 0 
                      ? ((summary.monthly_income - summary.monthly_spending) / summary.monthly_income) * 100 
                      : 0))}%` 
                  }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Category Breakdown */}
          <GlassCard delay={200}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Spending by Category</h2>
                <p className="text-xs text-foreground-muted mt-0.5">This month's breakdown</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Pie Chart */}
              <div className="w-[160px] h-[160px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
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
              {/* Legend */}
              <div className="flex-1 space-y-2">
                {categoryData.map((cat, index) => (
                  <motion.div
                    key={cat.name}
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-foreground-muted">{cat.name}</span>
                    </div>
                    <span className="text-xs font-mono font-medium">${cat.value.toLocaleString()}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-foreground-muted">Total Spending</span>
              <span className="text-sm font-bold font-mono">${summary.monthly_spending.toLocaleString()}</span>
            </div>
          </GlassCard>

          {/* Recent Transactions */}
          <GlassCard delay={250}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Recent Transactions</h2>
                <p className="text-xs text-foreground-muted mt-0.5">{transactions.length} transactions</p>
              </div>
              <button
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer flex items-center gap-1"
                onClick={() => router.push('/receipts')}
              >
                View all
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {transactions.slice(0, 6).map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                      tx.amount > 0 ? "bg-success/20" : "bg-secondary"
                    }`}>
                      {tx.amount > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-foreground-muted" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-[10px] text-foreground-muted">{tx.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-sm font-mono font-medium ${tx.amount > 0 ? "text-success" : ""}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-foreground-muted">{tx.date}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
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
