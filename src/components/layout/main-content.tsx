'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { navbarHidden } = useUIStore();
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';

  return (
    <main
      className={cn(
        'relative z-10 transition-all duration-300',
        // Dashboard is a "single-screen" layout: no page scroll, internal areas handle overflow.
        isDashboard ? 'h-[100dvh] overflow-hidden flex flex-col' : 'min-h-screen',
        // Default page gutters (keep consistent spacing across the app).
        // Dashboard needs extra bottom breathing room since it's non-scrollable.
        'px-6 md:px-8 py-6 md:py-8',
        // The dashboard is intentionally non-scrollable; leave visible "floor space" under the bottom row.
        isDashboard
          ? 'pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-[calc(5rem+env(safe-area-inset-bottom))]'
          : 'pb-20 md:pb-8',
        navbarHidden ? '' : 'md:ml-[200px]'
      )}
    >
      <div
        className={cn(
          'mx-auto',
          navbarHidden ? 'max-w-none' : 'max-w-6xl',
          // Make the inner wrapper fill the available space inside the padded main area.
          isDashboard ? 'flex-1 min-h-0 h-full' : ''
        )}
      >
        {children}
      </div>
    </main>
  );
}
