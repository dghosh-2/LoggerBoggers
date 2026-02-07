"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  Bell,
  Calendar,
  X,
  ChevronRight
} from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendCard } from "@/components/cards/trend-card";
import { CashflowChart } from "@/components/charts/cashflow-chart";
import { TimelineChart } from "@/components/charts/timeline-chart";
import { FinancialGraph } from "@/components/graph/financial-graph";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { useUserStore } from "@/stores/user-store";
import { useInsightsStore } from "@/stores/insights-store";

const cashflowData = [
  { month: "Jan", income: 8500, expenses: 6200, savings: 2300 },
  { month: "Feb", income: 8500, expenses: 5800, savings: 2700 },
  { month: "Mar", income: 9200, expenses: 6100, savings: 3100 },
  { month: "Apr", income: 8500, expenses: 7200, savings: 1300 },
  { month: "May", income: 9000, expenses: 5900, savings: 3100 },
  { month: "Jun", income: 9500, expenses: 6400, savings: 3100 },
];

const spendingData = [
  { month: "Jan", spending: 6200, budget: 6500 },
  { month: "Feb", spending: 5800, budget: 6500 },
  { month: "Mar", spending: 6100, budget: 6500 },
  { month: "Apr", spending: 7200, budget: 6500 },
  { month: "May", spending: 5900, budget: 6500 },
  { month: "Jun", spending: 6400, budget: 6500 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { transactions } = useUserStore();
  const { setCurrentView } = useInsightsStore();
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  const handleNotifications = () => {
    toast.info("No new notifications");
  };

  const handleCalendar = () => {
    setCurrentView('calendar');
    router.push('/insights');
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-foreground-muted text-sm mt-1">
              Your financial overview
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors duration-100 cursor-pointer"
              onClick={handleNotifications}
            >
              <Bell className="w-4 h-4 text-foreground-muted" />
            </button>
            <button
              className="p-2 rounded-md hover:bg-secondary transition-colors duration-100 cursor-pointer"
              onClick={handleCalendar}
            >
              <Calendar className="w-4 h-4 text-foreground-muted" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendCard
            title="Total Balance"
            value={47250}
            change={12.5}
            icon={<Wallet className="w-4 h-4 text-foreground-muted" />}
            delay={0}
          />
          <TrendCard
            title="Monthly Income"
            value={9500}
            change={5.2}
            icon={<TrendingUp className="w-4 h-4 text-success" />}
            delay={50}
          />
          <TrendCard
            title="Monthly Expenses"
            value={6400}
            change={-3.1}
            icon={<CreditCard className="w-4 h-4 text-destructive" />}
            delay={100}
          />
          <TrendCard
            title="Savings Rate"
            value={32}
            change={8.4}
            prefix=""
            suffix="%"
            icon={<PiggyBank className="w-4 h-4 text-foreground-muted" />}
            delay={150}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Financial Graph */}
          <div className="lg:col-span-2">
            <GlassCard delay={200} className="h-[480px] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-semibold">Money Flow</h2>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    Interactive financial graph
                  </p>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-secondary transition-colors duration-100 cursor-pointer"
                  onClick={() => setIsGraphExpanded(true)}
                >
                  Expand
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 min-h-0 -mx-3 -mb-3">
                <FinancialGraph />
              </div>
            </GlassCard>
          </div>

          {/* Quick Stats */}
          <GlassCard delay={250} className="h-[480px]">
            <h2 className="text-sm font-semibold mb-5">Quick Stats</h2>
            <div className="space-y-4">
              <motion.div
                className="p-4 rounded-md bg-secondary/50 border border-border"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-foreground-muted mb-1.5">Net Worth</p>
                <p className="text-2xl font-semibold tabular-nums font-mono">$127,340</p>
                <p className="text-xs text-success mt-1">+2.34% this month</p>
              </motion.div>
              <motion.div
                className="p-4 rounded-md bg-secondary/50 border border-border"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <p className="text-xs text-foreground-muted mb-1.5">Investments</p>
                <p className="text-2xl font-semibold tabular-nums font-mono">$63,450</p>
                <p className="text-xs text-success mt-1">+5.2% this month</p>
              </motion.div>
              <motion.div
                className="p-4 rounded-md bg-secondary/50 border border-border"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-xs text-foreground-muted mb-1.5">Savings Goal</p>
                <p className="text-2xl font-semibold font-mono">68%</p>
                <div className="mt-2.5 h-1 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-foreground rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "68%" }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  />
                </div>
              </motion.div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CashflowChart data={cashflowData} delay={300} />
          <TimelineChart data={spendingData} delay={350} />
        </div>

        {/* Recent Transactions */}
        <GlassCard delay={400}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold">Recent Transactions</h2>
            <button
              className="text-xs font-medium text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setIsTransactionsOpen(true)}
            >
              View all
            </button>
          </div>
          <div className="space-y-0 divide-y divide-border">
            {transactions.slice(0, 5).map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.03 }}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => setSelectedTransaction(tx)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${tx.amount > 0 ? "bg-success-soft" : "bg-secondary"
                    }`}>
                    {tx.amount > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <CreditCard className="w-3.5 h-3.5 text-foreground-muted" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-foreground-muted">{tx.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-sm font-medium tabular-nums font-mono ${tx.amount > 0 ? "text-success" : ""}`}>
                      {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-foreground-muted">{tx.date}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-foreground-muted" />
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Expanded Graph Modal */}
      <Modal
        isOpen={isGraphExpanded}
        onClose={() => setIsGraphExpanded(false)}
        title="Money Flow"
        subtitle="Drag to pan, hover for details"
        size="full"
      >
        <div className="p-4 h-[75vh]">
          <FinancialGraph />
        </div>
      </Modal>

      {/* All Transactions Modal */}
      <Modal
        isOpen={isTransactionsOpen}
        onClose={() => setIsTransactionsOpen(false)}
        title="All Transactions"
        subtitle={`${transactions.length} total transactions`}
        size="lg"
      >
        <div className="p-6 max-h-[60vh] overflow-auto divide-y divide-border">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-3 cursor-pointer hover:opacity-75 transition-opacity"
              onClick={() => {
                setIsTransactionsOpen(false);
                setSelectedTransaction(tx);
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${tx.amount > 0 ? "bg-success-soft" : "bg-secondary"
                  }`}>
                  {tx.amount > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5 text-foreground-muted" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-foreground-muted">{tx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium tabular-nums font-mono ${tx.amount > 0 ? "text-success" : ""}`}>
                  {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                </p>
                <p className="text-xs text-foreground-muted">{tx.date}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

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
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${selectedTransaction.amount > 0 ? "bg-success-soft" : "bg-secondary"
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
                <span className={`text-lg font-semibold tabular-nums font-mono ${selectedTransaction.amount > 0 ? "text-success" : ""}`}>
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
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-foreground-muted">Type</span>
                <span className={`text-sm font-medium ${selectedTransaction.amount > 0 ? "text-success" : "text-destructive"}`}>
                  {selectedTransaction.amount > 0 ? "Income" : "Expense"}
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
