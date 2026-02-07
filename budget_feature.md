# Budget System - Complete Implementation Guide for Cursor AI

## SYSTEM OVERVIEW

Create a new standalone "Budget" page (`/budget`) that combines intelligent budget automation, event-based planning, and savings goals into a unified financial planning interface. This page is only accessible after Plaid connection is established.

---

## ACCESS CONTROL REQUIREMENTS

**CRITICAL: Budget page must be gated behind Plaid connection**

Implementation requirements:
1. Check existing pages (`/insights`, `/dashboard`) to see how they verify Plaid connection status
2. Query `user_plaid_connections` table to check `is_connected` status
3. If NOT connected, show empty state with:
   - Illustration/icon
   - Message: "Connect your bank account to unlock Budget features"
   - "Connect to Plaid" CTA button
4. Only render budget content after `is_connected === true`
5. Initialize budget system automatically upon first Plaid connection (see initialization flow below)

---

## PAGE ARCHITECTURE

### Navigation Integration
Add "Budget" to main navigation sidebar alongside Dashboard, Insights, Portfolio, etc.
- Icon: 🎯 or wallet icon
- Route: `/budget`
- Position: Between Dashboard and Insights (suggested)

### Single-Page Layout (No Tabs)

The Budget page is **one continuous scrolling view** divided into distinct sections. NOT a tabbed interface.

```
┌───────────────────────────────────────────────────────────┐
│                     BUDGET PAGE                            │
│                   (Single Scroll View)                     │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  [SECTION 1: OVERVIEW HERO]                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  💰 Budget Autopilot         [Settings ⚙️]         │  │
│  │                                                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │  │
│  │  │Safe to Spend│  │This Month   │  │Savings     │ │  │
│  │  │   $247      │  │$2,347/$3,200│  │$850/$1,025 │ │  │
│  │  │             │  │  [73%]      │  │  [83%]     │ │  │
│  │  └─────────────┘  └─────────────┘  └────────────┘ │  │
│  │                                                     │  │
│  │  ⚠️ 2 categories need attention  [View All →]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [SECTION 2: ACTIVE SAVINGS GOALS]                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🎯 Active Goals                    [+ Add Goal]    │  │
│  │                                                     │  │
│  │  [Goal Card 1]  [Goal Card 2]  [Goal Card 3]      │  │
│  │  Valentine's    Sister's       Emergency          │  │
│  │  Day Fund       Wedding        Fund               │  │
│  │  $120/$240      $2,400/$5,000  $3,200/$10,000    │  │
│  │  Feb 14         Jun 15         Dec 2026          │  │
│  │  ████████░░     ████░░░░░░     ███░░░░░░░        │  │
│  │  [On Track ✅]  [Behind ⚠️]     [On Track ✅]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [SECTION 3: BUDGET BREAKDOWN]                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📊 February 2026 Budget                           │  │
│  │  [Month Selector ▼]               [Adjust Budgets] │  │
│  │                                                     │  │
│  │  Fixed Expenses (Can't Touch)                      │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ Rent          $1,650  ████████████░░  100%  │  │
│  │  │ Insurance       $220  ████████████░░   95%  │  │
│  │  │ Utilities       $145  ██████████░░░░   80%  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  Flexible Spending (Auto-Managed by Autopilot)     │  │
│  │  ┌─────────────────────────────────────────────┐  │
│  │  │ Groceries      $420  ██████░░░░░░   58% ✅  │  │
│  │  │ Dining Out     $280  ████████░░░░   89% ⚠️  │  │
│  │  │ Shopping       $350  ████░░░░░░░░   42% ✅  │  │
│  │  │ Entertainment  $180  █████░░░░░░░   63% ✅  │  │
│  │  │ Transportation $210  ███████░░░░░   74% ✅  │  │
│  │  │ Other          $198  ██░░░░░░░░░░   23% ✅  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  💡 Click any category to see transactions         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [SECTION 4: UPCOMING EVENTS]                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📅 Upcoming Events & Planning    [Add Event]      │  │
│  │                        [Refresh News 🔄]            │  │
│  │                                                     │  │
│  │  Next 90 Days                                      │  │
│  │  ┌────────────────────────────────────────┐       │  │
│  │  │ 🏈 Super Bowl LIX                       │       │  │
│  │  │ Feb 9 (2 days away) 🔴                 │       │  │
│  │  │                                         │       │  │
│  │  │ Historical: $147 (2024), $132 (2023)   │       │  │
│  │  │ Recommended Budget: $150               │       │  │
│  │  │                                         │       │  │
│  │  │ 💡 Start saving $15/week now            │       │  │
│  │  │ [Create Savings Goal] [Dismiss]        │       │  │
│  │  └────────────────────────────────────────┘       │  │
│  │                                                     │  │
│  │  ┌────────────────────────────────────────┐       │  │
│  │  │ 💝 Valentine's Day                      │       │  │
│  │  │ Feb 14 (7 days away) 🟡                │       │  │
│  │  │                                         │       │  │
│  │  │ Historical: $220 average               │       │  │
│  │  │ 📰 News: Restaurant prices up 8% YoY   │       │  │
│  │  │ Recommended Budget: $240               │       │  │
│  │  │                                         │       │  │
│  │  │ Current Goal: $120/$240 saved (50%)    │       │  │
│  │  │ ⚠️ Need $30/week to stay on track       │       │  │
│  │  │ [View Goal] [Adjust]                   │       │  │
│  │  └────────────────────────────────────────┘       │  │
│  │                                                     │  │
│  │  [Show More Events →]                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  [SECTION 5: AI INSIGHTS & RECOMMENDATIONS]               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🧠 Budget Insights                                 │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ 💡 Optimization Opportunity                  │  │
│  │  │ You consistently underspend on Entertainment│  │
│  │  │ by $60/month. Consider reallocating to     │  │
│  │  │ Savings to reach your Emergency Fund goal  │  │
│  │  │ 2 months faster.                            │  │
│  │  │                          [Apply Suggestion] │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ ⚠️ Spending Pattern Alert                    │  │
│  │  │ Your Dining spending spikes 40% on weekends.│  │
│  │  │ Cooking at home on Saturdays could save    │  │
│  │  │ $180/month.                                 │  │
│  │  │                          [See Details]      │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ 🎉 Achievement                               │  │
│  │  │ You're 15% ahead of your savings goal this  │  │
│  │  │ month! At this rate, you'll save an extra  │  │
│  │  │ $1,800 this year.                           │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## COMPONENT BREAKDOWN

### File Structure
```
src/
├── app/
│   └── budget/
│       └── page.tsx (main budget page)
│
├── components/budget/
│   ├── BudgetOverview.tsx (Section 1: hero cards)
│   ├── SavingsGoalsGrid.tsx (Section 2: goal cards)
│   ├── CategoryBreakdown.tsx (Section 3: budget table)
│   ├── UpcomingEvents.tsx (Section 4: event cards)
│   ├── BudgetInsights.tsx (Section 5: AI insights)
│   ├── BudgetSetupModal.tsx (initial setup flow)
│   ├── AdjustBudgetModal.tsx (category adjustment interface)
│   ├── CreateGoalModal.tsx (manual goal creation)
│   ├── PlaidGate.tsx (connection check wrapper)
│   └── shared/
│       ├── GoalCard.tsx (individual goal card)
│       ├── EventCard.tsx (individual event card)
│       ├── CategoryRow.tsx (expandable category row)
│       └── InsightCard.tsx (insight display)
│
├── lib/
│   ├── budget/
│   │   ├── autopilot-engine.ts (budget calculations)
│   │   ├── spending-analyzer.ts (pattern detection)
│   │   ├── event-detector.ts (event identification)
│   │   ├── news-analyzer.ts (OpenAI news processing)
│   │   └── safe-to-spend.ts (daily spending calculator)
│   └── api-client.ts (centralized API calls)
│
├── stores/
│   └── budgetStore.ts (Zustand state management)
│
├── app/api/budget/
│   ├── initialize/route.ts (POST - first-time setup)
│   ├── status/route.ts (GET - current state)
│   ├── evaluate-transaction/route.ts (POST - real-time)
│   ├── adjust/route.ts (PATCH - manual changes)
│   ├── events/upcoming/route.ts (GET - event list)
│   ├── events/analyze-news/route.ts (POST - refresh news)
│   ├── goals/route.ts (GET/POST - CRUD goals)
│   └── insights/route.ts (GET - AI recommendations)
│
└── types/
    └── budget.ts (TypeScript interfaces)
```

---

## DETAILED SECTION SPECIFICATIONS

### SECTION 1: Overview Hero

**Purpose**: At-a-glance financial health snapshot

**Layout**: Three large metric cards side-by-side (responsive: stack on mobile)

**Card 1 - Safe to Spend Today**
- Primary metric: Dollar amount (e.g., "$247")
- Subtext: "After [X] upcoming bills" (e.g., "After Netflix, Gym")
- Calculation logic:
  - Current account balance (from Plaid)
  - Minus: Sum of bills due in next 7 days (query transactions with upcoming dates)
  - Minus: (Monthly budget - spent so far) / days remaining in month
  - If negative, show $0 with warning icon

**Card 2 - This Month Spending**
- Primary metric: "$2,347 / $3,200" (spent / total budget)
- Progress bar: Visual percentage (73%)
- Color coding:
  - Green: <75%
  - Yellow: 75-95%
  - Red: >95%
- Subtext: "23 days remaining" or "X days until next paycheck"

**Card 3 - Savings Progress**
- Primary metric: "$850 / $1,025" (actual / target)
- Progress bar: Visual percentage (83%)
- Status badge: "On Track ✅" / "Behind ⚠️" / "Ahead 🎉"
- Calculation: Compare current month actual savings vs target from autopilot config

**Alert Banner** (appears below cards if warnings exist)
- Shows count of categories with issues
- "⚠️ 2 categories need attention"
- Click expands dropdown or scrolls to Section 3
- Shows most urgent alert preview

**Settings Button** (top right)
- Opens modal to adjust:
  - Budget priority (aggressive/balanced/lifestyle)
  - Auto-adjust toggle
  - Non-negotiable categories
  - Recalculate budgets

---

### SECTION 2: Active Savings Goals

**Purpose**: Track progress toward specific financial targets

**Layout**: Horizontal scrollable card grid (3-4 visible at once, scroll for more)

**Goal Card Structure**:
```
┌─────────────────────────┐
│ 💝 Valentine's Day Fund │ (icon + name)
│                         │
│ $120 / $240            │ (current / target)
│ ████████████░░░░░░░░   │ (50% progress bar)
│                         │
│ 🗓️ Feb 14 (7 days)      │ (deadline + countdown)
│ 💰 $30/week needed      │ (contribution pace)
│                         │
│ Status: On Track ✅     │ (or Behind ⚠️)
│                         │
│ [View Details]          │
└─────────────────────────┘
```

**Goal Card States**:
- **On Track**: Current amount / days remaining = on pace
- **Behind**: Need to increase weekly contribution
- **Ahead**: Saving faster than needed
- **Completed**: Reached target, show celebration badge

**Goal Sources**:
1. **Auto-generated from events**: When user clicks "Create Savings Goal" on event card
2. **Manual goals**: User creates via "+ Add Goal" button
3. **Linked to categories**: Goal specifies which spending category to reduce

**Add Goal Button**:
- Opens CreateGoalModal with fields:
  - Goal name
  - Target amount
  - Deadline date
  - Funding source (which category to pull from, or "Additional savings")
  - Optional: Link to upcoming event

**Empty State**: 
- "No active goals. Create one to start saving for something special!"
- CTA: "+ Add Your First Goal"

---

### SECTION 3: Budget Breakdown

**Purpose**: Detailed category-by-category tracking with drill-down capability

**Header**:
- Title: "February 2026 Budget"
- Month selector dropdown (view previous months)
- "Adjust Budgets" button (opens AdjustBudgetModal)

**Layout**: Two subsections

**Subsection A: Fixed Expenses**
- Label: "Fixed Expenses (Can't Touch)"
- List categories marked as `isFixed: true`
- Show: Category name, amount, progress bar, percentage used
- Minimal interactivity (can't adjust these)
- Examples: Rent, Insurance, Subscriptions (if marked non-negotiable)

**Subsection B: Flexible Spending**
- Label: "Flexible Spending (Auto-Managed by Autopilot)"
- Expandable rows for each discretionary category
- Row structure:
  ```
  [Category Name] [Allocated] [Progress Bar] [%] [Status Icon] [▼]
  ```
- Status icons:
  - ✅ Green checkmark: <75%
  - ⚠️ Yellow warning: 75-95%
  - 🛑 Red stop: >100%

**Expandable Row Details** (click to expand):
- Shows recent transactions in that category
- Mini transaction list with: date, merchant, amount
- "View All [Category] Transactions" link → filters Insights page
- Quick action: "Adjust [Category] Budget" → opens slider

**Adjust Budgets Modal**:
- Shows all flexible categories with sliders
- Live calculation: Total must equal available discretionary pool
- If user increases one category, suggest which to decrease
- Warning if total exceeds income
- "Rebalance Automatically" button → AI suggests optimal allocation
- Save → updates database and recalculates

**Month Selector Logic**:
- Current month: Shows real-time data
- Past months: Shows historical snapshots from `budget_monthly_snapshots`
- Future months: Shows projected/planned budgets

---

### SECTION 4: Upcoming Events

**Purpose**: Proactive budget planning for known future expenses

**Header**:
- Title: "📅 Upcoming Events & Planning"
- Timeframe filter: Next 30/60/90 days (default 90)
- "Add Custom Event" button
- "Refresh News 🔄" button (manually triggers news analysis)

**Event Card Structure**:
```
┌──────────────────────────────────────────┐
│ 🏈 Super Bowl LIX                         │
│ Feb 9 (2 days away) 🔴                   │ (urgency color)
│                                           │
│ 📊 Historical Data                        │
│ • 2024: $147                              │
│ • 2023: $132                              │
│ • Average: $140                           │
│                                           │
│ 💰 Recommended Budget: $150               │
│                                           │
│ 📰 News Insight (if available)            │
│ "Food delivery prices up 12% for big     │
│  sporting events according to DoorDash"  │
│                                           │
│ 💡 Actionable Advice                      │
│ Stock up on snacks Feb 5-7 to avoid      │
│ price surge. Hosting at home vs sports   │
│ bar saves avg $60/person.                │
│                                           │
│ [Create Savings Goal] [Dismiss]          │
└──────────────────────────────────────────┘
```

**Event Sources & Detection**:

1. **Historical Events**:
   - Algorithm: Analyze past 2-3 years of transactions
   - Identify spending spikes >30% above category average
   - Check if spikes occur at similar time each year (±7 days)
   - Example: December shopping spike, summer vacation travel
   - Confidence: HIGH

2. **Calendar Events** (hardcoded):
   - Major holidays: Valentine's Day, Mother's Day, Father's Day, Christmas, etc.
   - Sporting events: Super Bowl, FIFA World Cup, Olympics
   - Tax deadlines: April 15, October 15
   - Seasonal: Black Friday, back-to-school season
   - Confidence: HIGH

3. **News-Driven Events**:
   - Use NewsAPI.org to fetch financial news (last 7 days)
   - Query: "inflation OR interest rate OR consumer spending OR tariffs OR federal reserve"
   - Domains: wsj.com, bloomberg.com, cnbc.com, reuters.com
   - Send to OpenAI GPT-4o-mini for analysis
   - Prompt: "Extract upcoming events that will impact consumer budgets. Return JSON with: eventName, timeframe, affectedCategory, impactPercentage, reasoning, actionableAdvice"
   - Confidence: MEDIUM

4. **User-Added Events**:
   - Manual entry: weddings, vacations, home repairs, etc.
   - Form fields: Name, date, category, estimated cost
   - Confidence: HIGH

**Event Card Actions**:
- **Create Savings Goal**: Auto-populate goal modal with event details
- **Dismiss**: Hide event (save to `is_dismissed` column)
- **View Goal**: If goal already exists, navigate to goal card

**Urgency Color Coding**:
- Red: <7 days away
- Yellow: 7-21 days away
- Green: >21 days away

**Empty State**:
- "No major events detected in next 90 days"
- "+ Add Custom Event" CTA

---

### SECTION 5: AI Insights & Recommendations

**Purpose**: Proactive financial coaching and pattern recognition

**Layout**: Stacked insight cards (3-5 visible, "Show More" button)

**Insight Card Types**:

**Type 1: Optimization**
```
┌────────────────────────────────────────┐
│ 💡 Optimization Opportunity             │
│                                         │
│ You consistently underspend on          │
│ Entertainment by $60/month. Consider    │
│ reallocating to Savings to reach your   │
│ Emergency Fund goal 2 months faster.    │
│                                         │
│ Impact: Extra $720/year saved           │
│                                         │
│ [Apply Suggestion] [Ignore]            │
└────────────────────────────────────────┘
```

**Type 2: Warning**
```
┌────────────────────────────────────────┐
│ ⚠️ Spending Pattern Alert               │
│                                         │
│ Your Dining spending spikes 40% on      │
│ weekends. Cooking at home on Saturdays  │
│ could save $180/month.                  │
│                                         │
│ [See Detailed Breakdown] [Dismiss]     │
└────────────────────────────────────────┘
```

**Type 3: Achievement**
```
┌────────────────────────────────────────┐
│ 🎉 Milestone Reached                    │
│                                         │
│ You're 15% ahead of your savings goal   │
│ this month! At this rate, you'll save   │
│ an extra $1,800 this year.              │
│                                         │
│ [View Savings Progress]                 │
└────────────────────────────────────────┘
```

**Type 4: Pattern Recognition**
```
┌────────────────────────────────────────┐
│ 📊 Trend Detected                       │
│                                         │
│ You spend 2.3x more in the 3 days after │
│ payday. Moving discretionary purchases  │
│ to mid-month could reduce impulse buys. │
│                                         │
│ [Learn More] [Dismiss]                  │
└────────────────────────────────────────┘
```

**Insight Generation Logic**:

Create insights from:
1. **Spending analyzer patterns**:
   - Consistent underspending → reallocation suggestion
   - Day-of-week patterns → behavior modification
   - Seasonal trends → advance planning
   - Impulse purchase detection → self-awareness

2. **Budget vs actual comparison**:
   - Ahead of savings → celebrate
   - Behind on goals → encouragement + tactics
   - Category overspending → root cause analysis

3. **Cross-reference with events**:
   - Upcoming event + no savings goal → create goal suggestion
   - Event approaching + behind on goal → urgency alert

4. **OpenAI analysis** (optional enhancement):
   - Send anonymized spending patterns to GPT-4o-mini
   - Prompt: "Analyze this user's spending data and provide 3 actionable insights"
   - Return personalized coaching advice

**Insight Priority**:
- Show maximum 5 insights at once
- Prioritize: Warnings > Optimizations > Achievements > Patterns
- "Show More Insights" button to expand full list

---

## INITIALIZATION FLOW

### First-Time Setup (Triggered Automatically After Plaid Connection)

**When to Trigger**:
- User connects Plaid for first time
- Check if `budget_autopilot` record exists for user
- If NO record → trigger setup modal
- If record EXISTS → load normal budget page

**Setup Modal Flow** (BudgetSetupModal.tsx):

**Screen 1: Welcome**
```
┌─────────────────────────────────────────┐
│  Welcome to Budget Autopilot            │
│                                         │
│  We'll analyze your spending and create │
│  a personalized budget in 3 steps.      │
│                                         │
│  This takes about 60 seconds.           │
│                                         │
│           [Get Started →]                │
└─────────────────────────────────────────┘
```

**Screen 2: Choose Priority**
```
┌─────────────────────────────────────────┐
│  What's your financial priority?        │
│                                         │
│  ○ 🚀 Save Aggressively                 │
│     Target: 30%+ savings rate           │
│     Best for: Buying a home, retirement │
│     Your monthly savings: ~$1,560       │
│                                         │
│  ● ⚖️ Balance Saving & Living           │
│     Target: 15-20% savings rate         │
│     Best for: Building emergency fund   │
│     Your monthly savings: ~$1,040       │
│                                         │
│  ○ 🎉 Maintain Lifestyle                │
│     Target: 5-10% savings rate          │
│     Best for: Enjoying life now         │
│     Your monthly savings: ~$520         │
│                                         │
│  [← Back]              [Continue →]     │
└─────────────────────────────────────────┘
```

**Screen 3: Auto-Adjust Preference**
```
┌─────────────────────────────────────────┐
│  How hands-on do you want to be?        │
│                                         │
│  ● Auto-Adjust (Recommended)            │
│     Autopilot optimizes your budgets    │
│     each month based on actual spending.│
│     You'll get a monthly report.        │
│                                         │
│  ○ Manual Approval                      │
│     You'll review and approve all       │
│     budget changes each month.          │
│                                         │
│  [← Back]              [Continue →]     │
└─────────────────────────────────────────┘
```

**Screen 4: Non-Negotiables**
```
┌─────────────────────────────────────────┐
│  Which expenses are non-negotiable?     │
│                                         │
│  These will never be reduced:           │
│                                         │
│  ☑️ Rent/Mortgage (locked)               │
│  ☑️ Insurance (locked)                   │
│  ☐ Subscriptions                         │
│  ☐ Healthcare                            │
│  ☐ Transportation                        │
│  ☐ Childcare                             │
│                                         │
│  [← Back]              [Continue →]     │
└─────────────────────────────────────────┘
```

**Screen 5: Processing**
```
┌─────────────────────────────────────────┐
│  Creating your personalized budget...   │
│                                         │
│  ✅ Analyzed 1,247 transactions          │
│  ✅ Identified spending patterns         │
│  ✅ Detected 3 recurring bills           │
│  ✅ Generated category budgets           │
│  ✅ Set up savings targets               │
│                                         │
│  [Loading animation]                    │
└─────────────────────────────────────────┘
```

**Screen 6: Results Preview**
```
┌─────────────────────────────────────────┐
│  🎉 Your budget is ready!                │
│                                         │
│  Monthly Budget Breakdown:              │
│  Income:        $5,200                  │
│  Fixed Costs:   $2,015                  │
│  Savings Goal:  $1,040 (20%)            │
│  Spending:      $2,145                  │
│                                         │
│  Top Categories:                        │
│  • Groceries:      $420                 │
│  • Dining Out:     $315                 │
│  • Shopping:       $380                 │
│                                         │
│  You're on track to save $12,480/year   │
│                                         │
│       [View Full Budget →]               │
└─────────────────────────────────────────┘
```

After setup completes:
- Create record in `budget_autopilot` table
- Create first `budget_monthly_snapshots` entry
- Redirect to main budget page with all sections populated

---

## DATA FLOW & STATE MANAGEMENT

### Zustand Store Structure (`budgetStore.ts`)

```typescript
interface BudgetStore {
  // Core state
  config: AutopilotConfig | null;
  currentMonth: BudgetSummary | null;
  savingsGoals: SavingsGoal[];
  upcomingEvents: DetectedEvent[];
  insights: BudgetInsight[];
  alerts: BudgetAlert[];
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  fetchBudgetStatus: (month?: string) => Promise<void>;
  adjustCategoryBudget: (category: string, newAmount: number) => Promise<void>;
  createSavingsGoal: (goal: Partial<SavingsGoal>) => Promise<void>;
  updateGoalProgress: (goalId: string, amount: number) => Promise<void>;
  fetchUpcomingEvents: () => Promise<void>;
  dismissEvent: (eventId: string) => Promise<void>;
  refreshNewsAnalysis: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  updateConfig: (config: Partial<AutopilotConfig>) => Promise<void>;
}
```

### API Integration Pattern

Each API route should follow RESTful conventions:

**GET `/api/budget/status`**
- Query params: `userId`, `month` (optional)
- Returns: Complete BudgetSummary object
- Called on: Page load, month selector change, after adjustments

**POST `/api/budget/initialize`**
- Body: `{ userId, priority, autoAdjustEnabled, nonNegotiableCategories }`
- Returns: `{ config, initialBudget }`
- Called on: First-time setup completion

**PATCH `/api/budget/adjust`**
- Body: `{ userId, category, newAmount, reason }`
- Returns: Updated CategoryBudget[]
- Called on: Manual budget adjustment save

**GET `/api/budget/events/upcoming`**
- Query params: `userId`, `timeframeDays` (default 90)
- Returns: DetectedEvent[]
- Called on: Page load, manual refresh

**POST `/api/budget/events/analyze-news`**
- Body: `{ userId }`
- Fetches news → OpenAI analysis → updates cache
- Returns: DetectedEvent[]
- Called on: Refresh News button click

**GET `/api/budget/goals`**
- Query params: `userId`
- Returns: SavingsGoal[]
- Called on: Page load

**POST `/api/budget/goals`**
- Body: `{ userId, name, targetAmount, deadline, category, linkedEventId }`
- Returns: Created SavingsGoal
- Called on: Create Goal modal save

**GET `/api/budget/insights`**
- Query params: `userId`
- Analyzes patterns → generates BudgetInsight[]
- Returns: BudgetInsight[]
- Called on: Page load, weekly refresh

**POST `/api/budget/evaluate-transaction`**
- Body: `{ userId, transaction }`
- Real-time budget impact check
- Returns: BudgetAlert | null
- Called on: Plaid webhook (automatic)

---

## CORE LOGIC IMPLEMENTATIONS

### 1. Budget Calculation Engine (`autopilot-engine.ts`)

**Input**: User transaction history (6 months minimum), income data, user preferences

**Process**:
1. **Income Analysis**:
   - Calculate average monthly income from last 3 months
   - If income varies >20%, use 80th percentile (conservative estimate)
   - Store as `config.monthlyIncome`

2. **Fixed Cost Detection**:
   - Identify transactions with <10% month-to-month variance
   - Recurring same-day patterns (±3 days)
   - Categories: Rent, Insurance, Subscriptions, Utilities
   - Mark as `isFixed: true`

3. **Discretionary Pool Calculation**:
   - `discretionaryPool = monthlyIncome - sum(fixedCosts)`

4. **Savings Target by Priority**:
   - Aggressive: `savingsTarget = discretionaryPool × 0.35`
   - Balanced: `savingsTarget = discretionaryPool × 0.20`
   - Lifestyle: `savingsTarget = discretionaryPool × 0.10`

5. **Allocate Remaining to Categories**:
   - `spendingPool = discretionaryPool - savingsTarget`
   - For each discretionary category:
     - Calculate historical proportion: `ratio = categoryHistoricalAvg / totalDiscretionary`
     - Allocate: `categoryBudget = spendingPool × ratio`
     - Apply seasonal adjustment if current month has pattern
     - Add buffer (10-15%) if category has high variance

**Output**: CategoryBudget[] with allocated amounts

### 2. Spending Pattern Analyzer (`spending-analyzer.ts`)

**Detect**:
- **Day-of-week patterns**: Weekend vs weekday spending by category
- **Time-of-month patterns**: Post-paycheck spending spikes
- **Seasonal patterns**: Compare current month to same month previous year
- **Impulse purchases**: Transactions >2.5 std deviations above category median
- **Recurring bills**: Same merchant, same amount, regular interval

**Output**: Pattern metadata used for insights and forecasting

### 3. Safe to Spend Calculator (`safe-to-spend.ts`)

**Formula**:
```
safeToSpend = accountBalance 
            - upcomingBills (next 7 days)
            - [(monthlyBudget - spentSoFar) / daysRemainingInMonth]
```

**Edge cases**:
- If result is negative, return 0 and show warning
- If no upcoming bills, simplify calculation
- Account for multiple bank accounts (sum balances)

**Update frequency**: Recalculate on every transaction webhook

### 4. Event Detector (`event-detector.ts`)

**Historical Detection**:
```
For each category:
  For each month in past 2-3 years:
    If monthSpending > categoryAverage * 1.3:
      Check if spike occurs at similar time other years
      If yes → mark as recurring event
      Calculate average spike amount
```

**Calendar Events** (hardcoded array):
```typescript
const calendarEvents = [
  { name: "Super Bowl", date: "first Sunday of February", category: "Dining" },
  { name: "Valentine's Day", date: "February 14", category: "Shopping" },
  { name: "Tax Day", date: "April 15", category: "Healthcare" }, // often owe money
  // ... etc
]
```

**News Integration**:
- Fetch from NewsAPI with query params
- Send headlines + snippets to OpenAI
- Parse JSON response into DetectedEvent objects
- Cache results for 24 hours

### 5. Real-Time Transaction Evaluator

**On Plaid Webhook**:
```
1. Get transaction data
2. Determine category
3. Calculate: newTotal = categorySpentThisMonth + transaction.amount
4. Calculate: percentUsed = newTotal / categoryBudget
5. If percentUsed >= 75% → generate warning alert
6. If percentUsed >= 100% → generate breach alert with suggested actions
7. Save alert to database
8. Update Zustand store (if user is online)
```

**Suggested Actions Generation**:
- Find categories with surplus funds
- Calculate overage amount
- Offer: "Pull $X from [Category] (has $Y available)"
- Offer: "Reduce next month's budget"
- Offer: "Override (impacts savings goal)"

---

## DATABASE SCHEMA (Supabase SQL)

```sql
-- Core autopilot configuration
CREATE TABLE budget_autopilot (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('aggressive', 'balanced', 'lifestyle')),
  auto_adjust_enabled BOOLEAN DEFAULT TRUE,
  non_negotiable_categories TEXT[] DEFAULT ARRAY['Rent', 'Insurance']::TEXT[],
  monthly_income DECIMAL(10,2) NOT NULL,
  savings_target_percentage DECIMAL(5,2) NOT NULL,
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly budget snapshots (historical record)
CREATE TABLE budget_monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month (e.g., '2026-02-01')
  total_income DECIMAL(10,2) NOT NULL,
  fixed_costs DECIMAL(10,2) NOT NULL,
  savings_target DECIMAL(10,2) NOT NULL,
  savings_actual DECIMAL(10,2) DEFAULT 0,
  category_budgets JSONB NOT NULL, -- {"Groceries": 420, "Dining": 315, ...}
  category_actuals JSONB NOT NULL, -- {"Groceries": 387, "Dining": 342, ...}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE INDEX idx_budget_snapshots_user_month ON budget_monthly_snapshots(user_id, month DESC);

-- Active budget alerts
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('info', 'warning', 'breach')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  suggested_actions JSONB, -- ["Action 1", "Action 2", ...]
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_alerts_user_unacked ON budget_alerts(user_id, acknowledged, created_at DESC);

-- Savings goals
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  category TEXT, -- Which spending category to reduce
  linked_event_id UUID, -- Foreign key to budget_events (if auto-generated)
  weekly_contribution DECIMAL(10,2),
  status TEXT CHECK (status IN ('on_track', 'behind', 'completed')) DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_savings_goals_user ON savings_goals(user_id, completed_at NULLS FIRST);

-- Detected events
CREATE TABLE budget_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  category TEXT NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('historical', 'calendar', 'news', 'user')),
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  historical_data JSONB, -- [{"year": 2024, "amount": 147}, ...]
  news_insight TEXT,
  actionable_advice TEXT NOT NULL,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_events_user_date ON budget_events(user_id, event_date) WHERE is_dismissed = FALSE;

-- News analysis cache
CREATE TABLE news_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date DATE NOT NULL UNIQUE,
  raw_news_data JSONB NOT NULL, -- Store fetched articles
  analyzed_events JSONB NOT NULL, -- Parsed OpenAI response
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget insights (AI-generated)
CREATE TABLE budget_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('optimization', 'warning', 'achievement', 'pattern')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact TEXT, -- e.g., "Save $60/month"
  is_actionable BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_budget_insights_user ON budget_insights(user_id, dismissed, created_at DESC);
```

---

## PLAID INTEGRATION REQUIREMENTS

### Check for Plaid Connection

**In `app/budget/page.tsx`**:
```typescript
// Pseudocode structure
async function BudgetPage() {
  const { userId } = await getUser();
  
  // Query Plaid connection status
  const { data: plaidConnection } = await supabase
    .from('user_plaid_connections')
    .select('is_connected, access_token')
    .eq('user_id', userId)
    .single();
  
  if (!plaidConnection || !plaidConnection.is_connected) {
    return <PlaidGateComponent />;
  }
  
  // Check if budget system initialized
  const { data: budgetConfig } = await supabase
    .from('budget_autopilot')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!budgetConfig) {
    return <BudgetSetupModal />;
  }
  
  // Render full budget page
  return <BudgetPageContent />;
}
```

### Reference Other Pages

**Check how these pages handle Plaid gating**:
- `/insights/page.tsx` - likely has Plaid check
- `/dashboard/page.tsx` - may have similar gating
- Look for patterns like:
  - `user_plaid_connections` table queries
  - `is_connected` boolean checks
  - Empty state components for un-connected users

**Replicate the same pattern** in Budget page for consistency.

### Initialize Budget on First Plaid Connection

**Option 1: Webhook Listener**
- When Plaid connection succeeds, webhook triggers
- In webhook handler, check if `budget_autopilot` record exists
- If not, trigger background initialization

**Option 2: Client-Side Trigger**
- After Plaid OAuth flow completes
- Redirect to `/budget?setup=true`
- Detect query param → show setup modal

**Recommended**: Option 2 for simpler implementation

---

## TRANSACTION WEBHOOK HANDLING

### Setup Plaid Webhook

**Configure webhook URL** in Plaid Dashboard:
- URL: `https://yourdomain.com/api/budget/evaluate-transaction`
- Events: `DEFAULT_UPDATE`, `TRANSACTIONS_REMOVED`

### Webhook Handler Logic

**In `app/api/budget/evaluate-transaction/route.ts`**:

```typescript
// Pseudocode
export async function POST(request: Request) {
  // 1. Verify Plaid webhook signature
  const isValid = verifyPlaidWebhook(request);
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 });
  
  // 2. Parse webhook payload
  const { webhook_type, item_id, new_transactions } = await request.json();
  
  // 3. Get user_id from item_id
  const userId = await getUserIdFromPlaidItemId(item_id);
  
  // 4. For each new transaction
  for (const transaction of new_transactions) {
    // Categorize (use existing categorization logic from project)
    const category = categorizeTransaction(transaction);
    
    // Get current month budget status
    const currentBudget = await getBudgetStatus(userId);
    
    // Calculate impact
    const categoryData = currentBudget.categoryBudgets.find(c => c.category === category);
    const newTotal = categoryData.spent + transaction.amount;
    const percentUsed = (newTotal / categoryData.allocated) * 100;
    
    // Generate alert if needed
    if (percentUsed >= 75 && percentUsed < 100) {
      await createAlert(userId, 'warning', category, transaction);
    } else if (percentUsed >= 100) {
      await createAlert(userId, 'breach', category, transaction);
    }
    
    // Update month snapshot
    await updateMonthSnapshot(userId, category, transaction.amount);
  }
  
  return Response.json({ success: true });
}
```

---

## OPENAI INTEGRATION SPECIFICATIONS

### News Analysis Prompt

**System Prompt**:
```
You are a financial analyst helping individuals plan their budgets for upcoming events and economic changes. Analyze news articles and extract actionable budget insights.
```

**User Prompt Template**:
```
Analyze these {count} recent financial news headlines and descriptions from the past 7 days:

{articles array with title + description}

Extract events or economic trends that will impact a typical US consumer's budget in the next 90 days.

For EACH relevant event, provide:
{
  "eventName": "Brief descriptive name (e.g., 'Federal Reserve Rate Cut')",
  "timeframe": "Specific date or date range (e.g., 'March 15' or 'Late February')",
  "affectedCategory": "ONE of: Groceries, Dining, Shopping, Transportation, Entertainment, Utilities, Healthcare, Housing, Other",
  "impactType": "increase" or "decrease",
  "impactPercentage": <estimated % change as number>,
  "reasoning": "1-2 sentence explanation of why this impacts budgets",
  "actionableAdvice": "Specific action user can take (max 2 sentences)"
}

Only include events with MEDIUM or HIGH confidence.
Return as JSON array. If no relevant events, return empty array.
```

**Post-Processing**:
- Parse JSON response
- Filter out events with dates >90 days away
- Deduplicate similar events
- Create DetectedEvent objects
- Cache in `news_analysis_cache` table

### Budget Insights Generation

**Prompt for Pattern Analysis**:
```
Analyze this user's spending patterns and budget status:

Monthly Income: ${income}
Fixed Costs: ${fixedCosts}
Savings Target: ${savingsTarget}
Actual Savings: ${savingsActual}

Category Spending (Budget vs Actual):
{foreach category}
- {category}: ${spent} / ${budget} ({percentUsed}%)
{end}

Historical Patterns:
{patterns from spending-analyzer}

Generate 3-5 actionable insights in JSON format:
{
  "type": "optimization" | "warning" | "achievement" | "pattern",
  "title": "Short headline (5-7 words)",
  "description": "2-3 sentence explanation",
  "impact": "Quantified benefit if applicable (e.g., 'Save $60/month')",
  "actionable": true/false
}

Focus on:
1. Reallocation opportunities (underspending → savings)
2. Behavioral patterns (weekend spending, post-payday spikes)
3. Goal progress (ahead/behind)
4. Anomalies or risks
```

---

## UI/UX IMPLEMENTATION NOTES

### Design System Integration

**Match existing LoggerBoggers design**:
- Dark mode first (refer to existing components)
- Glassmorphism effects on cards
- Color palette: Use existing CSS variables
- Typography: Match Dashboard/Insights pages
- Animations: Use Framer Motion (already in project)

### Responsive Breakpoints

- Desktop (>1024px): Full multi-column layout
- Tablet (768-1024px): Stacked sections, horizontal scroll for goals
- Mobile (<768px): Single column, collapsible sections

### Loading States

- **Initial page load**: Skeleton screens for each section
- **Month selector change**: Dim content + spinner
- **Budget adjustment**: Optimistic UI update
- **News refresh**: Button shows spinner

### Empty States

- **No Plaid connection**: Illustration + CTA
- **No active goals**: Empty goal grid with "+ Add Goal"
- **No upcoming events**: Calendar icon + "Add Custom Event"
- **No alerts**: Green checkmark + "All budgets healthy"

### Error Handling

- **API failures**: Toast notifications (use existing toast system)
- **Budget exceed**: Modal confirmation before override
- **Invalid adjustments**: Inline validation errors

---

## TESTING CHECKLIST

### Functional Tests
- [ ] Plaid gating works (redirects if not connected)
- [ ] Setup modal completes and creates DB records
- [ ] Budget calculations are mathematically correct
- [ ] Safe to spend updates in real-time
- [ ] Month selector loads historical snapshots
- [ ] Category expansion shows transactions
- [ ] Budget adjustment modal validates inputs
- [ ] Goal creation links to events correctly
- [ ] Event cards display all data fields
- [ ] News refresh fetches and analyzes
- [ ] Alert acknowledgment dismisses properly
- [ ] Insights generate from patterns

### Edge Cases
- [ ] User with <30 days of transaction history
- [ ] User with irregular income
- [ ] All categories under budget (no alerts)
- [ ] All categories over budget
- [ ] Zero upcoming events
- [ ] News API rate limit hit
- [ ] OpenAI API failure (graceful degradation)
- [ ] Multiple savings goals for same event

### Integration Tests
- [ ] Plaid webhook triggers budget evaluation
- [ ] Transaction categorization matches Insights page
- [ ] Savings goal progress affects "Safe to Spend"
- [ ] Event creation auto-populates goal
- [ ] Budget adjustment recalculates all metrics

---

## DEMO OPTIMIZATION FOR HACKATHON

### Pre-Populate Data

**Before demo, seed database with**:
1. **Autopilot config**: Priority = 'balanced', auto-adjust = true
2. **Current month snapshot** with realistic spending:
   - Groceries: 58% used (healthy)
   - Dining: 89% used (warning)
   - Shopping: 105% used (breach) ← Demo alert trigger
3. **3 Active savings goals**:
   - Valentine's Day: 50% progress, on track
   - Sister's Wedding: 30% progress, behind
   - Emergency Fund: 65% progress, ahead
4. **4-5 Upcoming events**:
   - Super Bowl (2 days away) - Red urgency
   - Valentine's Day (7 days) - Yellow, with goal linked
   - Tax Day (April 15) - Green, with news insight
5. **3-4 Insights**:
   - 1 optimization (underspending)
   - 1 warning (weekend pattern)
   - 1 achievement (ahead of savings)

### Demo Script Flow

**Act 1: Show the Problem** (30 seconds)
- "Most people have no idea if they can afford that coffee today"
- Open budget page → show "Safe to Spend: $127"
- "This accounts for Netflix due tonight, gym tomorrow"

**Act 2: The Solution** (60 seconds)
- Scroll to Autopilot section
- "We analyzed 6 months of spending automatically"
- Point to Dining at 89% → "Real-time warning before overspending"
- Expand category → show transactions
- "One click to adjust budget or reallocate from Entertainment"

**Act 3: The Magic** (45 seconds)
- Scroll to Events section
- "Super Bowl is in 2 days - historically spend $140"
- "AI pulled news: food delivery up 12% for sporting events"
- Click "Create Savings Goal" → auto-populates
- "Now Autopilot is saving $30/week automatically"

**Act 4: The Intelligence** (30 seconds)
- Scroll to Insights
- "You spend 40% more on weekends - here's how to save $180/month"
- "You're ahead of your Emergency Fund goal - on track to save $1,800 extra this year"

**Closer**: "This is Budget Autopilot - set it once, stay on track forever."

---

## ENVIRONMENT VARIABLES

Add to `.env.local`:
```
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
OPENAI_API_KEY=...

# New for Budget System
NEWS_API_KEY=... # Get from newsapi.org (free tier)
```

---

## DEPLOYMENT CHECKLIST

- [ ] Run SQL schema migrations in Supabase
- [ ] Add "Budget" to navigation component
- [ ] Configure Plaid webhook URL in dashboard
- [ ] Set up news API cron job (daily 6 AM)
- [ ] Test OpenAI rate limits
- [ ] Verify Plaid transaction webhook triggers
- [ ] Seed demo data for presentation
- [ ] Test full flow on staging environment
- [ ] Mobile responsiveness check
- [ ] Performance audit (page load <2s)

---

**END OF GUIDE**

This guide is optimized for Cursor AI agents. Copy-paste sections as needed. The AI will generate the actual code implementations based on these specifications.