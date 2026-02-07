"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Building2,
  Wallet,
  PiggyBank,
  LineChart,
  GraduationCap,
  Home,
  Car,
  RefreshCw,
  Plus,
  Link2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Percent,
  Calendar,
  FileSpreadsheet,
  Sparkles,
  ArrowUpRight,
  Shield,
  Target,
  Zap,
  PieChart,
  BarChart3
} from "lucide-react";
import Image from "next/image";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { UploadCard } from "@/components/cards/upload-card";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { HoldingCard } from "@/components/cards/holding-card";
import { useUserStore } from "@/stores/user-store";
import { usePortfolioData } from "@/stores/portfolio-store";
import {
  syncInstitution,
  syncAllInstitutions,
  type PlaidInstitution,
  type PlaidAccount,
  type PlaidInvestmentHolding,
  type PlaidLoan,
  type FinancialSummary
} from "@/lib/plaid";
import { PlaidLinkButton } from "@/components/PlaidLink";

// Generate portfolio history from real data
const generatePortfolioHistory = (netWorth: number) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  
  // Generate a realistic growth pattern ending at current net worth
  const history = [];
  let baseValue = netWorth * 0.85; // Start at 85% of current value
  
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    // Add some variance but trend upward
    const variance = (Math.random() - 0.3) * 0.03; // Slight upward bias
    const growth = 1 + (0.012 * (i + 1)) + variance; // ~1.2% monthly growth
    const value = Math.round(baseValue * growth);
    baseValue = value;
    
    history.push({
      date: months[monthIndex],
      value: i === 11 ? netWorth : value, // Ensure last value is exact
    });
  }
  
  return history;
};

const popularBanks = [
  { id: "chase", name: "Chase", logo: "C", color: "#117ACA", image: "/banks/chase.png" },
  { id: "bofa", name: "Bank of America", logo: "B", color: "#E31837", image: "/banks/bankofamerica.jpeg" },
  { id: "wells", name: "Wells Fargo", logo: "W", color: "#D71E28", image: "/banks/wellsfargo.png" },
  { id: "capital", name: "Capital One", logo: "CO", color: "#D03027", image: "/banks/capitalone.jpg" },
  { id: "fidelity", name: "Fidelity", logo: "F", color: "#4AA74A", image: "/banks/fidelity.jpg" },
  { id: "sofi", name: "SoFi", logo: "S", color: "#00B4D8", image: "/banks/sofi.jpeg" },
];

const bankLogoMap: Record<string, string> = {
  "Chase": "/banks/chase.png",
  "Bank of America": "/banks/bankofamerica.jpeg",
  "Wells Fargo": "/banks/wellsfargo.png",
  "Capital One": "/banks/capitalone.jpg",
  "Fidelity": "/banks/fidelity.jpg",
  "SoFi": "/banks/sofi.jpeg",
};

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

const loanTypeIcons: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  mortgage: Home,
  auto: Car,
  personal: DollarSign,
  other: DollarSign,
};

export default function PortfolioPage() {
  const { holdings } = useUserStore();
  
  // Use cached portfolio data
  const {
    institutions,
    bankAccounts,
    investmentAccounts,
    holdings: plaidHoldings,
    loans,
    summary,
    isLoading,
    fetchData,
    invalidateAndRefetch,
  } = usePortfolioData();
  
  const [syncingInstitutions, setSyncingInstitutions] = useState<Set<string>>(new Set());
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedView, setSelectedView] = useState<"holdings" | "allocation">("holdings");
  const [selectedHolding, setSelectedHolding] = useState<any | null>(null);

  // Portfolio from user store
  const portfolio = holdings.map(h => ({
    id: h.id,
    symbol: h.symbol,
    name: h.name,
    value: h.shares * h.price,
    change: h.changePercent,
    shares: h.shares,
    price: h.price,
  }));
  
  const totalStockValue = portfolio.reduce((sum, h) => sum + h.value, 0);

  // Fetch data on mount (will use cache if available)
  useEffect(() => {
    fetchData();
  }, []);

  // Force refresh data (invalidates cache)
  const loadData = useCallback(async () => {
    await invalidateAndRefetch();
  }, [invalidateAndRefetch]);

  // Alias for loading state
  const loading = isLoading;

  const handleSyncInstitution = async (institutionId: string) => {
    setSyncingInstitutions(prev => new Set([...prev, institutionId]));
    toast.info("Syncing account...");
    
    try {
      await syncInstitution(institutionId);
      await invalidateAndRefetch();
      toast.success("Account synced successfully!");
    } catch (error) {
      toast.error("Failed to sync account");
    } finally {
      setSyncingInstitutions(prev => {
        const next = new Set(prev);
        next.delete(institutionId);
        return next;
      });
    }
  };

  const handleSyncAll = async () => {
    const allIds = institutions.map(i => i.id);
    setSyncingInstitutions(new Set(allIds));
    toast.info("Syncing all accounts...");
    
    try {
      await syncAllInstitutions();
      await invalidateAndRefetch();
      toast.success("All accounts synced!");
    } catch (error) {
      toast.error("Failed to sync accounts");
    } finally {
      setSyncingInstitutions(new Set());
    }
  };

  const handleBankConnect = (bankName: string) => {
    toast.info(`Connecting to ${bankName}...`);
    setShowAddAccount(false);
    
    // In production, this would open Plaid Link
    setTimeout(() => {
      toast.success(`${bankName} connected successfully!`);
      invalidateAndRefetch();
    }, 1500);
  };

  const handleApplyRecommendation = (rec: typeof recommendations[0]) => {
    toast.success(`${rec.title} applied to your portfolio`);
  };

  const totalChange = portfolio.reduce((sum, h) => sum + (h.value * h.change / 100), 0);
  const percentageChange = totalStockValue > 0 ? (totalChange / (totalStockValue - totalChange)) * 100 : 0;
  const isPositive = percentageChange >= 0;

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary/50 animate-pulse" />
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: CONNECTED ACCOUNTS (IMPORTS)
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Connected Accounts</h2>
              <p className="text-[11px] text-foreground-muted">
                {institutions.length} institution{institutions.length !== 1 ? 's' : ''} connected via Plaid
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton 
                variant="secondary" 
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingInstitutions.size > 0}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingInstitutions.size > 0 ? "animate-spin" : ""}`} />
                Sync All
              </GlassButton>
              <PlaidLinkButton 
                onSuccess={() => {
                  invalidateAndRefetch();
                }}
                buttonText="Add Account"
              />
            </div>
          </div>

          <div className="space-y-2">
            {institutions.length === 0 ? (
              <GlassCard>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="p-3 rounded-full bg-secondary mb-3">
                    <Link2 className="w-6 h-6 text-foreground-muted" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">No Accounts Connected</h3>
                  <p className="text-xs text-foreground-muted text-center mb-4 max-w-[300px]">
                    Connect your bank accounts via Plaid to see your financial data
                  </p>
                  <PlaidLinkButton 
                    onSuccess={() => {
                      invalidateAndRefetch();
                    }}
                    buttonText="Connect Account"
                    buttonVariant="primary"
                  />
                </div>
              </GlassCard>
            ) : institutions.map((institution) => {
              const isSyncing = syncingInstitutions.has(institution.id);
              const accountCount = institution.accounts.length;
              const totalBalance = institution.accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
              
              return (
                <GlassCard key={institution.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {bankLogoMap[institution.name] ? (
                        <Image src={bankLogoMap[institution.name]} alt={institution.name} width={36} height={36} className="rounded-lg object-contain shrink-0" />
                      ) : (
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: institution.primaryColor || '#6366f1' }}
                        >
                          {institution.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold">{institution.name}</h3>
                        <p className="text-[11px] text-foreground-muted">
                          {accountCount} account{accountCount !== 1 ? 's' : ''} · Last synced {institution.lastSync}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`flex items-center gap-1 ${
                          institution.status === 'connected' ? 'text-success' : 'text-destructive'
                        }`}>
                          {institution.status === 'connected' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span className="text-[11px] font-medium capitalize">{institution.status}</span>
                        </div>
                        <p className="text-xs font-medium tabular-nums">
                          ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => handleSyncInstitution(institution.id)}
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors duration-150 cursor-pointer"
                        disabled={isSyncing}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-foreground-muted ${isSyncing ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: NET WORTH SUMMARY
        ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-foreground-muted mb-1 uppercase tracking-wider">Total Net Worth</p>
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl font-semibold tabular-nums">
                  ${summary?.netWorth.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </h1>
                {(summary?.netWorth ?? 0) > 0 && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    isPositive ? "text-success" : "text-destructive"
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="tabular-nums">{isPositive ? '+' : ''}{percentageChange.toFixed(2)}%</span>
                  </div>
                )}
              </div>
              {(summary?.netWorth ?? 0) > 0 && (
                <p className="text-[11px] text-foreground-muted mt-1">
                  {totalChange >= 0 ? '+' : ''}${Math.abs(totalChange).toLocaleString(undefined, { maximumFractionDigits: 0 })} this month
                </p>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wallet className="w-4 h-4 text-success" />
                  <span className="text-[11px] font-medium text-success">Cash</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  ${summary?.totalCash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-foreground-muted">
                  {summary?.bankAccountsCount} account{summary?.bankAccountsCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-primary/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <LineChart className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-medium text-primary">Investments</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  ${summary?.totalInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-foreground-muted">
                  {summary?.investmentAccountsCount} account{summary?.investmentAccountsCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <PiggyBank className="w-4 h-4 text-destructive" />
                  <span className="text-[11px] font-medium text-destructive">Loans</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  -${summary?.totalLoans.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-foreground-muted">
                  {summary?.loansCount} loan{summary?.loansCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: NET WORTH CHART + AI INSIGHT
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PortfolioChart data={summary?.netWorth ? generatePortfolioHistory(summary.netWorth) : []} />
          </div>

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
            
            {summary && (summary.netWorth ?? 0) > 0 ? (
              <>
                <p className="text-xs text-foreground-muted leading-relaxed mb-4">
                  {summary.totalCash > 0 && summary.bankAccountsCount > 0
                    ? `You have $${summary.totalCash.toLocaleString()} in cash across ${summary.bankAccountsCount} account${summary.bankAccountsCount !== 1 ? 's' : ''}. `
                    : ''}
                  {summary.totalInvestments > 0
                    ? `Your investments total $${summary.totalInvestments.toLocaleString()}. `
                    : ''}
                  {summary.totalLoans > 0
                    ? `You have $${summary.totalLoans.toLocaleString()} in outstanding loans.`
                    : 'You have no outstanding loans - great job!'}
                </p>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">Risk Level</span>
                    <span className={`font-medium ${summary.totalLoans > summary.totalCash ? 'text-destructive' : summary.totalLoans > 0 ? 'text-warning' : 'text-success'}`}>
                      {summary.totalLoans > summary.totalCash ? 'High' : summary.totalLoans > 0 ? 'Moderate' : 'Low'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">Diversification</span>
                    <span className={`font-medium ${summary.investmentAccountsCount > 1 ? 'text-success' : summary.investmentAccountsCount === 1 ? 'text-warning' : 'text-foreground-muted'}`}>
                      {summary.investmentAccountsCount > 1 ? 'Good' : summary.investmentAccountsCount === 1 ? 'Fair' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">Debt-to-Asset</span>
                    <span className={`font-medium tabular-nums ${
                      summary.netWorth > 0 
                        ? (summary.totalLoans / (summary.totalCash + summary.totalInvestments)) * 100 < 20 
                          ? 'text-success' 
                          : 'text-warning'
                        : 'text-foreground-muted'
                    }`}>
                      {summary.totalCash + summary.totalInvestments > 0 
                        ? `${((summary.totalLoans / (summary.totalCash + summary.totalInvestments)) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowRecommendations(true)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-background-tertiary transition-colors duration-150 cursor-pointer"
                >
                  View Recommendations
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-foreground-muted mb-3">
                  Connect your accounts to see AI-powered insights about your portfolio.
                </p>
                <PlaidLinkButton 
                  onSuccess={() => {
                    invalidateAndRefetch();
                  }}
                  buttonText="Connect Account"
                  buttonVariant="primary"
                  buttonSize="sm"
                />
              </div>
            )}
          </GlassCard>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: BANK ACCOUNTS
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-foreground-muted" />
            <h2 className="text-sm font-semibold">Bank Accounts</h2>
          </div>

          <div className="space-y-2">
            {bankAccounts.map((account) => (
              <GlassCard key={account.id} interactive>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                      {account.subtype === 'checking' ? (
                        <Wallet className="w-4 h-4 text-success" />
                      ) : (
                        <PiggyBank className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{account.name}</h3>
                      <p className="text-[11px] text-foreground-muted">
                        {account.institution} · ••••{account.mask}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-semibold tabular-nums">
                      ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    {account.availableBalance !== null && account.availableBalance !== account.currentBalance && (
                      <p className="text-[10px] text-foreground-muted tabular-nums">
                        ${account.availableBalance.toLocaleString()} available
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5: INVESTMENT ACCOUNTS & HOLDINGS
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="w-4 h-4 text-foreground-muted" />
            <h2 className="text-sm font-semibold">Investment Accounts</h2>
          </div>

          <div className="space-y-3">
            {investmentAccounts.map((account) => {
              const accountHoldings = plaidHoldings.filter(h => h.accountId === account.id);
              
              return (
                <GlassCard key={account.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <LineChart className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{account.name}</h3>
                        <p className="text-[11px] text-foreground-muted">
                          {account.institution} · {account.subtype.toUpperCase()} · ••••{account.mask}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-semibold tabular-nums">
                        ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Holdings */}
                  {accountHoldings.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] font-medium text-foreground-muted mb-2">Holdings</p>
                      <div className="space-y-1.5">
                        {accountHoldings.map((holding) => (
                          <div 
                            key={holding.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors duration-150"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-md bg-card flex items-center justify-center font-semibold text-[11px]">
                                {holding.symbol.slice(0, 3)}
                              </div>
                              <div>
                                <p className="font-medium text-xs">{holding.symbol}</p>
                                <p className="text-[10px] text-foreground-muted tabular-nums">{holding.quantity} shares @ ${holding.price.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-xs tabular-nums">
                                ${holding.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                              {holding.gainLossPercent !== null && (
                                <p className={`text-[10px] tabular-nums ${holding.gainLossPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6: LOANS
        ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-4 h-4 text-foreground-muted" />
            <h2 className="text-sm font-semibold">Loans</h2>
          </div>

          <div className="space-y-2">
            {loans.map((loan) => {
              const LoanIcon = loanTypeIcons[loan.type] || DollarSign;
              const paidOff = loan.originalPrincipal - loan.currentBalance;
              const paidOffPercent = (paidOff / loan.originalPrincipal) * 100;
              
              return (
                <GlassCard key={loan.id}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <LoanIcon className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{loan.name}</h3>
                        <p className="text-[11px] text-foreground-muted">
                          {loan.institution} · {loan.type.charAt(0).toUpperCase() + loan.type.slice(1)} Loan
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-semibold text-destructive tabular-nums">
                        -${loan.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-foreground-muted tabular-nums">
                        of ${loan.originalPrincipal.toLocaleString()} original
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] text-foreground-muted mb-1">
                      <span>{paidOffPercent.toFixed(1)}% paid off</span>
                      <span className="tabular-nums">${paidOff.toLocaleString()} paid</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full transition-all duration-500"
                        style={{ width: `${paidOffPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-3 h-3 text-foreground-muted" />
                      <div>
                        <p className="text-[10px] text-foreground-muted">Interest Rate</p>
                        <p className="text-xs font-medium tabular-nums">{loan.interestRate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-foreground-muted" />
                      <div>
                        <p className="text-[10px] text-foreground-muted">Min Payment</p>
                        <p className="text-xs font-medium tabular-nums">${loan.minimumPayment}/mo</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-foreground-muted" />
                      <div>
                        <p className="text-[10px] text-foreground-muted">Next Due</p>
                        <p className="text-xs font-medium">
                          {loan.nextPaymentDueDate 
                            ? new Date(loan.nextPaymentDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}

            {loans.length === 0 && (
              <GlassCard>
                <div className="text-center py-6">
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                  <h3 className="text-sm font-semibold mb-1">No Outstanding Loans</h3>
                  <p className="text-[11px] text-foreground-muted">You're debt-free! Keep up the great work.</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7: STOCK HOLDINGS (from user store)
        ═══════════════════════════════════════════════════════════════════ */}
        {portfolio.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-foreground-muted" />
                <h2 className="text-sm font-semibold">Stock Holdings</h2>
              </div>
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

            {selectedView === "holdings" ? (
              <div className="space-y-2">
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
                      percentage={Math.round((holding.value / totalStockValue) * 100)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <GlassCard>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className="h-[240px] flex items-center justify-center">
                    <div className="relative w-[200px] h-[200px]">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {portfolio.reduce((acc, holding, index) => {
                          const percentage = (holding.value / totalStockValue) * 100;
                          const previousPercentages = portfolio
                            .slice(0, index)
                            .reduce((sum, h) => sum + (h.value / totalStockValue) * 100, 0);
                          
                          const colors = [
                            'var(--primary)',
                            'var(--success)',
                            'var(--warning)',
                            'var(--destructive)',
                            '#8b5cf6',
                            '#ec4899',
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
                        <p className="text-lg font-semibold tabular-nums">${(totalStockValue / 1000).toFixed(1)}k</p>
                        <p className="text-[10px] text-foreground-muted">Total Value</p>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1.5">
                    {portfolio.map((holding, index) => {
                      const percentage = (holding.value / totalStockValue) * 100;
                      const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-destructive', 'bg-violet-500', 'bg-pink-500'];
                      
                      return (
                        <motion.div
                          key={holding.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors duration-150"
                          onClick={() => setSelectedHolding(holding)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`} />
                            <div>
                              <p className="font-medium text-xs">{holding.symbol}</p>
                              <p className="text-[10px] text-foreground-muted">{holding.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-xs tabular-nums">{percentage.toFixed(1)}%</p>
                            <p className="text-[10px] text-foreground-muted tabular-nums">
                              ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        )}


      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ADD ACCOUNT (PLAID LINK)
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Connect Account"
        subtitle="Link your bank or financial institution via Plaid"
        size="md"
      >
        <div className="p-5 space-y-5">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Powered by Plaid</span>
            </div>
            <p className="text-[11px] text-foreground-muted">
              Securely connect to 10,000+ financial institutions. Your credentials are never stored on our servers.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
              <h4 className="text-sm font-medium mb-1">Connect Your Accounts</h4>
              <p className="text-xs text-foreground-muted">
                Click below to securely link your bank, investment, or loan accounts
              </p>
            </div>
            
            <PlaidLinkButton 
              onSuccess={() => {
                setShowAddAccount(false);
                invalidateAndRefetch();
              }}
              onExit={() => {}}
              buttonText="Connect with Plaid"
              buttonSize="md"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-card px-2 text-foreground-muted">supported institutions</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {popularBanks.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
              >
                <Image src={bank.image} alt={bank.name} width={24} height={24} className="rounded-md object-contain shrink-0" />
                <span className="font-medium text-[10px] truncate">{bank.name}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-foreground-muted text-center">
            We use bank-level 256-bit encryption to keep your data safe.
          </p>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: AI RECOMMENDATIONS
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        title="AI Recommendations"
        subtitle="Personalized suggestions to optimize your finances"
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

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: HOLDING DETAILS
      ═══════════════════════════════════════════════════════════════════ */}
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
                <span className="text-sm font-medium tabular-nums">{Math.round((selectedHolding.value / totalStockValue) * 100)}%</span>
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
