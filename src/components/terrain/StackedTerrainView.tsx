"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { useTerrainStore } from "@/stores/terrain-store";
import { MOCK_TRANSACTIONS } from "@/lib/mock-data";
import { format, differenceInDays, addMonths, startOfMonth } from "date-fns";
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, Zap, Trophy, AlertCircle, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Category configuration - PHASE 1: Vibrant colors for clear distinction
const CATEGORIES = [
    { id: "Rent", label: "Rent", color: "#A67C52", darkColor: "#7A5838" },
    { id: "Bills", label: "Bills", color: "#D4A574", darkColor: "#B88553" },
    { id: "Groceries", label: "Groceries", color: "#E8C89A", darkColor: "#CCA570" },
    { id: "Food", label: "Dining", color: "#FF6B6B", darkColor: "#CC3636" },
    { id: "Entertainment", label: "Fun", color: "#A855F7", darkColor: "#7C2FC2" },
    { id: "Shopping", label: "Shopping", color: "#EC4899", darkColor: "#C01F6E" },
    { id: "Transport", label: "Transport", color: "#FB923C", darkColor: "#C96A15" },
    { id: "Subscriptions", label: "Subs", color: "#3B82F6", darkColor: "#1454C4" },
];

interface DataPoint {
    date: Date;
    monthLabel: string;
    balance: number;
    simBalance: number;
    totalSpending: number;
    Rent: number;
    Bills: number;
    Groceries: number;
    Food: number;
    Entertainment: number;
    Shopping: number;
    Transport: number;
    Subscriptions: number;
}

interface Landmark {
    type: "milestone" | "expense" | "income";
    date: string;
    dateIndex: number;
    amount: number;
    label: string;
    icon: "trophy" | "alert" | "arrow";
    color: string;
}

export function StackedTerrainView() {
    const { activeCategories, startDate, endDate, currentDate, setCurrentDate, showSimulation, toggleSimulation } = useTerrainStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [displayBalance, setDisplayBalance] = useState(5000);
    const [displayIncome, setDisplayIncome] = useState(0);
    const [displayExpenses, setDisplayExpenses] = useState(0);

    // Build MONTHLY data - reduced points for performance
    const fullData = useMemo(() => {
        const data: DataPoint[] = [];
        let runningBalance = 5000;
        const monthlyIncome = 9500;

        const start = startOfMonth(startDate);
        const monthCount = Math.min(Math.ceil(differenceInDays(endDate, start) / 30) + 1, 50); // Cap at 50 points

        for (let m = 0; m < monthCount; m++) {
            const monthStart = addMonths(start, m);
            const monthEnd = addMonths(monthStart, 1);

            const monthTransactions = MOCK_TRANSACTIONS.filter(t => {
                const date = new Date(t.date);
                return date >= monthStart && date < monthEnd;
            });

            const categorySpending: Record<string, number> = {};
            let totalSpending = 0;

            CATEGORIES.forEach(cat => {
                const amount = monthTransactions
                    .filter(t => t.category === cat.id)
                    .reduce((sum, t) => sum + t.amount, 0);
                categorySpending[cat.id] = Math.round(amount);
                totalSpending += amount;
            });

            runningBalance += monthlyIncome - totalSpending;
            const simBalance = runningBalance + (m * 500);

            data.push({
                date: monthStart,
                monthLabel: format(monthStart, "MMM"),
                balance: Math.round(runningBalance),
                simBalance: Math.round(simBalance),
                totalSpending: Math.round(totalSpending),
                Rent: categorySpending.Rent || 0,
                Bills: categorySpending.Bills || 0,
                Groceries: categorySpending.Groceries || 0,
                Food: categorySpending.Food || 0,
                Entertainment: categorySpending.Entertainment || 0,
                Shopping: categorySpending.Shopping || 0,
                Transport: categorySpending.Transport || 0,
                Subscriptions: categorySpending.Subscriptions || 0,
            });
        }

        return data;
    }, [startDate, endDate]);

    // Detect meaningful landmarks
    const landmarks = useMemo(() => {
        const marks: Landmark[] = [];
        const seenMilestones = new Set<number>();
        let prevBalance = 5000;

        fullData.forEach((d, i) => {
            [10000, 20000, 30000, 40000, 50000, 60000].forEach(threshold => {
                if (d.balance >= threshold && prevBalance < threshold && !seenMilestones.has(threshold)) {
                    seenMilestones.add(threshold);
                    marks.push({
                        type: "milestone",
                        date: d.monthLabel,
                        dateIndex: i,
                        amount: threshold,
                        label: `$${threshold / 1000}K Saved`,
                        icon: "trophy",
                        color: "#22c55e",
                    });
                }
            });

            if (d.totalSpending > 4500 && marks.filter(m => m.type === "expense").length < 2) {
                marks.push({
                    type: "expense",
                    date: d.monthLabel,
                    dateIndex: i,
                    amount: d.totalSpending,
                    label: `$${Math.round(d.totalSpending / 1000)}K Spent`,
                    icon: "alert",
                    color: "#f59e0b",
                });
            }

            prevBalance = d.balance;
        });

        if (fullData.length > 3) {
            marks.push({
                type: "income",
                date: fullData[3].monthLabel,
                dateIndex: 3,
                amount: 3000,
                label: "Bonus +$3K",
                icon: "arrow",
                color: "#3b82f6",
            });
        }

        return marks.slice(0, 6);
    }, [fullData]);

    const visibleData = useMemo(() => {
        return fullData.filter(d => d.date <= currentDate);
    }, [fullData, currentDate]);

    const currentStats = useMemo(() => {
        if (visibleData.length === 0) return { balance: 5000, income: 0, expenses: 0, date: startDate, simBalance: 5000 };
        const current = visibleData[visibleData.length - 1];
        const totalIncome = visibleData.length * 9500;
        const totalExpenses = visibleData.reduce((sum, d) => sum + d.totalSpending, 0);
        return {
            balance: current.balance,
            simBalance: current.simBalance,
            income: totalIncome,
            expenses: Math.round(totalExpenses),
            date: current.date,
        };
    }, [visibleData, startDate]);

    // Animate numbers smoothly
    useEffect(() => {
        const animateValue = (current: number, target: number, setter: (v: number) => void) => {
            const diff = target - current;
            if (Math.abs(diff) < 50) {
                setter(target);
                return;
            }
            const step = diff * 0.12;
            setTimeout(() => setter(Math.round(current + step)), 20);
        };
        animateValue(displayBalance, currentStats.balance, setDisplayBalance);
        animateValue(displayIncome, currentStats.income, setDisplayIncome);
        animateValue(displayExpenses, currentStats.expenses, setDisplayExpenses);
    }, [currentStats, displayBalance, displayIncome, displayExpenses]);

    // Auto-play
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            const currentIndex = fullData.findIndex(d => d.date >= currentDate);
            if (currentIndex >= fullData.length - 1) {
                setIsPlaying(false);
                return;
            }
            setCurrentDate(fullData[currentIndex + 1]?.date || currentDate);
        }, 800 / playbackSpeed);
        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed, fullData, currentDate, setCurrentDate]);

    const currentIndex = Math.max(0, fullData.findIndex(d => d.date >= currentDate));

    const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        setCurrentDate(fullData[index]?.date || currentDate);
    }, [fullData, currentDate, setCurrentDate]);

    const handleReset = () => {
        setCurrentDate(startDate);
        setIsPlaying(false);
    };

    const togglePlay = () => {
        if (currentIndex >= fullData.length - 1) setCurrentDate(startDate);
        setIsPlaying(!isPlaying);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.[0]) return null;
        const data = payload[0].payload as DataPoint;
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card/95 backdrop-blur-lg border border-border rounded-xl p-4 shadow-2xl min-w-[200px]"
            >
                <p className="font-bold mb-3">{format(data.date, "MMMM yyyy")}</p>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-foreground-muted">Balance:</span>
                        <span className="font-mono font-bold text-primary">${data.balance.toLocaleString()}</span>
                    </div>
                    {showSimulation && (
                        <div className="flex justify-between">
                            <span className="text-foreground-muted">Simulation:</span>
                            <span className="font-mono text-success">${data.simBalance.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-foreground-muted">Spending:</span>
                        <span className="font-mono text-destructive">${data.totalSpending.toLocaleString()}</span>
                    </div>
                </div>
            </motion.div>
        );
    };

    const maxBalance = Math.max(...fullData.map(d => Math.max(d.balance, d.simBalance)));

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-b from-background to-muted/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div>
                    <h2 className="text-2xl font-bold">Financial Terrain</h2>
                    <p className="text-sm text-foreground-muted">
                        {format(startDate, "MMM yyyy")} — {format(currentStats.date, "MMM yyyy")}
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wider">Balance</p>
                        <p className="text-4xl font-black font-mono tabular-nums">
                            ${displayBalance.toLocaleString()}
                        </p>
                    </div>
                    <div className="w-px h-14 bg-border" />
                    <div className="text-right">
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wider flex items-center justify-end gap-1">
                            Income <TrendingUp className="w-3 h-3 text-success" />
                        </p>
                        <p className="text-xl font-bold font-mono tabular-nums text-success">
                            ${displayIncome.toLocaleString()}
                        </p>
                    </div>
                    <div className="w-px h-14 bg-border" />
                    <div className="text-right">
                        <p className="text-[10px] text-foreground-muted uppercase tracking-wider flex items-center justify-end gap-1">
                            Expenses <TrendingDown className="w-3 h-3 text-destructive" />
                        </p>
                        <p className="text-xl font-bold font-mono tabular-nums text-destructive">
                            ${displayExpenses.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Landmark badges */}
            <div className="px-6 py-2 flex gap-2 flex-wrap">
                <AnimatePresence>
                    {landmarks.filter(l => l.dateIndex <= currentIndex).map((l, i) => (
                        <motion.div
                            key={`${l.type}-${l.dateIndex}`}
                            initial={{ opacity: 0, y: -10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg text-white"
                            style={{ backgroundColor: l.color }}
                        >
                            {l.icon === "trophy" && <Trophy className="w-3 h-3" />}
                            {l.icon === "alert" && <AlertCircle className="w-3 h-3" />}
                            {l.icon === "arrow" && <ArrowUp className="w-3 h-3" />}
                            <span>{l.label}</span>
                            <span className="opacity-75 text-[10px]">• {l.date}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* PHASE 1: 2.5D TERRAIN CHART with perspective */}
            <div className="flex-1 px-4 py-4 min-h-0 relative">
                {/* 2.5D Perspective Container */}
                <div
                    className="w-full h-full relative"
                    style={{
                        perspective: "1200px",
                        perspectiveOrigin: "50% 50%",
                    }}
                >
                    <div
                        className="w-full h-full relative"
                        style={{
                            transform: "rotateX(15deg) scale(1.05)",
                            transformStyle: "preserve-3d",
                            willChange: "transform",
                            borderBottom: "3px solid rgba(255, 255, 255, 0.12)",
                            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6)",
                        }}
                    >
                        {/* Front edge shadow for depth */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/30 to-transparent pointer-events-none z-10"
                            style={{ transform: "translateZ(5px)" }}
                        />

                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={visibleData}
                                margin={{ top: 20, right: 40, bottom: 40, left: 20 }}
                            >
                                <defs>
                                    {/* PHASE 1: Enhanced depth gradients - dark (back) to light (front) */}
                                    {CATEGORIES.map(cat => (
                                        <linearGradient key={cat.id} id={`terrain-${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={cat.darkColor} stopOpacity={1} />
                                            <stop offset="40%" stopColor={cat.darkColor} stopOpacity={0.95} />
                                            <stop offset="100%" stopColor={cat.color} stopOpacity={1} />
                                        </linearGradient>
                                    ))}

                                    {/* Front edge glow */}
                                    <filter id="frontGlow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>

                                    {/* Layer separation shadow */}
                                    <filter id="layerShadow">
                                        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                                        <feOffset dx="0" dy="2" result="offsetblur" />
                                        <feComponentTransfer>
                                            <feFuncA type="linear" slope="0.4" />
                                        </feComponentTransfer>
                                        <feMerge>
                                            <feMergeNode />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                <CartesianGrid
                                    strokeDasharray="3 6"
                                    stroke="var(--border)"
                                    strokeOpacity={0.1}
                                    vertical={false}
                                />


                                <XAxis
                                    dataKey="monthLabel"
                                    tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
                                    axisLine={{ stroke: "var(--border)", strokeOpacity: 0.3 }}
                                    tickLine={false}
                                />

                                {/* LEFT Y-AXIS for stacked spending areas */}
                                <YAxis
                                    yAxisId="spending"
                                    orientation="left"
                                    tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                    domain={[0, 12000]}
                                />

                                {/* RIGHT Y-AXIS for balance lines */}
                                <YAxis
                                    yAxisId="balance"
                                    orientation="right"
                                    tick={{ fontSize: 10, fill: "var(--foreground-muted)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                                    domain={[0, maxBalance * 1.2]}
                                />

                                <Tooltip content={<CustomTooltip />} />

                                {/* PHASE 1: STACKED TERRAIN AREAS - Vibrant colors with borders */}
                                {CATEGORIES.filter(cat => activeCategories.has(cat.id)).map((cat, idx) => (
                                    <Area
                                        key={cat.id}
                                        yAxisId="spending"
                                        type="monotone"
                                        dataKey={cat.id}
                                        stackId="terrain"
                                        fill={`url(#terrain-${cat.id})`}
                                        stroke="rgba(0, 0, 0, 0.3)"
                                        strokeWidth={hoveredCategory === cat.id ? 2.5 : 1.5}
                                        fillOpacity={hoveredCategory && hoveredCategory !== cat.id ? 0.5 : 1}
                                        animationDuration={400}
                                        animationEasing="ease-out"
                                        filter={hoveredCategory === cat.id ? "url(#frontGlow)" : "url(#layerShadow)"}
                                    />
                                ))}

                                {/* Balance line - RIGHT AXIS */}
                                <Line
                                    yAxisId="balance"
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#6b7280"
                                    strokeWidth={4}
                                    dot={false}
                                    animationDuration={400}
                                    filter="url(#frontGlow)"
                                />

                                {/* Simulation line - RIGHT AXIS */}
                                {showSimulation && (
                                    <Line
                                        yAxisId="balance"
                                        type="monotone"
                                        dataKey="simBalance"
                                        stroke="#22c55e"
                                        strokeWidth={3}
                                        strokeDasharray="10 6"
                                        dot={false}
                                        animationDuration={600}
                                        opacity={0.8}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>

                        {/* PHASE 1: Prominent front edge border */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-foreground/20 to-transparent rounded-full"
                            style={{
                                transform: "translateZ(10px)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Simulation delta */}
            {showSimulation && visibleData.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-6 mb-2 px-4 py-2 bg-success/10 border border-success/30 rounded-lg flex items-center justify-between"
                >
                    <span className="text-sm text-success font-medium">Simulation shows potential savings</span>
                    <span className="text-lg font-bold text-success font-mono">
                        +${((currentStats.simBalance || currentStats.balance) - currentStats.balance).toLocaleString()}
                    </span>
                </motion.div>
            )}

            {/* Legend */}
            <div className="px-4 py-3 border-t border-border/30">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    {CATEGORIES.filter(cat => activeCategories.has(cat.id)).map(cat => {
                        const total = visibleData.reduce((sum, d) => sum + ((d[cat.id as keyof DataPoint] as number) || 0), 0);
                        const pct = displayExpenses > 0 ? Math.round((total / displayExpenses) * 100) : 0;
                        return (
                            <motion.button
                                key={cat.id}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                    hoveredCategory === cat.id
                                        ? "bg-secondary border-primary/50 ring-1 ring-primary/30"
                                        : "bg-secondary/50 border-transparent hover:bg-secondary"
                                )}
                                onMouseEnter={() => setHoveredCategory(cat.id)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                whileHover={{ y: -1 }}
                            >
                                <span
                                    className="w-3 h-3 rounded border border-white/20"
                                    style={{
                                        background: `linear-gradient(to bottom, ${cat.darkColor} 0%, ${cat.color} 100%)`
                                    }}
                                />
                                <span>{cat.label}</span>
                                <span className="text-foreground-muted font-mono text-[10px]">{pct}%</span>
                            </motion.button>
                        );
                    })}

                    <motion.button
                        onClick={toggleSimulation}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-3 border",
                            showSimulation
                                ? "bg-success/20 text-success border-success/50"
                                : "bg-secondary/50 text-foreground-muted border-transparent hover:bg-secondary"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Simulation
                    </motion.button>
                </div>
            </div>

            {/* Time Scrubber */}
            <div className="px-4 py-4 border-t border-border/30 bg-muted/20">
                <div className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                        <p className="text-lg font-bold">{format(currentStats.date, "MMM yyyy")}</p>
                    </div>

                    <div className="flex-1 relative h-10">
                        <div className="absolute inset-0 flex items-end rounded-md overflow-hidden bg-muted/40">
                            {fullData.map((d, i) => (
                                <div
                                    key={i}
                                    className="flex-1 transition-all duration-200"
                                    style={{
                                        height: `${Math.min(100, (d.balance / maxBalance) * 100)}%`,
                                        backgroundColor: i <= currentIndex ? "#6366f1" : "var(--muted)",
                                        opacity: i <= currentIndex ? 0.7 : 0.3,
                                    }}
                                />
                            ))}
                        </div>

                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, fullData.length - 1)}
                            value={currentIndex}
                            onChange={handleScrub}
                            className="relative w-full h-10 appearance-none bg-transparent cursor-grab active:cursor-grabbing z-10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:shadow-xl
                [&::-webkit-slider-thumb]:border-3
                [&::-webkit-slider-thumb]:border-background
                [&::-webkit-slider-thumb]:cursor-grab
                [&::-webkit-slider-thumb]:active:cursor-grabbing
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-webkit-slider-thumb]:transition-transform"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={handleReset} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={togglePlay} className="p-2.5 rounded-lg bg-primary text-primary-foreground">
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1)}
                            className="px-2.5 py-2 rounded-lg bg-secondary text-xs font-mono font-bold"
                        >
                            {playbackSpeed}x
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
