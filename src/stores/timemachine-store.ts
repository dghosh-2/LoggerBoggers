import { create } from 'zustand';
import {
    FinancialEvent,
    TimelineResult,
    DeltaSummary,
    CounterfactualOp,
    RegretItem,
    buildEventsFromTransactions,
    runBaseline,
    runBranch,
    computeDelta,
    findTopRegrets,
    getDefaultDateRange,
    getTransactions,
    identifyRecurringSeries,
    identifyBehaviorPatterns,
} from '@/lib/timemachine-engine';

interface TimeMachineState {
    // Time window
    dateRange: { start: string; end: string };

    // Events
    events: FinancialEvent[];

    // Timelines
    baseline: TimelineResult | null;
    branch: TimelineResult | null;
    delta: DeltaSummary | null;

    // Operations
    selectedOps: CounterfactualOp[];

    // Regret leaderboard
    regretCandidates: RegretItem[];

    // Patterns
    recurringExpenses: Map<string, FinancialEvent[]>;
    behaviorPatterns: Map<string, { category: string; avgMonthly: number; frequency: number; events: FinancialEvent[] }>;

    // UI state
    isLoading: boolean;
    selectedEventId: string | null;
    highlightedMonth: string | null;
    editPoint: string | null; // Date where timeline diverges

    // Actions
    setDateRange: (range: { start: string; end: string }) => void;
    loadBaseline: () => Promise<void>;
    addOperation: (op: CounterfactualOp) => void;
    removeOperation: (index: number) => void;
    clearOperations: () => void;
    runBranchSimulation: () => Promise<void>;
    applyRegret: (regret: RegretItem) => void;
    setSelectedEventId: (id: string | null) => void;
    setHighlightedMonth: (month: string | null) => void;
    reset: () => void;
}

export const useTimeMachineStore = create<TimeMachineState>((set, get) => ({
    // Initial state
    dateRange: getDefaultDateRange(),
    events: [],
    baseline: null,
    branch: null,
    delta: null,
    selectedOps: [],
    regretCandidates: [],
    recurringExpenses: new Map(),
    behaviorPatterns: new Map(),
    isLoading: false,
    selectedEventId: null,
    highlightedMonth: null,
    editPoint: null,

    setDateRange: (range) => {
        set({ dateRange: range });
        // Reload baseline with new range
        get().loadBaseline();
    },

    loadBaseline: async () => {
        set({ isLoading: true });

        try {
            const { dateRange } = get();
            const transactions = getTransactions();

            // Build events from transactions
            const events = buildEventsFromTransactions(transactions, dateRange.start, dateRange.end);

            // Identify patterns
            const recurringExpenses = identifyRecurringSeries(events);
            const behaviorPatterns = identifyBehaviorPatterns(events);

            // Run baseline simulation
            const baseline = runBaseline(events);

            // Find regret candidates
            const regretCandidates = findTopRegrets(events, baseline, 10);

            set({
                events,
                baseline,
                branch: null,
                delta: null,
                selectedOps: [],
                regretCandidates,
                recurringExpenses,
                behaviorPatterns,
                isLoading: false,
                editPoint: null,
            });
        } catch (error) {
            console.error('Error loading baseline:', error);
            set({ isLoading: false });
        }
    },

    addOperation: (op) => {
        const { selectedOps, events, baseline } = get();

        // Determine edit point from the operation
        let editPoint = get().editPoint;
        if (op.type === 'REMOVE' || op.type === 'SCALE' || op.type === 'DELAY') {
            const event = events.find(e => e.id === op.eventId);
            if (event && (!editPoint || event.date < editPoint)) {
                editPoint = event.date;
            }
        }

        const newOps = [...selectedOps, op];
        set({ selectedOps: newOps, editPoint });

        // Auto-run branch
        if (baseline) {
            get().runBranchSimulation();
        }
    },

    removeOperation: (index) => {
        const { selectedOps, baseline } = get();
        const newOps = selectedOps.filter((_, i) => i !== index);
        set({ selectedOps: newOps });

        // Recalculate edit point
        const { events } = get();
        let editPoint: string | null = null;
        newOps.forEach(op => {
            if (op.type === 'REMOVE' || op.type === 'SCALE' || op.type === 'DELAY') {
                const event = events.find(e => e.id === (op as any).eventId);
                if (event && (!editPoint || event.date < editPoint)) {
                    editPoint = event.date;
                }
            }
        });
        set({ editPoint });

        // Auto-run branch or clear if no ops
        if (baseline) {
            if (newOps.length > 0) {
                get().runBranchSimulation();
            } else {
                set({ branch: null, delta: null });
            }
        }
    },

    clearOperations: () => {
        set({ selectedOps: [], branch: null, delta: null, editPoint: null });
    },

    runBranchSimulation: async () => {
        const { events, baseline, selectedOps } = get();

        if (!baseline || selectedOps.length === 0) {
            set({ branch: null, delta: null });
            return;
        }

        set({ isLoading: true });

        try {
            // Run branch simulation
            const branch = runBranch(events, selectedOps, baseline.startingBalance);

            // Compute delta
            const delta = computeDelta(baseline, branch);

            set({
                branch,
                delta,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error running branch:', error);
            set({ isLoading: false });
        }
    },

    applyRegret: (regret) => {
        get().addOperation(regret.operation);
    },

    setSelectedEventId: (id) => {
        set({ selectedEventId: id });
    },

    setHighlightedMonth: (month) => {
        set({ highlightedMonth: month });
    },

    reset: () => {
        set({
            dateRange: getDefaultDateRange(),
            events: [],
            baseline: null,
            branch: null,
            delta: null,
            selectedOps: [],
            regretCandidates: [],
            recurringExpenses: new Map(),
            behaviorPatterns: new Map(),
            isLoading: false,
            selectedEventId: null,
            highlightedMonth: null,
            editPoint: null,
        });
    },
}));
