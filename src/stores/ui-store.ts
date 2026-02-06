import { create } from "zustand";

interface UIState {
  navbarHidden: boolean;
  setNavbarHidden: (hidden: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  navbarHidden: false,
  setNavbarHidden: (hidden) => set({ navbarHidden: hidden }),
}));
