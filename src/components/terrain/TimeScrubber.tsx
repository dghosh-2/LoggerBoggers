"use client";

import { useTerrainStore } from "@/stores/terrain-store";
import { format, differenceInDays, addDays } from "date-fns";
import { Play, Pause, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

export function TimeScrubber() {
    const {
        currentDate,
        startDate,
        endDate,
        isPlaying,
        playbackSpeed,
        setCurrentDate,
        togglePlayback,
        setPlaybackSpeed,
    } = useTerrainStore();

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate position as percentage
    const totalDays = differenceInDays(endDate, startDate);
    const currentDays = differenceInDays(currentDate, startDate);
    const progress = Math.max(0, Math.min(100, (currentDays / totalDays) * 100));

    // Handle scrubber change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        const days = Math.round((value / 100) * totalDays);
        setCurrentDate(addDays(startDate, days));
    };

    // Reset to start
    const handleReset = () => {
        setCurrentDate(startDate);
    };

    // Auto-play functionality
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                const current = useTerrainStore.getState().currentDate;
                const newDate = addDays(current, playbackSpeed);

                if (newDate > endDate) {
                    setCurrentDate(startDate);
                } else {
                    setCurrentDate(newDate);
                }
            }, 80);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, playbackSpeed, startDate, endDate, setCurrentDate]);

    return (
        <div className="px-6 py-4">
            <div className="flex items-center gap-4">
                {/* Date display */}
                <div className="w-28 shrink-0">
                    <span className="text-sm font-semibold">
                        {format(currentDate, "MMM yyyy")}
                    </span>
                </div>

                {/* Scrubber track */}
                <div className="flex-1 relative">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                            style={{ width: `${progress}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {/* Timeline markers */}
                    <div className="flex justify-between mt-1 text-[10px] text-foreground-muted px-1">
                        <span>{format(startDate, "MMM yy")}</span>
                        <span>{format(endDate, "MMM yy")}</span>
                    </div>
                </div>

                {/* Playback controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={handleReset}
                        className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
                        title="Reset to start"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                        onClick={togglePlayback}
                        className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                    </button>

                    <button
                        onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 3 : playbackSpeed === 3 ? 7 : 1)}
                        className="px-2.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-xs font-mono cursor-pointer"
                    >
                        {playbackSpeed}x
                    </button>
                </div>
            </div>
        </div>
    );
}
