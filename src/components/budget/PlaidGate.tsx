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
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
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
                    {/* Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center"
                    >
                        <Link2 className="w-10 h-10 text-emerald-400" />
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-white mb-3">
                        Connect Your Bank Account
                    </h2>

                    {/* Description */}
                    <p className="text-gray-400 mb-6">
                        Link your bank account via Plaid to unlock intelligent budget automation,
                        track spending patterns, and get AI-powered savings recommendations.
                    </p>

                    {/* Features List */}
                    <div className="text-left space-y-3 mb-8">
                        {[
                            'Smart budget allocation based on your spending',
                            'Safe-to-spend daily calculations',
                            'Upcoming expense predictions',
                            'AI-powered savings insights',
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-sm text-gray-300">{feature}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* CTA Button */}
                    <motion.a
                        href="/imports"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all"
                    >
                        <Link2 className="w-5 h-5" />
                        Connect via Plaid
                    </motion.a>

                    {/* Security Note */}
                    <p className="mt-4 text-xs text-gray-500">
                        🔒 Your data is encrypted and never shared. Plaid uses bank-level security.
                    </p>
                </GlassCard>
            </motion.div>
        </div>
    );
}
