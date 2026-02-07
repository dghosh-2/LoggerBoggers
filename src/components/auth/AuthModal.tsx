'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth-store';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const { login, signup, isLoading } = useAuthStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (mode === 'login') {
            const result = await login(username, password);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Login failed');
            }
        } else {
            const result = await signup(username, password, displayName || username);
            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Signup failed');
            }
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4"
                    >
                        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4 border-b border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center p-2"
                                            style={{
                                                background: 'linear-gradient(135deg, #E8384F 0%, #C41230 50%, #8B0D21 100%)',
                                            }}>
                                            <Image src="/logo.png" alt="" width={24} height={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                                            </h2>
                                            <p className="text-xs text-foreground-muted">
                                                {mode === 'login' 
                                                    ? 'Sign in to access your financial data' 
                                                    : 'Get started with Scotty\'s Ledger'}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onClose} 
                                        className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                                    >
                                        <X className="w-4 h-4 text-foreground-muted" />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {mode === 'signup' && (
                                    <div>
                                        <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                                            Display Name (optional)
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Your name"
                                                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter username"
                                            required
                                            minLength={3}
                                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter password"
                                            required
                                            minLength={6}
                                            className="w-full bg-background border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    {mode === 'signup' && (
                                        <p className="text-[10px] text-foreground-muted mt-1">
                                            At least 6 characters
                                        </p>
                                    )}
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                                    >
                                        <p className="text-xs text-destructive">{error}</p>
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                                        </>
                                    ) : (
                                        <>
                                            {mode === 'login' ? 'Sign In' : 'Create Account'}
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="px-6 pb-6 pt-2 border-t border-border">
                                <p className="text-center text-xs text-foreground-muted">
                                    {mode === 'login' ? (
                                        <>
                                            Don&apos;t have an account?{' '}
                                            <button
                                                type="button"
                                                onClick={switchMode}
                                                className="text-foreground font-medium hover:underline"
                                            >
                                                Sign up
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            Already have an account?{' '}
                                            <button
                                                type="button"
                                                onClick={switchMode}
                                                className="text-foreground font-medium hover:underline"
                                            >
                                                Sign in
                                            </button>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
