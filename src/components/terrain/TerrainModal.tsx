"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useTerrainStore } from "@/stores/terrain-store";
import { StackedTerrainView } from "./StackedTerrainView";
import { CategoryToggles } from "./CategoryToggles";

export function TerrainModal() {
    const { isOpen, isLoading, loadingProgress, loadingMessage, closeTerrain } = useTerrainStore();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={closeTerrain}
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-[95vw] max-w-5xl h-[85vh] bg-background rounded-xl overflow-hidden border border-border shadow-2xl flex flex-col"
                    >
                        {/* Close Button */}
                        <button
                            onClick={closeTerrain}
                            className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Loading State */}
                        <AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background"
                                >
                                    <LoadingAnimation progress={loadingProgress} message={loadingMessage} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Main Content */}
                        {!isLoading && (
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Main visualization */}
                                <div className="flex-1 min-h-0">
                                    <StackedTerrainView />
                                </div>

                                {/* Bottom controls */}
                                <div className="border-t border-border bg-card/50 backdrop-blur-sm">
                                    <CategoryToggles />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Clean loading animation
function LoadingAnimation({ progress, message }: { progress: number; message: string }) {
    return (
        <div className="flex flex-col items-center gap-6">
            {/* Simple spinner */}
            <div className="relative w-16 h-16">
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-border"
                />
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-semibold tabular-nums">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Progress text */}
            <div className="text-center space-y-2">
                <p className="text-sm text-foreground-muted">{message}</p>
            </div>

            {/* Progress bar */}
            <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
        </div>
    );
}
