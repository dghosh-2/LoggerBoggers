"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/stores/theme-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors duration-100 cursor-pointer"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Moon className="w-3.5 h-3.5 text-foreground-muted" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-foreground-muted" />
      )}
    </button>
  );
}
