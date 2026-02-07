"use client";

import { useTerrainStore } from "@/stores/terrain-store";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { id: "Rent", label: "Rent", color: "#8B7355" },
    { id: "Bills", label: "Bills", color: "#A0826D" },
    { id: "Groceries", label: "Groceries", color: "#D4A574" },
    { id: "Food", label: "Dining", color: "#FF6B6B" },
    { id: "Entertainment", label: "Entertain", color: "#A78BFA" },
    { id: "Shopping", label: "Shopping", color: "#F472B6" },
    { id: "Transport", label: "Transport", color: "#FB923C" },
    { id: "Subscriptions", label: "Subs", color: "#818CF8" },
];

export function CategoryToggles() {
    const { activeCategories, toggleCategory, setAllCategories } = useTerrainStore();

    return (
        <div className="px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2">
                {/* Quick actions */}
                <div className="flex items-center gap-1 mr-2">
                    <button
                        onClick={() => setAllCategories(true)}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        All
                    </button>
                    <button
                        onClick={() => setAllCategories(false)}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-secondary text-foreground-muted hover:bg-secondary/80 transition-colors cursor-pointer"
                    >
                        None
                    </button>
                </div>

                <div className="w-px h-5 bg-border" />

                {/* Category pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategories.has(cat.id);

                        return (
                            <button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer",
                                    isActive
                                        ? "bg-secondary text-foreground"
                                        : "bg-transparent text-foreground-muted opacity-40 hover:opacity-60"
                                )}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                                    style={{
                                        backgroundColor: isActive ? cat.color : "transparent",
                                        border: `1.5px solid ${cat.color}`,
                                    }}
                                />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
