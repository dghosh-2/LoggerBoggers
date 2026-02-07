'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Link2, Loader2 } from 'lucide-react';

interface PlaidGateProps {
    children: React.ReactNode;
}

export function PlaidGate({ children }: PlaidGateProps) {
    const [isConnected, setIsConnected] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkPlaidConnection();
    }, []);

    const checkPlaidConnection = async () => {
        try {
            const response = await fetch('/api/data/summary');
            const data = await response.json();
            setIsConnected(data.is_connected || false);
        } catch (error) {
            console.error('Failed to check Plaid connection:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isConnected) {
        return <PlaidEmptyState />;
    }

    return <>{children}</>;
}

function PlaidEmptyState() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="max-w-md w-full"
            >
                <GlassCard className="p-8 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center"
                    >
                        <Link2 className="w-8 h-8 text-foreground-muted" />
                    </motion.div>

                    <h2 className="text-2xl font-semibold text-foreground mb-3">
                        Connect Your Bank Account
                    </h2>

                    <p className="text-foreground-muted mb-6">
                        Link your bank account to see your budget, spending, and goals.
                    </p>

                    <div className="text-left space-y-3 mb-8">
                        {[
                            'Monthly budget overview',
                            'Spending by category',
                            'Savings goals tracking',
                            'Upcoming expenses',
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-foreground-muted" />
                                <span className="text-sm text-foreground-muted">{feature}</span>
                            </motion.div>
                        ))}
                    </div>

                    <motion.a
                        href="/imports"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 btn-primary"
                    >
                        <Link2 className="w-5 h-5" />
                        Connect via Plaid
                    </motion.a>
                </GlassCard>
            </motion.div>
        </div>
    );
}
