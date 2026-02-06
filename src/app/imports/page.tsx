"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Link2, 
  Building2, 
  FileSpreadsheet,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Plus
} from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { UploadCard } from "@/components/cards/upload-card";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";

const initialAccounts = [
  { 
    id: "1", 
    name: "Chase Checking", 
    type: "Checking", 
    institution: "Chase", 
    status: "connected",
    lastSync: "2 hours ago" 
  },
  { 
    id: "2", 
    name: "Chase Savings", 
    type: "Savings", 
    institution: "Chase", 
    status: "connected",
    lastSync: "2 hours ago" 
  },
  { 
    id: "3", 
    name: "Amex Platinum", 
    type: "Credit Card", 
    institution: "American Express", 
    status: "connected",
    lastSync: "1 hour ago" 
  },
  { 
    id: "4", 
    name: "Fidelity 401k", 
    type: "Investment", 
    institution: "Fidelity", 
    status: "connected",
    lastSync: "3 hours ago" 
  },
];

const availableIntegrations = [
  { id: "plaid", name: "Plaid", description: "Connect 10,000+ institutions", icon: Link2 },
  { id: "manual", name: "Manual Import", description: "CSV, OFX, QFX files", icon: FileSpreadsheet },
];

const popularBanks = [
  { id: "chase", name: "Chase", logo: "🏦" },
  { id: "bofa", name: "Bank of America", logo: "🏛️" },
  { id: "wells", name: "Wells Fargo", logo: "🏧" },
  { id: "citi", name: "Citibank", logo: "💳" },
  { id: "capital", name: "Capital One", logo: "💰" },
  { id: "amex", name: "American Express", logo: "💎" },
];

export default function ImportsPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());

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

  const handleSyncAccount = (accountId: string) => {
    setSyncingAccounts(prev => new Set([...prev, accountId]));
    toast.info("Syncing account...");
    
    setTimeout(() => {
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
      setAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, lastSync: "Just now" }
          : acc
      ));
      toast.success("Account synced successfully!");
    }, 2000);
  };

  const handleSyncAll = () => {
    const allIds = accounts.map(a => a.id);
    setSyncingAccounts(new Set(allIds));
    toast.info("Syncing all accounts...");
    
    setTimeout(() => {
      setSyncingAccounts(new Set());
      setAccounts(prev => prev.map(acc => ({ ...acc, lastSync: "Just now" })));
      toast.success("All accounts synced!");
    }, 3000);
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === "plaid") {
      setShowAddAccount(true);
    } else {
      toast.info("Manual import: Please upload your files below");
    }
  };

  const handleBankConnect = (bankName: string) => {
    toast.info(`Connecting to ${bankName}...`);
    setShowAddAccount(false);
    
    setTimeout(() => {
      const newAccount = {
        id: String(Date.now()),
        name: `${bankName} Account`,
        type: "Checking",
        institution: bankName,
        status: "connected",
        lastSync: "Just now",
      };
      setAccounts(prev => [...prev, newAccount]);
      toast.success(`${bankName} connected successfully!`);
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Imports</h1>
            <p className="text-foreground-muted mt-1">
              Connect accounts and import your financial data
            </p>
          </div>
          <GlassButton variant="primary" onClick={() => setShowAddAccount(true)}>
            <Link2 className="w-4 h-4" />
            Add Account
          </GlassButton>
        </div>

        {/* Connected Accounts */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          <div className="grid gap-4">
            {accounts.map((account) => {
              const isSyncing = syncingAccounts.has(account.id);
              const status = isSyncing 
                ? statusConfig.syncing 
                : statusConfig[account.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              
              return (
                <GlassCard key={account.id} interactive>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-foreground-muted" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{account.name}</h3>
                        <p className="text-sm text-foreground-muted">
                          {account.institution} · {account.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`flex items-center gap-1.5 ${status.color}`}>
                          <StatusIcon className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                          <span className="text-sm font-medium">{status.label}</span>
                        </div>
                        <p className="text-xs text-foreground-muted">
                          {isSyncing ? "Syncing..." : account.lastSync}
                        </p>
                      </div>
                      
                      <motion.button 
                        onClick={() => handleSyncAccount(account.id)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isSyncing}
                      >
                        <RefreshCw className={`w-4 h-4 text-foreground-muted ${isSyncing ? "animate-spin" : ""}`} />
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Import Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Connect New Account</h2>
            <div className="space-y-4">
              {availableIntegrations.map((integration) => {
                const Icon = integration.icon;
                return (
                  <GlassCard key={integration.id} interactive>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{integration.name}</h3>
                        <p className="text-sm text-foreground-muted">{integration.description}</p>
                      </div>
                      <GlassButton 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleConnect(integration.id)}
                      >
                        Connect
                      </GlassButton>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Upload Files</h2>
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

        {/* Sync Summary */}
        <GlassCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">All accounts synced</h3>
                <p className="text-sm text-foreground-muted">
                  Last full sync completed {accounts[0]?.lastSync || "recently"}
                </p>
              </div>
            </div>
            <GlassButton variant="secondary" onClick={handleSyncAll}>
              <RefreshCw className={`w-4 h-4 ${syncingAccounts.size > 0 ? "animate-spin" : ""}`} />
              Sync All
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        title="Add Account"
        subtitle="Connect your bank or financial institution"
        size="md"
      >
        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-medium mb-3">Popular Banks</h4>
            <div className="grid grid-cols-2 gap-3">
              {popularBanks.map((bank) => (
                <motion.button
                  key={bank.id}
                  onClick={() => handleBankConnect(bank.name)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">{bank.logo}</span>
                  <span className="font-medium text-sm">{bank.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-foreground-muted">or search</span>
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search for your bank..."
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none transition-colors"
              onChange={(e) => {
                if (e.target.value.length > 2) {
                  toast.info(`Searching for "${e.target.value}"...`);
                }
              }}
            />
          </div>

          <p className="text-xs text-foreground-muted text-center">
            We use bank-level encryption to keep your data safe. 
            Your credentials are never stored on our servers.
          </p>
        </div>
      </Modal>
    </PageTransition>
  );
}
