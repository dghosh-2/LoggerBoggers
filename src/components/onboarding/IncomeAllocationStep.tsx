'use client';

import { useMemo } from 'react';
import { STANDARD_CATEGORIES } from '@/lib/categories';

export type IncomeAllocation = {
  savingsPercent: number;
  categories: Record<string, number>;
};

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function makeDefaultIncomeAllocation(savingsPercent: number = 20): IncomeAllocation {
  const savings = clamp(savingsPercent, 0, 100);
  const remainder = 100 - savings;
  const per = remainder / STANDARD_CATEGORIES.length;
  const categories: Record<string, number> = {};
  for (const c of STANDARD_CATEGORIES) categories[c] = per;
  return { savingsPercent: savings, categories };
}

export function normalizeIncomeAllocation(allocation: IncomeAllocation): IncomeAllocation {
  const savings = clamp(allocation.savingsPercent, 0, 100);
  const remainder = 100 - savings;
  const next: Record<string, number> = {};

  // Ensure all categories exist
  for (const c of STANDARD_CATEGORIES) {
    const v = Number(allocation.categories?.[c] ?? 0);
    next[c] = clamp(v, 0, 100);
  }

  const sum = STANDARD_CATEGORIES.reduce((acc, c) => acc + next[c], 0);
  if (sum <= 0) {
    const per = remainder / STANDARD_CATEGORIES.length;
    for (const c of STANDARD_CATEGORIES) next[c] = per;
    return { savingsPercent: savings, categories: next };
  }

  const scale = remainder / sum;
  for (const c of STANDARD_CATEGORIES) next[c] = next[c] * scale;
  return { savingsPercent: savings, categories: next };
}

export function getIncomeAllocationTotal(allocation: IncomeAllocation): number {
  const savings = Number(allocation.savingsPercent || 0);
  const catSum = STANDARD_CATEGORIES.reduce(
    (acc, c) => acc + Number(allocation.categories?.[c] ?? 0),
    0
  );
  return savings + catSum;
}

export function IncomeAllocationStep({
  value,
  onChange,
}: {
  value: IncomeAllocation;
  onChange: (next: IncomeAllocation) => void;
}) {
  const total = useMemo(() => getIncomeAllocationTotal(value), [value]);
  const remainder = useMemo(() => 100 - clamp(value.savingsPercent, 0, 100), [value.savingsPercent]);
  const catSum = useMemo(
    () => STANDARD_CATEGORIES.reduce((acc, c) => acc + Number(value.categories?.[c] ?? 0), 0),
    [value.categories]
  );

  const isValid = Math.abs(total - 100) < 0.01 && value.savingsPercent >= 0 && value.savingsPercent <= 100;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Savings</p>
            <p className="text-xs text-foreground-muted">Percent of your income you want to save.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Number.isFinite(value.savingsPercent) ? Math.round(value.savingsPercent) : 0}
              onChange={(e) => {
                const savingsPercent = clamp(Number(e.target.value), 0, 100);
                // Keep it low-friction: when savings changes, redistribute spending evenly.
                onChange(makeDefaultIncomeAllocation(savingsPercent));
              }}
              className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
            />
            <span className="text-sm text-foreground-muted">%</span>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={clamp(Math.round(value.savingsPercent), 0, 100)}
          onChange={(e) => onChange(makeDefaultIncomeAllocation(Number(e.target.value)))}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-foreground-muted">
          Spending allocation must total <span className="font-mono">{Math.round(remainder)}%</span>.
          {' '}
          Current: <span className="font-mono">{Math.round(catSum)}%</span>.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(makeDefaultIncomeAllocation(value.savingsPercent))}
            className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            Distribute Evenly
          </button>
          <button
            type="button"
            onClick={() => onChange(normalizeIncomeAllocation(value))}
            className="px-3 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Normalize
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STANDARD_CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="text-sm font-medium">{cat}</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={Number.isFinite(value.categories?.[cat]) ? Math.round(value.categories[cat]) : 0}
                onChange={(e) => {
                  const v = clamp(Number(e.target.value), 0, 100);
                  onChange({
                    savingsPercent: value.savingsPercent,
                    categories: { ...value.categories, [cat]: v },
                  });
                }}
                className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground"
              />
              <span className="text-sm text-foreground-muted">%</span>
            </div>
          </div>
        ))}
      </div>

      {!isValid && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">
            Your allocation must add up to 100%. Current total: <span className="font-mono">{total.toFixed(1)}%</span>.
          </p>
        </div>
      )}
    </div>
  );
}
