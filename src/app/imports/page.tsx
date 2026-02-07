"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Link2, 
  Building2, 
  FileSpreadsheet,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Plus,
  Wallet,
  TrendingUp,
  CreditCard
} from "lucide-react";
import Image from "next/image";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { UploadCard } from "@/components/cards/upload-card";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { PlaidLinkButton } from "@/components/PlaidLink";
import { CapitalOneConnectButton } from "@/components/CapitalOneConnect";
import { DogLoadingAnimation } from "@/components/ui/DogLoadingAnimation";
import { useBudgetStore } from "@/stores/budgetStore";
import { useFinancialDataStore } from "@/stores/financial-data-store";
import { usePortfolioStore } from "@/stores/portfolio-store";

interface PlaidAccount {
  id: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance: number;
  availableBalance?: number;
  institution: string;
  itemId: string;
}

interface PlaidInstitution {
  id: string;
  itemId: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  accounts: PlaidAccount[];
  status: string;
  lastSync: string;
}

const availableIntegrations = [
  { id: "plaid", name: "Plaid", description: "Connect 10,000+ institutions", icon: Link2, image: "/banks/plaid3.png" },
  { id: "capital_one", name: "Capital One", description: "Connect your Capital One accounts", icon: Building2, image: "/banks/capitalone.jpg" },
  { id: "manual", name: "Manual Import", description: "CSV, OFX, QFX files", icon: FileSpreadsheet, image: null },
];

const popularBanks = [
  { id: "chase", name: "Chase", logo: "C", image: "/banks/chase.png" },
  { id: "bofa", name: "Bank of America", logo: "B", image: "/banks/bankofamerica.jpeg" },
  { id: "wells", name: "Wells Fargo", logo: "W", image: "/banks/wellsfargo.png" },
  { id: "capital", name: "Capital One", logo: "CO", image: "/banks/capitalone.jpg" },
  { id: "fidelity", name: "Fidelity", logo: "F", image: "/banks/fidelity.jpg" },
  { id: "sofi", name: "SoFi", logo: "S", image: "/banks/sofi.jpeg" },
];

export default function ImportsPage() {
  const [institutions, setInstitutions] = useState<PlaidInstitution[]>([]);
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  
  // Get store actions for refreshing data after connection
  const budgetInitialize = useBudgetStore((state) => state.initialize);
  const financialDataClear = useFinancialDataStore((state) => state.clearData);
  const portfolioClear = usePortfolioStore((state) => state.clearData);

  const statusConfig = {
    connected: { 
      icon: CheckCircle, 
      color: "text-success", 
      label: "Connected" 
    },
    syncing: { 
      icon: RefreshCw, 
      color: "text-primary", 
      label: "Syncing" 
    },
    error: { 
      icon: AlertCircle, 
      color: "text-destructive", 
      label: "Error" 
    },
  };

  // Fetch connected accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/accounts');
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.institutions || []);
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaidSuccess = async () => {
    setShowAddAccount(false);
    await fetchAccounts();
    
    // Clear cached data in stores to force refresh with new data
    financialDataClear();
    portfolioClear();
    
    // Clear budget localStorage cache and reinitialize
    localStorage.removeItem('budget_config');
    localStorage.removeItem('budget_summary');
    localStorage.removeItem('budget_trendAnalytics');
    localStorage.removeItem('budget_insights');
    
    // Reinitialize budget with new transaction data
    budgetInitialize();
    
    toast.success("Account connected! Your data is being synced.");
  };

  const handleCapitalOneSuccess = async () => {
    setShowAddAccount(false);
    await fetchAccounts();
    
    // Clear cached data in stores to force refresh with new data
    financialDataClear();
    portfolioClear();
    
    // Clear budget localStorage cache and reinitialize
    localStorage.removeItem('budget_config');
    localStorage.removeItem('budget_summary');
    localStorage.removeItem('budget_trendAnalytics');
    localStorage.removeItem('budget_insights');
    
    // Reinitialize budget with new transaction data
    budgetInitialize();
    
    toast.success("Capital One connected! Your data is being synced.");
  };

  const handleSyncAll = async () => {
    const allIds = institutions.map(i => i.itemId);
    setSyncingAccounts(new Set(allIds));
    toast.info("Syncing all accounts...");
    
    // Re-fetch accounts from Plaid
    await fetchAccounts();
    setSyncingAccounts(new Set());
    toast.success("All accounts synced!");
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === "plaid") {
      setShowAddAccount(true);
    } else if (integrationId === "capital_one") {
      // Capital One connection is handled by the button's onSuccess callback
      // No modal needed - direct connection
    } else {
      toast.info("Manual import: Please upload your files below");
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'depository': return Wallet;
      case 'investment': return TrendingUp;
      case 'credit': return CreditCard;
      default: return Building2;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Imports</h1>
            <p className="text-foreground-muted text-sm mt-1">
              Connect accounts and import your financial data
            </p>
          </div>
          <div className="flex gap-2">
            <PlaidLinkButton 
              onSuccess={handlePlaidSuccess}
              buttonText="Add Plaid"
              buttonSize="sm"
            />
            <CapitalOneConnectButton 
              onSuccess={handleCapitalOneSuccess}
              buttonText="Add Capital One"
              buttonSize="sm"
              buttonVariant="secondary"
            />
          </div>
        </div>

        {/* Import Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-sm font-semibold mb-3">Connect New Account</h2>
            <div className="space-y-2">
              {availableIntegrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <GlassCard key={integration.id} interactive>
                    <div className="flex items-center gap-3">
                      {integration.image ? (
                        <Image src={integration.image} alt={integration.name} width={32} height={32} className="rounded-lg object-contain shrink-0" />
                      ) : (
                        <div className="p-2 rounded-lg bg-secondary">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">{integration.name}</h3>
                        <p className="text-[11px] text-foreground-muted">{integration.description}</p>
                      </div>
                      {integration.id === "plaid" ? (
                        <PlaidLinkButton 
                          onSuccess={handlePlaidSuccess}
                          buttonText="Connect"
                          buttonVariant="secondary"
                        />
                      ) : integration.id === "capital_one" ? (
                        <CapitalOneConnectButton 
                          onSuccess={handleCapitalOneSuccess}
                          buttonText="Connect"
                          buttonVariant="secondary"
                        />
                      ) : (
                        <GlassButton 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          Connect
                        </GlassButton>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-3">Upload Files</h2>
            <UploadCard
              title="Bank Statements"
              description="Upload CSV, OFX, or QFX files from your bank"
              acceptedFormats={["CSV", "OFX", "QFX", "PDF"]}
              onUpload={(file) => {
                toast.success(`${file.name} uploaded successfully!`);
              }}
            />
          </div>
        </div>

        {/* Connected Accounts */}
        {loading ? (
          <GlassCard>
            <div className="py-4">
              <DogLoadingAnimation 
                message="Loading accounts..."
                size="md"
              />
            </div>
          </GlassCard>
        ) : institutions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Connected Institutions ({institutions.length})</h2>
              <GlassButton variant="secondary" size="sm" onClick={handleSyncAll}>
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAccounts.size > 0 ? "animate-spin" : ""}`} />
                Sync All
              </GlassButton>
            </div>
            
            {institutions.map((institution) => (
              <GlassCard key={institution.itemId}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: institution.primaryColor || '#6366f1' }}
                      >
                        {institution.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{institution.name}</h3>
                        <p className="text-[11px] text-foreground-muted">
                          {institution.accounts.length} account{institution.accounts.length !== 1 ? 's' : ''} • Last synced: {institution.lastSync}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-xs text-success">Connected</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {institution.accounts.map((account) => {
                      const Icon = getAccountIcon(account.type);
                      return (
                        <div 
                          key={account.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-foreground-muted" />
                            <div>
                              <p className="text-xs font-medium">{account.name}</p>
                              <p className="text-[10px] text-foreground-muted capitalize">
                                {account.subtype || account.type} {account.mask ? `••${account.mask}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold">
                            {formatCurrency(account.currentBalance)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-secondary mb-3">
                <Link2 className="w-6 h-6 text-foreground-muted" />
              </div>
              <h3 className="text-sm font-semibold mb-1">No accounts connected</h3>
              <p className="text-xs text-foreground-muted mb-4">
                Connect your bank accounts to get started
              </p>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <PlaidLinkButton 
                  onSuccess={handlePlaidSuccess}
                  buttonText="Connect with Plaid"
                  buttonSize="md"
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-card px-2 text-foreground-muted">or</span>
                  </div>
                </div>
                <CapitalOneConnectButton 
                  onSuccess={handleCapitalOneSuccess}
                  buttonText="Connect with Capital One"
                  buttonSize="md"
                  buttonVariant="secondary"
                />
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Add Account"
        subtitle="Connect your bank or financial institution"
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
              onSuccess={handlePlaidSuccess}
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

          <p className="text-[10px] text-foreground-muted text-center leading-relaxed">
            We use bank-level 256-bit encryption to keep your data safe.
          </p>
        </div>
      </Modal>
    </PageTransition>
  );
}
