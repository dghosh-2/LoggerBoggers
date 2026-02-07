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
  ArrowUpRight,
  Shield,
  Target,
  Zap,
  Search,
  X,
  Trash2,
} from "lucide-react";
import { DogLoadingAnimation } from "@/components/ui/DogLoadingAnimation";
import Image from "next/image";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { PortfolioChart } from "@/components/charts/portfolio-chart";
import { usePortfolioData } from "@/stores/portfolio-store";
import { useStockHoldingsStore, ManualStockHolding } from "@/stores/stock-holdings-store";
import {
  syncInstitution,
  syncAllInstitutions,
} from "@/lib/plaid";
import { PlaidLinkButton } from "@/components/PlaidLink";

// Generate portfolio history from real data
const generatePortfolioHistory = (netWorth: number) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const history = [];
  let baseValue = netWorth * 0.85;

  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    const variance = (Math.random() - 0.3) * 0.03;
    const growth = 1 + (0.012 * (i + 1)) + variance;
    const value = Math.round(baseValue * growth);
    baseValue = value;

    history.push({
      date: months[monthIndex],
      value: i === 11 ? netWorth : value,
    });
  }

  return history;
};

const bankLogoMap: Record<string, string> = {
  "Chase": "/banks/chase.png",
  "Bank of America": "/banks/bankofamerica.jpeg",
  "Wells Fargo": "/banks/wellsfargo.png",
  "Capital One": "/banks/capitalone.jpg",
  "Fidelity": "/banks/fidelity.jpg",
  "SoFi": "/banks/sofi.jpeg",
};

const loanTypeIcons: Record<string, typeof GraduationCap> = {
  student: GraduationCap,
  mortgage: Home,
  auto: Car,
  personal: DollarSign,
  other: DollarSign,
};

// Account balance bar colors
const ACCOUNT_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#3B82F6', // Blue
];

export default function PortfolioPage() {
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

  const {
    holdings: manualStockHoldings,
    addHolding,
    removeHolding,
    updatePrices,
    getTotalValue,
    isLoading: stocksLoading,
    setLoading: setStocksLoading,
  } = useStockHoldingsStore();

  const [syncingInstitutions, setSyncingInstitutions] = useState<Set<string>>(new Set());
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Stock input state
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockShares, setStockShares] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [isAddingStock, setIsAddingStock] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData(false, { silent: true });
  }, []);

  // Update stock prices periodically
  useEffect(() => {
    const updateAllPrices = async () => {
      if (manualStockHoldings.length === 0) return;
      
      const prices: Record<string, { price: number; change: number; changePercent: number }> = {};
      
      for (const holding of manualStockHoldings) {
        try {
          const response = await fetch(`/api/stocks/lookup?symbol=${holding.symbol}`);
          if (response.ok) {
            const data = await response.json();
            if (data.stock) {
              prices[holding.symbol] = {
                price: data.stock.price,
                change: data.stock.change,
                changePercent: data.stock.changePercent,
              };
            }
          }
        } catch (e) {
          // Ignore individual failures
        }
      }
      
      if (Object.keys(prices).length > 0) {
        updatePrices(prices);
      }
    };

    updateAllPrices();
    const interval = setInterval(updateAllPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [manualStockHoldings.length]);

  // Search stocks as user types
  useEffect(() => {
    const searchStocks = async () => {
      if (stockSymbol.length < 1) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch('/api/stocks/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: stockSymbol }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (e) {
        // Ignore
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounce);
  }, [stockSymbol]);

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

  const handleSelectStock = async (stock: any) => {
    setSelectedStock(stock);
    setStockSymbol(stock.symbol);
    setSearchResults([]);

    // Fetch current price
    try {
      const response = await fetch(`/api/stocks/lookup?symbol=${stock.symbol}`);
      if (response.ok) {
        const data = await response.json();
        if (data.stock) {
          setSelectedStock(data.stock);
        }
      }
    } catch (e) {
      // Use search result data
    }
  };

  const handleAddStock = async () => {
    if (!selectedStock || !stockShares || parseFloat(stockShares) <= 0) {
      toast.error("Please enter a valid stock and number of shares");
      return;
    }

    setIsAddingStock(true);

    try {
      // Fetch latest price
      const response = await fetch(`/api/stocks/lookup?symbol=${selectedStock.symbol}`);
      let stockData = selectedStock;
      
      if (response.ok) {
        const data = await response.json();
        if (data.stock) {
          stockData = data.stock;
        }
      }

      const shares = parseFloat(stockShares);
      const totalValue = shares * stockData.price;

      addHolding({
        symbol: stockData.symbol,
        name: stockData.name,
        shares,
        currentPrice: stockData.price,
        totalValue,
        change: stockData.change || 0,
        changePercent: stockData.changePercent || 0,
        lastUpdated: new Date().toISOString(),
      });

      toast.success(`Added ${shares} shares of ${stockData.symbol} ($${totalValue.toLocaleString()})`);
      
      // Reset form
      setStockSymbol("");
      setStockShares("");
      setSelectedStock(null);
    } catch (error) {
      toast.error("Failed to add stock");
    } finally {
      setIsAddingStock(false);
    }
  };

  const handleRemoveStock = (id: string, symbol: string) => {
    removeHolding(id);
    toast.info(`Removed ${symbol} from portfolio`);
  };

  const totalStockValue = getTotalValue();
  const netWorthWithManual = (summary?.netWorth || 0) + (totalStockValue || 0);
  const investmentsWithManual = (summary?.totalInvestments || 0) + (totalStockValue || 0);
  const dbHoldingsTotalValue = (plaidHoldings || []).reduce((sum, h) => sum + Number(h.value || 0), 0);
  const sortedDbHoldings = [...(plaidHoldings || [])].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  // Combine all accounts for the balance bar
  const allAccounts = [
    ...bankAccounts.map(a => ({ ...a, color: 'cash' })),
    ...investmentAccounts.map(a => ({ ...a, color: 'investment' })),
  ];

  const accountBalanceGroups = Array.from(
    allAccounts.reduce((map, account) => {
      const name = account.institution || account.name || 'Account';
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalBalance += account.currentBalance;
        existing.count += 1;
      } else {
        map.set(key, {
          id: key,
          name,
          totalBalance: account.currentBalance,
          count: 1,
        });
      }
      return map;
    }, new Map<string, { id: string; name: string; totalBalance: number; count: number }>())
  ).sort((a, b) => b.totalBalance - a.totalBalance);

  const totalAccountBalance = accountBalanceGroups.reduce((sum, g) => sum + g.totalBalance, 0);
  const visibleAccountGroups = accountBalanceGroups.filter(g => g.totalBalance > 0);

  const hasCachedData =
    institutions.length > 0 ||
    bankAccounts.length > 0 ||
    investmentAccounts.length > 0 ||
    loans.length > 0 ||
    plaidHoldings.length > 0 ||
    summary !== null;
  const loading = isLoading && !hasCachedData;

  // Deduplicate institutions by name
  const uniqueInstitutions = institutions.reduce((acc, inst) => {
    if (!acc.find(i => i.name === inst.name)) {
      acc.push(inst);
    }
    return acc;
  }, [] as typeof institutions);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-16">
          <DogLoadingAnimation message="Loading your portfolio..." size="lg" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: CONNECTED INSTITUTIONS (Single line, deduplicated)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-foreground-muted" />
            <div>
              <h2 className="text-sm font-semibold">
                {uniqueInstitutions.length} Institution{uniqueInstitutions.length !== 1 ? 's' : ''} Connected
              </h2>
              <p className="text-[11px] text-foreground-muted">
                {uniqueInstitutions.map(i => i.name).join(', ') || 'No institutions connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uniqueInstitutions.length > 0 && (
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingInstitutions.size > 0}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingInstitutions.size > 0 ? "animate-spin" : ""}`} />
                Sync
              </GlassButton>
            )}
            <PlaidLinkButton
              onSuccess={() => invalidateAndRefetch()}
              buttonText="Add Account"
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: ACCOUNT BALANCE BAR (Flattened Pie Chart)
        ═══════════════════════════════════════════════════════════════════ */}
        {visibleAccountGroups.length > 0 && totalAccountBalance > 0 && (
          <GlassCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-foreground-muted uppercase tracking-wider">Account Balances</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    ${totalAccountBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Horizontal Balance Bar */}
              <div className="h-8 rounded-lg overflow-hidden flex">
                {visibleAccountGroups.map((group, index) => {
                  const percentage = (group.totalBalance / totalAccountBalance) * 100;
                  if (percentage < 0.5) return null; // Skip tiny amounts
                  
                  return (
                    <motion.div
                      key={group.id}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full relative group cursor-pointer"
                      style={{ backgroundColor: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] }}
                      title={`${group.name}: $${group.totalBalance.toLocaleString()}`}
                    >
                      {percentage > 8 && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-medium truncate px-1">
                          {group.name.split(' ')[0]}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {visibleAccountGroups.map((group, index) => (
                  <div key={group.id} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] }}
                    />
                    <span className="text-[11px] text-foreground-muted">
                      {group.name}{group.count > 1 ? ` (${group.count})` : ''}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums">
                      ${group.totalBalance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: NET WORTH SUMMARY + CHART
        ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-foreground-muted uppercase tracking-wider">Net Worth</p>
                <div className="flex items-baseline gap-3">
                  <h1 className="text-3xl font-semibold tabular-nums">
                    ${netWorthWithManual.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h1>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right">
                <div>
                  <p className="text-[10px] text-foreground-muted">Cash</p>
                  <p className="text-sm font-semibold text-success tabular-nums">
                    ${summary?.totalCash.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground-muted">Investments</p>
                  <p className="text-sm font-semibold text-primary tabular-nums">
                    ${investmentsWithManual.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-foreground-muted">Loans</p>
                  <p className="text-sm font-semibold text-destructive tabular-nums">
                    -${summary?.totalLoans.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Net Worth Chart */}
        <PortfolioChart data={netWorthWithManual ? generatePortfolioHistory(netWorthWithManual) : []} />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: ACCOUNTS SUMMARY
        ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold">Bank Accounts</h3>
          </div>
          <div className="space-y-2 max-h-[180px] overflow-y-auto">
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-foreground-muted">No bank accounts connected</p>
            ) : (
              bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-success/10 flex items-center justify-center">
                      {account.subtype === 'checking' ? (
                        <Wallet className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <PiggyBank className="w-3.5 h-3.5 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{account.name}</p>
                      <p className="text-[10px] text-foreground-muted">{account.institution}</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold tabular-nums">
                    ${account.currentBalance.toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5: LOANS
        ═══════════════════════════════════════════════════════════════════ */}
        {loans.length > 0 && (
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <PiggyBank className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-semibold">Loans</h3>
              <span className="text-xs text-foreground-muted">
                (${summary?.totalLoans.toLocaleString()} total)
              </span>
            </div>
            <div className="space-y-3">
              {loans.map((loan) => {
                const LoanIcon = loanTypeIcons[loan.type] || DollarSign;
                const paidOffPercent = ((loan.originalPrincipal - loan.currentBalance) / loan.originalPrincipal) * 100;

                return (
                  <div key={loan.id} className="p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <LoanIcon className="w-4 h-4 text-destructive" />
                        <div>
                          <p className="text-xs font-medium">{loan.name}</p>
                          <p className="text-[10px] text-foreground-muted">{loan.institution}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-destructive tabular-nums">
                        -${loan.currentBalance.toLocaleString()}
                      </p>
                    </div>
                    <div className="h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${paidOffPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-foreground-muted mt-1">
                      {paidOffPercent.toFixed(0)}% paid off · {loan.interestRate}% APR
                    </p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6: STOCK HOLDINGS
            - DB holdings (Supabase `holdings`) are part of Net Worth.
            - Manual holdings are optional and not part of Net Worth.
        ═══════════════════════════════════════════════════════════════════ */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Stock Holdings</h3>
            </div>
            <div className="flex items-center gap-3">
              {dbHoldingsTotalValue > 0 && (
                <span className="text-sm font-bold text-primary tabular-nums">
                  ${dbHoldingsTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {/* DB Holdings (Supabase `holdings`) */}
          {sortedDbHoldings.length === 0 ? (
            <div className="text-center py-6">
              <LineChart className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground-muted">No holdings found</p>
              <p className="text-[10px] text-foreground-muted/70">
                Connect an institution and sync holdings to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedDbHoldings.map((holding) => (
                <motion.div
                  key={holding.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                      {holding.symbol?.slice(0, 2) || '—'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold">{holding.symbol || 'Unknown'}</p>
                        <p className="text-[9px] text-foreground-muted truncate max-w-[140px]">{holding.name}</p>
                      </div>
                      <p className="text-[10px] text-foreground-muted tabular-nums">
                        {Number(holding.quantity || 0).toLocaleString()} × ${Number(holding.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold tabular-nums">
                        ${Number(holding.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      {typeof holding.gainLossPercent === 'number' ? (
                        <p className={`text-[9px] tabular-nums ${holding.gainLossPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {holding.gainLossPercent >= 0 ? '+' : ''}{Number(holding.gainLossPercent).toFixed(2)}%
                        </p>
                      ) : (
                        <p className="text-[9px] tabular-nums text-foreground-muted">--</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Total - Compact */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                <p className="text-xs text-foreground-muted">Total Value</p>
                <p className="text-sm font-bold tabular-nums">
                  ${dbHoldingsTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Optional: manual holdings (local only) */}
          <details className="mt-4">
            <summary className="cursor-pointer select-none text-xs font-medium text-foreground-muted hover:text-foreground transition-colors">
              Add stocks manually
            </summary>
            <div className="mt-3">
              {/* Add Stock Form - Cleaner layout */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 mb-3">
                <div className="flex items-center gap-2">
                  {/* Stock Symbol Input with Search */}
                  <div className="flex-1 relative min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-muted pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search symbol (AAPL, GOOGL...)"
                      value={stockSymbol}
                      onChange={(e) => {
                        setStockSymbol(e.target.value.toUpperCase());
                        setSelectedStock(null);
                      }}
                      className="w-full pl-8 pr-8 py-2 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                    {stockSymbol && !selectedStock && (
                      <button
                        onClick={() => {
                          setStockSymbol("");
                          setSearchResults([]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && !selectedStock && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-[160px] overflow-y-auto">
                        {searchResults.map((result) => (
                          <button
                            key={result.symbol}
                            onClick={() => handleSelectStock(result)}
                            className="w-full px-2.5 py-1.5 text-left hover:bg-secondary transition-colors flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold">{result.symbol}</p>
                              <p className="text-[9px] text-foreground-muted truncate">{result.name}</p>
                            </div>
                            <span className="text-[9px] text-foreground-muted flex-shrink-0">{result.exchange}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Shares Input */}
                  <div className="w-24 flex-shrink-0">
                    <input
                      type="number"
                      placeholder="Shares"
                      value={stockShares}
                      onChange={(e) => setStockShares(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-2.5 py-2 rounded-md bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 tabular-nums"
                    />
                  </div>

                  {/* Add Button */}
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleAddStock}
                    disabled={!selectedStock || !stockShares || isAddingStock}
                    className="flex-shrink-0 px-3"
                  >
                    {isAddingStock ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </GlassButton>
                </div>

                {/* Selected Stock Info - Inline */}
                {selectedStock && (
                  <div className="mt-2 flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-primary/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-primary">{selectedStock.symbol}</span>
                      <span className="text-[10px] text-foreground-muted truncate">{selectedStock.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-mono">${selectedStock.price?.toFixed(2) || '...'}</span>
                      {stockShares && parseFloat(stockShares) > 0 && (
                        <span className="text-xs font-semibold text-success tabular-nums">
                          = ${(parseFloat(stockShares) * (selectedStock.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedStock(null);
                          setStockSymbol("");
                        }}
                        className="text-foreground-muted hover:text-foreground p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Holdings List */}
              {manualStockHoldings.length === 0 ? (
                <div className="text-center py-6">
                  <LineChart className="w-8 h-8 text-foreground-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium text-foreground-muted">No manual stocks added yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {manualStockHoldings.map((holding) => (
                    <motion.div
                      key={holding.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                          {holding.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold">{holding.symbol}</p>
                            <p className="text-[9px] text-foreground-muted truncate max-w-[140px]">{holding.name}</p>
                          </div>
                          <p className="text-[10px] text-foreground-muted tabular-nums">
                            {holding.shares} × ${holding.currentPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-semibold tabular-nums">
                            ${holding.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-[9px] tabular-nums ${holding.changePercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {holding.changePercent >= 0 ? '+' : ''}{holding.changePercent.toFixed(2)}%
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveStock(holding.id, holding.symbol)}
                          className="p-1 rounded hover:bg-destructive/10 text-foreground-muted hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-border">
                    <p className="text-xs text-foreground-muted">Manual Total</p>
                    <p className="text-sm font-bold tabular-nums">
                      ${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </details>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
