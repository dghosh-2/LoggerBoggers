import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
}));
