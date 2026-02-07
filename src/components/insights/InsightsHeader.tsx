"use client";

import React from 'react';
import { useInsightsStore } from '@/stores/insights-store';
import {
    LayoutDashboard,
    Share2,
    Settings,
    Bell,
    Sparkles,
    Search
} from 'lucide-react';
import Link from 'next/link';

export function InsightsHeader() {
    return (
        <div className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">

            {/* Left: Branding & Nav */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-foreground">Insights</span>
                </div>

                <div className="h-6 w-px bg-border" />

                <nav className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors">
                        back to dashboard
                    </Link>
                </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <button className="p-2 rounded-full hover:bg-secondary text-foreground-muted transition-colors">
                    <Search className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-full hover:bg-secondary text-foreground-muted transition-colors">
                    <Bell className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-border mx-1" />

                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-background" />
                    <div className="text-xs">
                        <p className="font-medium text-foreground">Krish Mody</p>
                        <p className="text-foreground-muted">Pro Plan</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
