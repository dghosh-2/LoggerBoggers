import { create } from "zustand";

interface UIState {
  navbarHidden: boolean;
  setNavbarHidden: (hidden: boolean) => void;
  chatHidden: boolean;
  setChatHidden: (hidden: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  navbarHidden: false,
  setNavbarHidden: (hidden) => set({ navbarHidden: hidden }),
  chatHidden: false,
  setChatHidden: (hidden) => set({ chatHidden: hidden }),
}));
