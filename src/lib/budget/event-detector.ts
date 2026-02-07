/**
 * Event Detector
 * 
 * Identifies upcoming events that may impact the user's budget:
 * - Historical spending spikes (same time last year)
 * - Calendar events (holidays, tax day, etc.)
 * - User-created custom events
 */

import type { DetectedEvent, HistoricalSpending, EventSource } from '@/types/budget';

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR EVENTS
// ═══════════════════════════════════════════════════════════════════════════

interface CalendarEvent {
    name: string;
    emoji: string;
    getDate: (year: number) => Date;
    category: string;
    estimatedCost: number;
    advice: string;
}

// Major calendar events that typically impact spending
const CALENDAR_EVENTS: CalendarEvent[] = [
    {
        name: "Valentine's Day",
        emoji: '💝',
        getDate: (year) => new Date(year, 1, 14), // Feb 14
        category: 'Shopping',
        estimatedCost: 150,
        advice: 'Consider homemade gifts or experience-based presents to save money.',
    },
    {
        name: "Super Bowl",
        emoji: '🏈',
        getDate: (year) => {
            // First Sunday of February (approximate)
            const feb1 = new Date(year, 1, 1);
            const dayOfWeek = feb1.getDay();
            const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
            return new Date(year, 1, firstSunday);
        },
        category: 'Dining',
        estimatedCost: 120,
        advice: 'Host at home instead of going out. Stock up on snacks a few days early to avoid price surges.',
    },
    {
        name: "Mother's Day",
        emoji: '💐',
        getDate: (year) => {
            // Second Sunday in May
            const may1 = new Date(year, 4, 1);
            const dayOfWeek = may1.getDay();
            const secondSunday = dayOfWeek === 0 ? 8 : 15 - dayOfWeek;
            return new Date(year, 4, secondSunday);
        },
        category: 'Shopping',
        estimatedCost: 100,
        advice: 'Book restaurants early or plan a homemade brunch to save on dining costs.',
    },
    {
        name: "Father's Day",
        emoji: '👔',
        getDate: (year) => {
            // Third Sunday in June
            const june1 = new Date(year, 5, 1);
            const dayOfWeek = june1.getDay();
            const thirdSunday = dayOfWeek === 0 ? 15 : 22 - dayOfWeek;
            return new Date(year, 5, thirdSunday);
        },
        category: 'Shopping',
        estimatedCost: 80,
        advice: 'Focus on meaningful experiences rather than expensive gifts.',
    },
    {
        name: "Independence Day",
        emoji: '🎆',
        getDate: (year) => new Date(year, 6, 4), // July 4
        category: 'Dining',
        estimatedCost: 100,
        advice: 'Buy supplies for BBQ in advance. Check for firework discounts at warehouse stores.',
    },
    {
        name: "Halloween",
        emoji: '🎃',
        getDate: (year) => new Date(year, 9, 31), // Oct 31
        category: 'Shopping',
        estimatedCost: 75,
        advice: 'DIY costumes save money. Buy candy in bulk or right after Halloween for next year.',
    },
    {
        name: "Thanksgiving",
        emoji: '🦃',
        getDate: (year) => {
            // Fourth Thursday in November
            const nov1 = new Date(year, 10, 1);
            const dayOfWeek = nov1.getDay();
            const fourthThursday = dayOfWeek <= 4 ? 22 + (4 - dayOfWeek) : 29 - (dayOfWeek - 4);
            return new Date(year, 10, fourthThursday);
        },
        category: 'Groceries',
        estimatedCost: 150,
        advice: 'Shop early for non-perishables. Compare prices at multiple stores.',
    },
    {
        name: "Black Friday",
        emoji: '🛍️',
        getDate: (year) => {
            // Day after Thanksgiving
            const nov1 = new Date(year, 10, 1);
            const dayOfWeek = nov1.getDay();
            const fourthThursday = dayOfWeek <= 4 ? 22 + (4 - dayOfWeek) : 29 - (dayOfWeek - 4);
            return new Date(year, 10, fourthThursday + 1);
        },
        category: 'Shopping',
        estimatedCost: 300,
        advice: 'Make a list beforehand and stick to it. Many "deals" are inflated before discounting.',
    },
    {
        name: "Christmas",
        emoji: '🎄',
        getDate: (year) => new Date(year, 11, 25), // Dec 25
        category: 'Shopping',
        estimatedCost: 500,
        advice: 'Start saving months ahead. Consider Secret Santa to reduce gift count.',
    },
    {
        name: "New Year's Eve",
        emoji: '🎉',
        getDate: (year) => new Date(year, 11, 31), // Dec 31
        category: 'Dining',
        estimatedCost: 150,
        advice: 'Host a house party instead of expensive venue tickets.',
    },
    {
        name: "Tax Day",
        emoji: '📋',
        getDate: (year) => new Date(year, 3, 15), // April 15
        category: 'Other',
        estimatedCost: 200,
        advice: 'Set aside money for potential tax payments. Consider free filing options.',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// HISTORICAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

interface Transaction {
    amount: number;
    category: string;
    date: string;
    name: string;
}

/**
 * Detect spending spikes from historical data
 * Looks for periods where spending was significantly above average
 */
export function detectHistoricalSpikes(
    transactions: Transaction[],
    yearsOfData: number = 2
): Array<{
    month: number;
    weekOfMonth: number;
    category: string;
    averageSpike: number;
    years: HistoricalSpending[];
}> {
    const spikes: Array<{
        month: number;
        weekOfMonth: number;
        category: string;
        averageSpike: number;
        years: HistoricalSpending[];
    }> = [];

    // Group transactions by category and week-of-year
    const weeklySpending: Record<string, Record<string, number[]>> = {};

    transactions.forEach(tx => {
        const date = new Date(tx.date);
        const year = date.getFullYear();
        const weekKey = `${date.getMonth()}-${Math.ceil(date.getDate() / 7)}`;

        if (!weeklySpending[tx.category]) {
            weeklySpending[tx.category] = {};
        }
        if (!weeklySpending[tx.category][weekKey]) {
            weeklySpending[tx.category][weekKey] = [];
        }

        // Store as [year, amount]
        const existingIndex = weeklySpending[tx.category][weekKey].findIndex((_, i, arr) =>
            i % 2 === 0 && arr[i] === year
        );

        if (existingIndex >= 0) {
            weeklySpending[tx.category][weekKey][existingIndex + 1] += tx.amount;
        } else {
            weeklySpending[tx.category][weekKey].push(year, tx.amount);
        }
    });

    // Calculate average spending per week per category
    Object.entries(weeklySpending).forEach(([category, weeks]) => {
        // Get all weekly totals for this category
        const allWeeklyTotals: number[] = [];

        Object.values(weeks).forEach(yearAmounts => {
            for (let i = 1; i < yearAmounts.length; i += 2) {
                allWeeklyTotals.push(yearAmounts[i]);
            }
        });

        if (allWeeklyTotals.length < 2) return;

        const avgWeekly = allWeeklyTotals.reduce((a, b) => a + b, 0) / allWeeklyTotals.length;
        const spikeThreshold = avgWeekly * 1.3; // 30% above average

        // Find weeks with consistent spikes
        Object.entries(weeks).forEach(([weekKey, yearAmounts]) => {
            const [month, weekOfMonth] = weekKey.split('-').map(Number);
            const years: HistoricalSpending[] = [];

            for (let i = 0; i < yearAmounts.length; i += 2) {
                years.push({ year: yearAmounts[i], amount: yearAmounts[i + 1] });
            }

            // Need at least 2 years of data showing spike
            const spikeYears = years.filter(y => y.amount > spikeThreshold);

            if (spikeYears.length >= 2) {
                const averageSpike = spikeYears.reduce((sum, y) => sum + y.amount, 0) / spikeYears.length;

                spikes.push({
                    month,
                    weekOfMonth,
                    category,
                    averageSpike,
                    years: spikeYears,
                });
            }
        });
    });

    return spikes;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get upcoming calendar events within the specified timeframe
 */
export function getUpcomingCalendarEvents(
    daysAhead: number = 90,
    historicalTransactions?: Transaction[]
): Partial<DetectedEvent>[] {
    const today = new Date();
    const endDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const currentYear = today.getFullYear();

    const events: Partial<DetectedEvent>[] = [];

    CALENDAR_EVENTS.forEach(calEvent => {
        // Check this year and next year
        [currentYear, currentYear + 1].forEach(year => {
            const eventDate = calEvent.getDate(year);

            if (eventDate >= today && eventDate <= endDate) {
                // Get historical data if available
                let historicalData: HistoricalSpending[] | null = null;
                let estimatedCost = calEvent.estimatedCost;

                if (historicalTransactions) {
                    // Look for spending around this date in previous years
                    const eventMonth = eventDate.getMonth();
                    const eventDay = eventDate.getDate();

                    historicalData = [];

                    for (let pastYear = year - 1; pastYear >= year - 3; pastYear--) {
                        const windowStart = new Date(pastYear, eventMonth, eventDay - 7);
                        const windowEnd = new Date(pastYear, eventMonth, eventDay + 7);

                        const periodSpending = historicalTransactions
                            .filter(tx => {
                                const txDate = new Date(tx.date);
                                return txDate >= windowStart &&
                                    txDate <= windowEnd &&
                                    tx.category === calEvent.category;
                            })
                            .reduce((sum, tx) => sum + tx.amount, 0);

                        if (periodSpending > 0) {
                            historicalData.push({ year: pastYear, amount: periodSpending });
                        }
                    }

                    // Use historical average if available
                    if (historicalData.length > 0) {
                        estimatedCost = historicalData.reduce((sum, h) => sum + h.amount, 0) / historicalData.length;
                    }
                }

                const daysAway = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                events.push({
                    eventName: `${calEvent.emoji} ${calEvent.name}`,
                    eventDate: eventDate.toISOString().split('T')[0],
                    category: calEvent.category,
                    estimatedCost: Math.round(estimatedCost),
                    source: 'calendar' as EventSource,
                    confidence: 'high',
                    historicalData: historicalData && historicalData.length > 0 ? historicalData : null,
                    actionableAdvice: calEvent.advice,
                    isDismissed: false,
                    daysAway,
                    urgency: daysAway <= 7 ? 'high' : daysAway <= 21 ? 'medium' : 'low',
                });
            }
        });
    });

    // Sort by date
    events.sort((a, b) => {
        const dateA = new Date(a.eventDate!).getTime();
        const dateB = new Date(b.eventDate!).getTime();
        return dateA - dateB;
    });

    return events;
}

/**
 * Combine all event sources
 */
export function getAllUpcomingEvents(
    transactions: Transaction[],
    daysAhead: number = 90
): Partial<DetectedEvent>[] {
    // Get calendar events with historical data
    const calendarEvents = getUpcomingCalendarEvents(daysAhead, transactions);

    // Detect historical spikes and create events
    const spikes = detectHistoricalSpikes(transactions);
    const spikeEvents: Partial<DetectedEvent>[] = [];

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentWeek = Math.ceil(today.getDate() / 7);

    spikes.forEach(spike => {
        // Only include if spike is upcoming (within daysAhead)
        let spikeDate: Date;

        if (spike.month > currentMonth ||
            (spike.month === currentMonth && spike.weekOfMonth > currentWeek)) {
            spikeDate = new Date(today.getFullYear(), spike.month, spike.weekOfMonth * 7);
        } else {
            spikeDate = new Date(today.getFullYear() + 1, spike.month, spike.weekOfMonth * 7);
        }

        const daysAway = Math.ceil((spikeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysAway <= daysAhead) {
            spikeEvents.push({
                eventName: `📊 Historical ${spike.category} Spike`,
                eventDate: spikeDate.toISOString().split('T')[0],
                category: spike.category,
                estimatedCost: Math.round(spike.averageSpike),
                source: 'historical' as EventSource,
                confidence: 'medium',
                historicalData: spike.years,
                actionableAdvice: `You typically spend more on ${spike.category} around this time. Consider setting aside funds in advance.`,
                isDismissed: false,
                daysAway,
                urgency: daysAway <= 7 ? 'high' : daysAway <= 21 ? 'medium' : 'low',
            });
        }
    });

    // Combine and deduplicate (calendar events take priority)
    const allEvents = [...calendarEvents];

    spikeEvents.forEach(spikeEvent => {
        // Don't add if there's already a calendar event within 7 days
        const hasNearbyCalendarEvent = calendarEvents.some(calEvent => {
            const calDate = new Date(calEvent.eventDate!).getTime();
            const spikeEventDate = new Date(spikeEvent.eventDate!).getTime();
            return Math.abs(calDate - spikeEventDate) < 7 * 24 * 60 * 60 * 1000 &&
                calEvent.category === spikeEvent.category;
        });

        if (!hasNearbyCalendarEvent) {
            allEvents.push(spikeEvent);
        }
    });

    // Sort by date
    allEvents.sort((a, b) => {
        const dateA = new Date(a.eventDate!).getTime();
        const dateB = new Date(b.eventDate!).getTime();
        return dateA - dateB;
    });

    return allEvents;
}
