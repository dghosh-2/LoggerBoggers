"use client";

import { useState } from "react";
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
  const { transactions } = useUserStore();
  const [isGraphExpanded, setIsGraphExpanded] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  const handleNotifications = () => {
    toast.info("No new notifications");
  };

  const handleCalendar = () => {
    toast.info("Calendar view coming soon!");
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-foreground-muted mt-1">
              Your financial overview at a glance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              className="p-2.5 rounded-xl bg-secondary border border-border"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNotifications}
            >
              <Bell className="w-5 h-5 text-foreground-muted" />
            </motion.button>
            <motion.button
              className="p-2.5 rounded-xl bg-secondary border border-border"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCalendar}
            >
              <Calendar className="w-5 h-5 text-foreground-muted" />
            </motion.button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendCard
            title="Total Balance"
            value={47250}
            change={12.5}
            icon={<Wallet className="w-5 h-5 text-primary" />}
            delay={0}
          />
          <TrendCard
            title="Monthly Income"
            value={9500}
            change={5.2}
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            delay={100}
          />
          <TrendCard
            title="Monthly Expenses"
            value={6400}
            change={-3.1}
            icon={<CreditCard className="w-5 h-5 text-destructive" />}
            delay={200}
          />
          <TrendCard
            title="Savings Rate"
            value={32}
            change={8.4}
            prefix=""
            suffix="%"
            icon={<PiggyBank className="w-5 h-5 text-accent" />}
            delay={300}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Financial Graph */}
          <div className="lg:col-span-2">
            <GlassCard delay={400} className="h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Money Flow</h2>
                  <p className="text-sm text-foreground-muted">
                    Interactive financial graph
                  </p>
                </div>
                <motion.button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsGraphExpanded(true)}
                >
                  Expand
                  <ArrowUpRight className="w-4 h-4" />
                </motion.button>
              </div>
              <FinancialGraph />
            </GlassCard>
          </div>

          {/* Quick Stats */}
          <GlassCard delay={500} className="h-[500px]">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <motion.div
                className="p-4 rounded-xl bg-secondary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-sm text-foreground-muted mb-1">Net Worth</p>
                <p className="text-2xl font-semibold">$127,340</p>
                <p className="text-sm text-success">+2.34% this month</p>
              </motion.div>
              <motion.div
                className="p-4 rounded-xl bg-secondary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <p className="text-sm text-foreground-muted mb-1">Investments</p>
                <p className="text-2xl font-semibold">$63,450</p>
                <p className="text-sm text-success">+5.2% this month</p>
              </motion.div>
              <motion.div
                className="p-4 rounded-xl bg-secondary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <p className="text-sm text-foreground-muted mb-1">Savings Goal</p>
                <p className="text-2xl font-semibold">68%</p>
                <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: "68%" }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                  />
                </div>
              </motion.div>
            </div>
          </GlassCard>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashflowChart data={cashflowData} delay={600} />
          <TimelineChart data={spendingData} delay={700} />
        </div>

        {/* Recent Transactions */}
        <GlassCard delay={800}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <motion.button
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              whileHover={{ x: 3 }}
              onClick={() => setIsTransactionsOpen(true)}
            >
              View all
            </motion.button>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                onClick={() => setSelectedTransaction(tx)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? "bg-success/10" : "bg-destructive/10"
                    }`}>
                    {tx.amount > 0 ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.description}</p>
                    <p className="text-xs text-foreground-muted">{tx.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? "text-success" : ""}`}>
                      {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-foreground-muted">{tx.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground-muted" />
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
        <div className="p-6 h-[70vh]">
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
        <div className="p-6 max-h-[60vh] overflow-auto space-y-3">
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
              whileHover={{ x: 4 }}
              onClick={() => {
                setIsTransactionsOpen(false);
                setSelectedTransaction(tx);
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                  {tx.amount > 0 ? (
                    <TrendingUp className="w-5 h-5 text-success" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{tx.description}</p>
                  <p className="text-sm text-foreground-muted">{tx.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${tx.amount > 0 ? "text-success" : ""}`}>
                  {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                </p>
                <p className="text-sm text-foreground-muted">{tx.date}</p>
              </div>
            </motion.div>
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
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selectedTransaction.amount > 0 ? "bg-success/10" : "bg-destructive/10"
                }`}>
                {selectedTransaction.amount > 0 ? (
                  <TrendingUp className="w-7 h-7 text-success" />
                ) : (
                  <CreditCard className="w-7 h-7 text-destructive" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedTransaction.description}</h3>
                <p className="text-foreground-muted">{selectedTransaction.category}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Amount</span>
                <span className={`text-xl font-semibold ${selectedTransaction.amount > 0 ? "text-success" : ""}`}>
                  {selectedTransaction.amount > 0 ? "+" : ""}${Math.abs(selectedTransaction.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Date</span>
                <span className="font-medium">{selectedTransaction.date}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-foreground-muted">Category</span>
                <span className="px-3 py-1 rounded-full bg-secondary text-sm font-medium">
                  {selectedTransaction.category}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-foreground-muted">Type</span>
                <span className={`font-medium ${selectedTransaction.amount > 0 ? "text-success" : "text-destructive"}`}>
                  {selectedTransaction.amount > 0 ? "Income" : "Expense"}
                </span>
              </div>
            </div>

            <motion.button
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                toast.success("Transaction categorized!");
                setSelectedTransaction(null);
              }}
            >
              Edit Category
            </motion.button>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
