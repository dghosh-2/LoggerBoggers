

## **MAIN FEATURES:**

**Frontend (AK)**

**Insights (+ Graph) (KM)**

**Portfolio (DG)**

**Investments (DG)**

**Receipt Scanning CV**

**Live Talking Chatbot**

**Chatbot Simulation Mode**

**Crypto/Blockchain (?)**

  

## **Baseline**

**Idea**: Personal finance digital twin. It takes in all of your financial information and organizes it into a financial graph. There are two key unique twists: a drawing mode and simulation mode. The drawing mode is a small studio where you can sketch boxes like Income → Checking → Rent/Groceries/Savings, and it will auto-organize it into a financial graph (your choice if you want to integrate it with your real life graph or not). The simulation mode expands on this by allowing you to talk with the chatbot to describe the future and possible scenarios, the bot runs simulations and returns a visual graph + options. 

  

## **Features**

**Financial Graph**
- **Nodes**: incomes, accounts, expense buckets, debts, goals (optional assets)
- **Edges**: cash flows + allocations (fixed or %), with schedules and constraints
- Have information on all of their spending and financial insights (like pay, taxes, rent, etc.)
- Convert this into a fancy visual financial graph
- Optional: have a timeline so you can see your spending throughout time
- Chatbot + Whisper for insights

**Imports**
- Import CSVs or receipts and the app:
- Categorizes spending
- Finds key trend differences between months
- Updates your financial graph
- Flags major financial issues

- Subscriptions
- Updates the graph

**Simulation**
- Describe the future and possible scenarios (ex: rent +10%, start loan payments $250)
- The bot creates a Scenario Branch, edits the graph, runs the sim, and returns visuals + options 
- ChatBot + Whisper

**Studio**
- Canvas graph editor
- Allows you to draw your own graph and branches to see the impact
- Option to overlay with your actual financial graph to see impact

**Chatbots**
1) **Talk Mode (Explain + Navigate)**
- Conversational Q&A grounded in your data: “Why did savings drop?” “Where is my money going?”
- Every answer highlights the exact nodes/edges and numbers it used (no vibe-based output).

1) **Simulation Mode (Scenario Builder)**
- You describe the future: “Rent +10%, start loan payments $250, can I still save $800?”
- The bot creates a Scenario Branch, edits the graph, runs the sim, and returns visuals + options (not “advice”), like “Here are 3 ways to hit the goal.”

  
## **App organization (tabs)**

**Top-level tabs: Dashboard / Studio / Insights / Imports**
### 1) **Dashboard (home)**
- Goal: “show me my financial twin” in 10 seconds.
- Layout (3-panel)

	**A) Center (hero): Financial Graph Viewer**
	- Your actual graph (read-only by default)
	- Quick toggles: Base scenario selector + “Goal Shader” on/off
	- Click node → mini tooltip: amount, frequency, last-updated source (CSV/receipt/manual)
    
	**B) Left: Spending Trends Snapshot**
	- 3–5 cards max
	- Net cashflow this month
	- Top category changes (MoM)
	- Subscriptions detected
	- “Biggest driver” (one sentence)
	- Mini chart strip (sparkline-style) for the top 2 categories

	**C) Right: Talk Copilot (Whisper-enabled)**
	- Mic + transcript line
	- Mode defaults to Talk
	- Responses highlight nodes on the graph (“I’m pointing at Rent and Dining…”)
	- One-click actions: “Show drivers”, “Open Insights”, “Create Scenario”

  
### 2) **Studio (build + simulate)**
- Goal: edit models + run scenario branches.
- Layout (canvas-first)

	**A) Center: Graph Editor / Viewer**
	- Toggle: Edit / View
	- Optional layer toggles:
	- Sandbox graph
	- Actual graph
	- Overlay both (ghosted actual + editable sandbox)
	- “Branch” control: Create / Rename / Reset / Compare

	**B) Right: Simulation Copilot (Whisper-enabled)**
	- Mode defaults to Sim
	- Prompts like:
	- “Rent +10%, loan $250, can I save $800?”
	- Output:
	- creates/edits Scenario Branch
	- runs sim
	- returns visuals (goal probability + 2–3 levers)
	- “Apply changes” button (so user stays in control)

	**C) Bottom: Simulation Results**
	- Cash balance timeline
	- Goal progress
	- Sensitivity sliders (rent %, groceries %, income shock)

  
### 3) **Imports**
- Goal: get data in fast + clean.
- Layout
	- Upload tiles: CSV / receipts / statements
	- Parsing progress + confidence
	- Review screen:
		- category fixes
		- recurring detection preview
		- “Update graph” button
- After import: auto-navigate to Insights with “What changed?” summary
    

### 3) **Insights**
- Goal: explain what happened + connect it back to the graph.
- Layout (graph + timeline + cards)

**A) Center/Left: Financial Graph Viewer (interactive)**
- Same graph as dashboard, but with “Insight overlays”:
- nodes/edges glow based on the selected insight
- Goal Shader option still available

**B) Top/Bottom: Timeline (optional but strong)**
- Spending over time chart (category/merchant filters)
- Clicking a spike highlights related nodes + shows evidence

**C) Right: Insights Feed + Talk Copilot**
- Insights feed cards:
- “Groceries +18% MoM (drivers…)”
- “New recurring $9.99 detected”
- “Unusual spike on Jan 18”

- Each card has:
	- Explain (evidence)
	- Add/Update Graph
- Copilot in Talk mode:
	- “Why did dining spike?”
	- “What are my biggest leaks?”
	- Highlights the graph + scrolls to the relevant insight card
    

5) Portfolio Tab
6) Stock Tab
- Dhruv can expand on the last two tabs