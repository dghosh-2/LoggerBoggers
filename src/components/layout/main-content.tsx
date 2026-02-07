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
        isDashboard ? 'h-[100dvh] overflow-hidden' : 'min-h-screen',
        // Default page gutters (slightly tighter on dashboard so the 2x2 tiles can breathe).
        isDashboard ? 'px-4 md:px-6 py-4 md:py-6 pb-20 md:pb-6' : 'px-6 md:px-8 py-6 md:py-8 pb-20 md:pb-8',
        navbarHidden ? '' : 'md:ml-[200px]'
      )}
    >
      <div
        className={cn(
          'mx-auto',
          navbarHidden ? 'max-w-none' : isDashboard ? 'max-w-none' : 'max-w-6xl'
        )}
      >
        {children}
      </div>
    </main>
  );
}
