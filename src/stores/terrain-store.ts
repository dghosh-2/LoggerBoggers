import { create } from "zustand";

export interface TerrainState {
    // Modal visibility
    isOpen: boolean;
    isLoading: boolean;
    loadingProgress: number;
    loadingMessage: string;

    // Time control
    currentDate: Date;
    startDate: Date;
    endDate: Date;
    isPlaying: boolean;
    playbackSpeed: number;

    // Category toggles
    activeCategories: Set<string>;

    // Simulation overlay
    showSimulation: boolean;

    // Camera
    cameraMode: "manual" | "tour";

    // Actions
    openTerrain: () => void;
    closeTerrain: () => void;
    setCurrentDate: (date: Date) => void;
    toggleCategory: (category: string) => void;
    setAllCategories: (active: boolean) => void;
    toggleSimulation: () => void;
    togglePlayback: () => void;
    setPlaybackSpeed: (speed: number) => void;
    setLoading: (loading: boolean, progress?: number, message?: string) => void;
}

const ALL_CATEGORIES = new Set([
    "Bills & Utilities",
    "Education",
    "Entertainment",
    "Food & Drink",
    "Health & Fitness",
    "Personal Care",
    "Shopping",
    "Transportation",
    "Travel",
    "Other",
]);

export const useTerrainStore = create<TerrainState>((set, get) => ({
    isOpen: false,
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: "",

    currentDate: new Date(),
    startDate: new Date("2025-01-01"),
    endDate: new Date("2026-02-01"),
    isPlaying: false,
    playbackSpeed: 1,

    activeCategories: new Set(ALL_CATEGORIES),
    showSimulation: false,
    cameraMode: "manual",

    openTerrain: () => {
        set({ isOpen: true, isLoading: true, loadingProgress: 0 });

        // Simulate loading progression
        const messages = [
            "Analyzing transactions...",
            "Calculating balance history...",
            "Generating terrain geometry...",
            "Applying category colors...",
            "Creating landmarks...",
            "Finalizing your landscape...",
        ];

        let progress = 0;
        const interval = setInterval(() => {
            progress += 15;
            const messageIndex = Math.min(Math.floor(progress / 17), messages.length - 1);

            if (progress >= 100) {
                clearInterval(interval);
                set({ isLoading: false, loadingProgress: 100, loadingMessage: "Ready!" });
            } else {
                set({ loadingProgress: progress, loadingMessage: messages[messageIndex] });
            }
        }, 400);
    },

    closeTerrain: () => {
        set({ isOpen: false, isLoading: false, isPlaying: false });
    },

    setCurrentDate: (date) => {
        set({ currentDate: date });
    },

    toggleCategory: (category) => {
        const current = get().activeCategories;
        const updated = new Set(current);
        if (updated.has(category)) {
            updated.delete(category);
        } else {
            updated.add(category);
        }
        set({ activeCategories: updated });
    },

    setAllCategories: (active) => {
        set({ activeCategories: active ? new Set(ALL_CATEGORIES) : new Set() });
    },

    toggleSimulation: () => {
        set((state) => ({ showSimulation: !state.showSimulation }));
    },

    togglePlayback: () => {
        set((state) => ({ isPlaying: !state.isPlaying }));
    },

    setPlaybackSpeed: (speed) => {
        set({ playbackSpeed: speed });
    },

    setLoading: (loading, progress = 0, message = "") => {
        set({ isLoading: loading, loadingProgress: progress, loadingMessage: message });
    },
}));
