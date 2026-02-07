'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { navbarHidden } = useUIStore();

  return (
    <main
      className={cn(
        'relative z-10 px-6 md:px-8 py-6 md:py-8 pb-20 md:pb-8 min-h-screen transition-all duration-300',
        navbarHidden ? '' : 'md:ml-[200px]'
      )}
    >
      <div className={cn('mx-auto', navbarHidden ? 'max-w-none' : 'max-w-6xl')}>
        {children}
      </div>
    </main>
  );
}
