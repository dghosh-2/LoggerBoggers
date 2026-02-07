'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useFinancialDataStore } from '@/stores/financial-data-store';
import { refreshGlobalFinancialData } from '@/hooks/useFinancialData';

const ROUTES_TO_PREFETCH = [
  '/dashboard',
  '/budget',
  '/studio',
  '/insights',
  '/globe',
  '/stocks',
  '/imports',
  '/portfolio',
  '/receipts',
  '/timemachine',
] as const;

function runWhenIdle(fn: () => void) {
  const w = globalThis as any;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(fn, { timeout: 1500 });
    return () => {
      if (typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(id);
    };
  }

  const t = setTimeout(fn, 250);
  return () => clearTimeout(t);
}

export function AppPrefetcher() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const didRoutes = useRef(false);
  const didData = useRef(false);

  // (1) Route prefetch: warm client bundles/RSC payloads for primary pages.
  useEffect(() => {
    if (didRoutes.current) return;
    didRoutes.current = true;

    const cleanup = runWhenIdle(() => {
      for (const href of ROUTES_TO_PREFETCH) {
        try {
          router.prefetch(href);
        } catch {
          // best-effort
        }
      }
    });

    return cleanup;
  }, [router]);

  // (3) Data prefetch: warm the financial data cache and a couple of “next click” APIs.
  useEffect(() => {
    if (!isInitialized) return;
    if (!user) return;
    if (didData.current) return;
    didData.current = true;

    // Keep this from re-running on soft navigations in a single tab session.
    try {
      const key = 'app_prefetch_v1';
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore
    }

    const cleanup = runWhenIdle(() => {
      const store = useFinancialDataStore.getState();
      if (store.shouldRefetch()) {
        void refreshGlobalFinancialData();
      }

      // These are used on Dashboard/Globe and benefit from a warmed network+server cache.
      void fetch('/api/data/top-holdings?movers=4&quoteMax=30').catch(() => {});
      void fetch('/api/data/locations?timeframe=month').catch(() => {});
    });

    return cleanup;
  }, [isInitialized, user]);

  return null;
}

