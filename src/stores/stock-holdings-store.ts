import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ManualStockHolding {
    id: string;
    symbol: string;
    name: string;
    shares: number;
    currentPrice: number;
    totalValue: number;
    change: number;
    changePercent: number;
    addedAt: string;
    lastUpdated: string;
}

interface StockHoldingsState {
    holdings: ManualStockHolding[];
    isLoading: boolean;
    
    // Actions
    addHolding: (holding: Omit<ManualStockHolding, 'id' | 'addedAt'>) => void;
    updateHolding: (id: string, updates: Partial<ManualStockHolding>) => void;
    removeHolding: (id: string) => void;
    updatePrices: (prices: Record<string, { price: number; change: number; changePercent: number }>) => void;
    setLoading: (loading: boolean) => void;
    clearAll: () => void;
    
    // Computed
    getTotalValue: () => number;
}

export const useStockHoldingsStore = create<StockHoldingsState>()(
    persist(
        (set, get) => ({
            holdings: [],
            isLoading: false,

            addHolding: (holding) => {
                const newHolding: ManualStockHolding = {
                    ...holding,
                    id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    addedAt: new Date().toISOString(),
                };
                set((state) => ({
                    holdings: [...state.holdings, newHolding],
                }));
            },

            updateHolding: (id, updates) => {
                set((state) => ({
                    holdings: state.holdings.map((h) =>
                        h.id === id ? { ...h, ...updates, lastUpdated: new Date().toISOString() } : h
                    ),
                }));
            },

            removeHolding: (id) => {
                set((state) => ({
                    holdings: state.holdings.filter((h) => h.id !== id),
                }));
            },

            updatePrices: (prices) => {
                set((state) => ({
                    holdings: state.holdings.map((h) => {
                        const priceData = prices[h.symbol];
                        if (priceData) {
                            return {
                                ...h,
                                currentPrice: priceData.price,
                                totalValue: h.shares * priceData.price,
                                change: priceData.change,
                                changePercent: priceData.changePercent,
                                lastUpdated: new Date().toISOString(),
                            };
                        }
                        return h;
                    }),
                }));
            },

            setLoading: (loading) => set({ isLoading: loading }),

            clearAll: () => set({ holdings: [] }),

            getTotalValue: () => {
                return get().holdings.reduce((sum, h) => sum + h.totalValue, 0);
            },
        }),
        {
            name: 'stock-holdings-storage',
        }
    )
);
