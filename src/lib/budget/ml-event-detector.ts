/**
 * ML-Based Event Detector
 *
 * Replaces hard-coded calendar events with pattern learning from the user's
 * own transaction history. Detects ANY recurring spending spikes using
 * temporal clustering and IQR-based outlier detection.
 *
 * Algorithm:
 *   1. Group transactions by week-of-year and category (across years)
 *   2. Calculate baseline spending per category via IQR
 *   3. Identify spikes > Q3 + 1.5*IQR
 *   4. Validate recurrence: present in 2+ years within ±2 week window
 *   5. Enrich with merchant clustering to name the event
 */

import type { DetectedEvent, HistoricalSpending, EventSource, InsightReasoning } from '@/types/budget';
import { ReasoningBuilder, formatDollar, computeStats } from './decision-tracker';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Transaction {
    amount: number;
    category: string;
    date: string;
    name: string;
}

interface WeeklyBucket {
    weekOfYear: number;
    year: number;
    category: string;
    total: number;
    transactions: Transaction[];
    merchants: Record<string, number>; // merchant name → total
}

interface DetectedSpike {
    weekOfYear: number;
    category: string;
    averageSpike: number;
    baselineAverage: number;
    spikeMagnitude: number; // spike / baseline
    occurrences: Array<{ year: number; amount: number; topMerchants: string[] }>;
    confidence: 'high' | 'medium' | 'low';
    suggestedName: string;
    reasoning: InsightReasoning;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEEK-OF-YEAR UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function getWeekOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.ceil((diff / oneWeek) + 1);
}

function weekToApproximateDate(weekOfYear: number, year: number): Date {
    const jan1 = new Date(year, 0, 1);
    const daysOffset = (weekOfYear - 1) * 7;
    return new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: TEMPORAL AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

function buildWeeklyBuckets(transactions: Transaction[]): WeeklyBucket[] {
    const bucketMap: Record<string, WeeklyBucket> = {};

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const year = date.getFullYear();
        const weekOfYear = getWeekOfYear(date);
        const key = `${year}-${weekOfYear}-${tx.category}`;

        if (!bucketMap[key]) {
            bucketMap[key] = {
                weekOfYear,
                year,
                category: tx.category,
                total: 0,
                transactions: [],
                merchants: {},
            };
        }

        bucketMap[key].total += tx.amount;
        bucketMap[key].transactions.push(tx);

        const merchantName = tx.name.toLowerCase().trim();
        bucketMap[key].merchants[merchantName] =
            (bucketMap[key].merchants[merchantName] || 0) + tx.amount;
    });

    return Object.values(bucketMap);
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: BASELINE CALCULATION (IQR METHOD)
// ═══════════════════════════════════════════════════════════════════════════

interface CategoryBaseline {
    category: string;
    median: number;
    q1: number;
    q3: number;
    iqr: number;
    spikeThreshold: number; // Q3 + 1.5 * IQR
}

function calculateCategoryBaselines(buckets: WeeklyBucket[]): Record<string, CategoryBaseline> {
    const categoryWeeklyTotals: Record<string, number[]> = {};

    buckets.forEach(b => {
        if (!categoryWeeklyTotals[b.category]) {
            categoryWeeklyTotals[b.category] = [];
        }
        categoryWeeklyTotals[b.category].push(b.total);
    });

    const baselines: Record<string, CategoryBaseline> = {};

    Object.entries(categoryWeeklyTotals).forEach(([category, totals]) => {
        if (totals.length < 4) return; // Need enough data for IQR

        const stats = computeStats(totals);
        const iqr = stats.q3 - stats.q1;

        baselines[category] = {
            category,
            median: stats.median,
            q1: stats.q1,
            q3: stats.q3,
            iqr,
            spikeThreshold: stats.q3 + 1.5 * iqr,
        };
    });

    return baselines;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: SPIKE IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

interface RawSpike {
    weekOfYear: number;
    year: number;
    category: string;
    amount: number;
    baseline: CategoryBaseline;
    topMerchants: string[];
}

function identifySpikes(
    buckets: WeeklyBucket[],
    baselines: Record<string, CategoryBaseline>
): RawSpike[] {
    const spikes: RawSpike[] = [];

    buckets.forEach(bucket => {
        const baseline = baselines[bucket.category];
        if (!baseline) return;

        if (bucket.total > baseline.spikeThreshold) {
            // Get top merchants for this spike
            const sortedMerchants = Object.entries(bucket.merchants)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name]) => name);

            spikes.push({
                weekOfYear: bucket.weekOfYear,
                year: bucket.year,
                category: bucket.category,
                amount: bucket.total,
                baseline,
                topMerchants: sortedMerchants,
            });
        }
    });

    return spikes;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: RECURRENCE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateRecurrence(spikes: RawSpike[]): DetectedSpike[] {
    // Group spikes by category
    const categorySpikes: Record<string, RawSpike[]> = {};
    spikes.forEach(s => {
        if (!categorySpikes[s.category]) categorySpikes[s.category] = [];
        categorySpikes[s.category].push(s);
    });

    const detectedSpikes: DetectedSpike[] = [];

    Object.entries(categorySpikes).forEach(([category, catSpikes]) => {
        // Group by approximate week (±2 week window)
        const clusters: RawSpike[][] = [];

        const used = new Set<number>();

        catSpikes.forEach((spike, i) => {
            if (used.has(i)) return;

            const cluster = [spike];
            used.add(i);

            // Find other spikes within ±2 weeks in different years
            catSpikes.forEach((other, j) => {
                if (used.has(j)) return;
                if (other.year === spike.year) return; // Same year doesn't count

                const weekDiff = Math.abs(other.weekOfYear - spike.weekOfYear);
                if (weekDiff <= 2) {
                    cluster.push(other);
                    used.add(j);
                }
            });

            clusters.push(cluster);
        });

        // Only keep clusters with 2+ occurrences (years)
        clusters.forEach(cluster => {
            const uniqueYears = new Set(cluster.map(s => s.year));
            if (uniqueYears.size < 2) return;

            const avgWeek = Math.round(
                cluster.reduce((sum, s) => sum + s.weekOfYear, 0) / cluster.length
            );
            const avgAmount = cluster.reduce((sum, s) => sum + s.amount, 0) / cluster.length;
            const baseline = cluster[0].baseline;

            // Gather all merchants across years
            const allMerchants: Record<string, number> = {};
            cluster.forEach(s => {
                s.topMerchants.forEach(m => {
                    allMerchants[m] = (allMerchants[m] || 0) + 1;
                });
            });

            const topMerchant = Object.entries(allMerchants)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

            // Generate name
            const suggestedName = generateEventName(
                avgWeek,
                category,
                topMerchant,
                cluster.map(s => s.topMerchants).flat()
            );

            // Confidence: high if 3+ years, medium if 2
            const confidence = uniqueYears.size >= 3 ? 'high' : 'medium';

            // Build reasoning
            const reasoning = new ReasoningBuilder()
                .setDataSource(`${uniqueYears.size} years of ${category} transaction history`)
                .addDataStep(
                    'Historical Spending Analyzed',
                    `Analyzed weekly ${category} spending across ${uniqueYears.size} years`,
                    cluster.map(s => ({
                        label: `Year ${s.year}`,
                        value: Math.round(s.amount),
                        unit: '$',
                    }))
                )
                .addAnalysisStep(
                    'Spike Detection (IQR Method)',
                    `Baseline weekly ${category} spending: ${formatDollar(baseline.median)} median. ` +
                    `Spike threshold: ${formatDollar(baseline.spikeThreshold)} (Q3 + 1.5×IQR). ` +
                    `Detected spending at ${formatDollar(avgAmount)} (${(avgAmount / baseline.median).toFixed(1)}x baseline).`,
                    [
                        { label: 'Baseline (median)', value: Math.round(baseline.median), unit: '$' },
                        { label: 'Spike threshold', value: Math.round(baseline.spikeThreshold), unit: '$' },
                        { label: 'Average spike', value: Math.round(avgAmount), unit: '$' },
                    ]
                )
                .addAnalysisStep(
                    'Recurrence Validated',
                    `This spike recurs in ${uniqueYears.size} out of the observed years, ` +
                    `consistently in week ${avgWeek} (±2 weeks). Top merchant: "${topMerchant}".`
                )
                .addDecisionStep(
                    'Event Created',
                    `Created "${suggestedName}" event with estimated cost of ${formatDollar(avgAmount - baseline.median)} above normal.`,
                    [
                        { label: 'Estimated extra cost', value: Math.round(avgAmount - baseline.median), unit: '$' },
                        { label: 'Confidence', value: confidence },
                    ]
                )
                .setConfidence(confidence === 'high' ? 0.9 : 0.7)
                .addAlternative('Dismiss this event if it no longer applies')
                .addAlternative('Create a savings goal to prepare')
                .addAlternative('Reduce category budget for that month')
                .build();

            detectedSpikes.push({
                weekOfYear: avgWeek,
                category,
                averageSpike: avgAmount,
                baselineAverage: baseline.median,
                spikeMagnitude: avgAmount / baseline.median,
                occurrences: cluster.map(s => ({
                    year: s.year,
                    amount: s.amount,
                    topMerchants: s.topMerchants,
                })),
                confidence,
                suggestedName,
                reasoning,
            });
        });
    });

    return detectedSpikes;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: EVENT NAMING (MERCHANT CLUSTERING + TEMPORAL CONTEXT)
// ═══════════════════════════════════════════════════════════════════════════

function generateEventName(
    weekOfYear: number,
    category: string,
    topMerchant: string,
    allMerchants: string[]
): string {
    const approxDate = weekToApproximateDate(weekOfYear, new Date().getFullYear());
    const monthName = MONTH_NAMES[approxDate.getMonth()];

    // Try to identify known patterns from merchant names
    const merchantLower = allMerchants.join(' ').toLowerCase();

    // Auto-registration / DMV patterns
    if (merchantLower.includes('dmv') || merchantLower.includes('registration') || merchantLower.includes('dept of motor')) {
        return 'Annual Vehicle Registration';
    }

    // Insurance patterns
    if (merchantLower.includes('insurance') || merchantLower.includes('geico') || merchantLower.includes('allstate') ||
        merchantLower.includes('progressive') || merchantLower.includes('state farm')) {
        return `${category} Insurance Renewal`;
    }

    // Tax patterns
    if (merchantLower.includes('irs') || merchantLower.includes('tax') || merchantLower.includes('turbo')) {
        return 'Tax Payment / Filing';
    }

    // Medical patterns
    if (merchantLower.includes('doctor') || merchantLower.includes('dental') || merchantLower.includes('medical') ||
        merchantLower.includes('pharmacy') || merchantLower.includes('hospital')) {
        return `Annual ${category} Checkup`;
    }

    // Subscription / renewal patterns
    if (merchantLower.includes('renewal') || merchantLower.includes('annual') || merchantLower.includes('membership')) {
        return `Annual ${topMerchant} Renewal`;
    }

    // Fall back to month + category + merchant hint
    if (topMerchant && topMerchant.length > 2) {
        const cleanMerchant = topMerchant
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .slice(0, 3)
            .join(' ');
        return `${monthName} ${category} (${cleanMerchant})`;
    }

    return `${monthName} ${category} Spike`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the full ML event detection pipeline.
 * Returns an array of DetectedEvent-compatible objects with reasoning.
 */
export function detectMLEvents(
    transactions: Transaction[],
    daysAhead: number = 90
): Array<Partial<DetectedEvent> & { reasoning: InsightReasoning }> {
    if (transactions.length < 20) return []; // Not enough data

    // Pipeline
    const buckets = buildWeeklyBuckets(transactions);
    const baselines = calculateCategoryBaselines(buckets);
    const rawSpikes = identifySpikes(buckets, baselines);
    const validatedSpikes = validateRecurrence(rawSpikes);

    // Convert to DetectedEvent format, filtering to upcoming only
    const today = new Date();
    const currentWeek = getWeekOfYear(today);
    const currentYear = today.getFullYear();

    const events: Array<Partial<DetectedEvent> & { reasoning: InsightReasoning }> = [];

    validatedSpikes.forEach(spike => {
        // Calculate the next occurrence of this spike
        let eventDate: Date;

        if (spike.weekOfYear > currentWeek) {
            eventDate = weekToApproximateDate(spike.weekOfYear, currentYear);
        } else {
            eventDate = weekToApproximateDate(spike.weekOfYear, currentYear + 1);
        }

        const daysAway = Math.ceil(
            (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysAway > daysAhead || daysAway < 0) return;

        const extraCost = Math.round(spike.averageSpike - spike.baselineAverage);

        events.push({
            eventName: spike.suggestedName,
            eventDate: eventDate.toISOString().split('T')[0],
            category: spike.category,
            estimatedCost: Math.max(extraCost, Math.round(spike.averageSpike * 0.5)),
            source: 'historical' as EventSource,
            confidence: spike.confidence,
            historicalData: spike.occurrences.map(o => ({
                year: o.year,
                amount: Math.round(o.amount),
            })),
            actionableAdvice:
                `You typically spend ${formatDollar(extraCost)} more on ${spike.category} around this time. ` +
                `Based on ${spike.occurrences.length} years of data. ` +
                `Consider setting aside funds ${daysAway > 30 ? 'starting now' : 'immediately'}.`,
            isDismissed: false,
            daysAway,
            urgency: daysAway <= 7 ? 'high' : daysAway <= 21 ? 'medium' : 'low',
            reasoning: spike.reasoning,
        });
    });

    // Sort by urgency (days away ascending)
    events.sort((a, b) => (a.daysAway || 999) - (b.daysAway || 999));

    return events;
}

/**
 * Merge ML-detected events with calendar events, deduplicating.
 * ML events that overlap (same category, within 14 days) with calendar events are merged.
 */
export function mergeWithCalendarEvents(
    mlEvents: Array<Partial<DetectedEvent> & { reasoning: InsightReasoning }>,
    calendarEvents: Partial<DetectedEvent>[]
): Array<Partial<DetectedEvent> & { reasoning?: InsightReasoning }> {
    const merged: Array<Partial<DetectedEvent> & { reasoning?: InsightReasoning }> = [];

    // Add all calendar events first (they get priority on naming)
    calendarEvents.forEach(calEvent => {
        // Check if there's an ML event for the same period + category
        const matchingML = mlEvents.find(ml => {
            if (ml.category !== calEvent.category) return false;
            const calDate = new Date(calEvent.eventDate!).getTime();
            const mlDate = new Date(ml.eventDate!).getTime();
            return Math.abs(calDate - mlDate) < 14 * 24 * 60 * 60 * 1000;
        });

        if (matchingML) {
            // Merge: use calendar name but ML's estimated cost & reasoning
            merged.push({
                ...calEvent,
                estimatedCost: matchingML.estimatedCost,
                historicalData: matchingML.historicalData || calEvent.historicalData,
                confidence: 'high', // Both sources agree
                reasoning: matchingML.reasoning,
                actionableAdvice:
                    calEvent.actionableAdvice +
                    ` Your past spending confirms this pattern (${matchingML.historicalData?.length || 'multiple'} years).`,
            });
        } else {
            merged.push(calEvent);
        }
    });

    // Add ML events that weren't matched to any calendar event
    mlEvents.forEach(mlEvent => {
        const alreadyMerged = merged.some(m => {
            if (m.category !== mlEvent.category) return false;
            const mDate = new Date(m.eventDate!).getTime();
            const mlDate = new Date(mlEvent.eventDate!).getTime();
            return Math.abs(mDate - mlDate) < 14 * 24 * 60 * 60 * 1000;
        });

        if (!alreadyMerged) {
            merged.push(mlEvent);
        }
    });

    // Sort by date
    merged.sort((a, b) => {
        const dateA = new Date(a.eventDate!).getTime();
        const dateB = new Date(b.eventDate!).getTime();
        return dateA - dateB;
    });

    return merged;
}
