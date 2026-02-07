# Capital One Nessie API - Transaction History & Supabase Integration Analysis

## 📊 Transaction History Depth

### **Key Finding: No Pre-Populated Historical Data**

The Capital One Nessie API **does NOT provide pre-populated historical transaction data**. Instead:

- ✅ **You can create transactions with ANY date** (tested back to 2019, likely unlimited)
- ✅ **Only returns data YOU create** - no existing customer/account/transaction data
- ✅ **Real public data available**: ATMs and Branches (these have real Capital One location data)

### Test Results:
- ✅ Created purchase dated `2020-01-15` - **SUCCESS**
- ✅ Created deposit dated `2019-06-01` - **SUCCESS**
- ✅ Created purchase dated `2026-02-07` - **SUCCESS**

**Conclusion**: The API accepts dates going back at least 5+ years and forward into the future. There's no hard limit, but you must create all the data yourself.

---

## 📈 Data Volume

### What the API Provides:

| Resource | Data Type | Volume |
|----------|-----------|--------|
| **Customers** | User-created only | Empty by default |
| **Accounts** | User-created only | Empty by default |
| **Transactions** | User-created only | Empty by default |
| **ATMs** | Real Capital One data | ~100+ locations |
| **Branches** | Real Capital One data | ~100+ locations |
| **Merchants** | User-created + some existing | Mixed |

### Transaction Types Available:
- **Purchases** (`/accounts/{id}/purchases`)
- **Deposits** (`/accounts/{id}/deposits`)
- **Withdrawals** (`/accounts/{id}/withdrawals`)
- **Transfers** (`/accounts/{id}/transfers`)
- **Bills** (`/accounts/{id}/bills`)
- **Loans** (`/accounts/{id}/loans`)

---

## 🔄 Supabase Schema Mapping

### Current Supabase Transaction Schema:

```typescript
interface Transaction {
    id?: string;                    // UUID (auto-generated)
    user_id?: string;                // UUID - user who owns transaction
    plaid_transaction_id?: string;   // Plaid transaction ID (optional)
    amount: number;                  // Transaction amount (positive)
    category: string;                // Category (e.g., "Food & Drink")
    name: string;                    // Transaction name/description
    tip?: number | null;             // Tip amount (for food transactions)
    tax?: number | null;             // Tax amount
    date: string;                    // Date (YYYY-MM-DD format)
    account_id?: string;             // Account ID (Plaid account_id)
    source: 'plaid' | 'manual' | 'receipt_scan' | 'generated';
    merchant_name?: string;          // Merchant name
    location?: string;                // Location string
    pending?: boolean;                // Whether transaction is pending
    created_at?: string;             // Timestamp
    updated_at?: string;             // Timestamp
}
```

### Nessie API Transaction Formats:

#### **Purchase Transaction:**
```json
{
    "_id": "6986e41995150878eaff1f63",
    "merchant_id": "57cf75cea73e494d8675ec49",
    "medium": "balance",
    "purchase_date": "2026-02-07",
    "amount": 299.99,
    "description": "New iPhone",
    "status": "pending",
    "type": "merchant",
    "payer_id": "6986e41195150878eaff1f46"
}
```

#### **Deposit Transaction:**
```json
{
    "_id": "6986e41595150878eaff1f57",
    "medium": "balance",
    "transaction_date": "2026-02-07",
    "amount": 1000,
    "description": "Paycheck deposit",
    "status": "pending",
    "payee_id": "6986e41195150878eaff1f46",
    "type": "deposit"
}
```

#### **Withdrawal Transaction:**
```json
{
    "_id": "...",
    "medium": "balance",
    "transaction_date": "2026-02-07",
    "amount": 50,
    "description": "Withdrawal",
    "status": "pending",
    "payer_id": "6986e41195150878eaff1f46",
    "type": "withdrawal"
}
```

#### **Transfer Transaction:**
```json
{
    "_id": "...",
    "medium": "balance",
    "transaction_date": "2026-02-07",
    "amount": 25,
    "description": "Transfer",
    "status": "pending",
    "payer_id": "source_account_id",
    "payee_id": "dest_account_id",
    "type": "transfer"
}
```

---

## 🔀 Mapping Nessie → Supabase

### Purchase → Transaction:
```typescript
function mapNessiePurchaseToSupabase(purchase: NessiePurchase, userId: string, merchant?: NessieMerchant): Transaction {
    return {
        user_id: userId,
        uuid_user_id: userId,
        // plaid_transaction_id: null, // Not applicable for Nessie
        amount: Math.abs(purchase.amount), // Ensure positive
        category: mapMerchantCategoryToCategory(merchant?.category), // Need merchant lookup
        name: purchase.description,
        tip: null, // Nessie doesn't provide tip data
        tax: null, // Nessie doesn't provide tax data
        date: purchase.purchase_date,
        account_id: purchase.payer_id, // Nessie account ID
        source: 'manual', // Or create new source type 'capital_one'
        merchant_name: merchant?.name || purchase.description,
        location: merchant?.address ? formatAddress(merchant.address) : null,
        pending: purchase.status === 'pending',
    };
}
```

### Deposit → Transaction (as Income):
```typescript
function mapNessieDepositToSupabase(deposit: NessieDeposit, userId: string): Transaction {
    return {
        user_id: userId,
        uuid_user_id: userId,
        amount: Math.abs(deposit.amount),
        category: 'Income', // Deposits are income
        name: deposit.description,
        date: deposit.transaction_date,
        account_id: deposit.payee_id,
        source: 'manual', // Or 'capital_one'
        merchant_name: null,
        pending: deposit.status === 'pending',
    };
}
```

### Withdrawal → Transaction:
```typescript
function mapNessieWithdrawalToSupabase(withdrawal: NessieWithdrawal, userId: string): Transaction {
    return {
        user_id: userId,
        uuid_user_id: userId,
        amount: Math.abs(withdrawal.amount),
        category: 'Other', // Withdrawals are typically "Other"
        name: withdrawal.description,
        date: withdrawal.transaction_date,
        account_id: withdrawal.payer_id,
        source: 'manual', // Or 'capital_one'
        pending: withdrawal.status === 'pending',
    };
}
```

### Account Mapping:
```typescript
// Nessie Account
{
    "_id": "6986e41195150878eaff1f46",
    "type": "Checking",
    "nickname": "Main Checking",
    "rewards": 100,
    "balance": 5000,
    "customer_id": "6986e40d95150878eaff1f37"
}

// → Supabase Account (from plaid/exchange-token route)
{
    user_id: userId,
    uuid_user_id: userId,
    // plaid_account_id: nessieAccount._id, // Use Nessie ID
    name: nessieAccount.nickname,
    type: nessieAccount.type.toLowerCase(), // "checking", "savings", etc.
    current_balance: nessieAccount.balance,
    // ... other fields
}
```

---

## 🎯 Integration Strategy

### Option 1: Add `source: 'capital_one'` to Supabase
- Extend the `source` type to include `'capital_one'`
- Store Nessie transaction IDs in a new field (or reuse `plaid_transaction_id` as `external_transaction_id`)

### Option 2: Use `source: 'manual'`
- Simpler, but loses traceability back to Nessie API
- Can't sync updates/deletes from Nessie

### Recommended Approach:

1. **Extend Transaction Schema:**
   ```typescript
   source: 'plaid' | 'manual' | 'receipt_scan' | 'generated' | 'capital_one';
   capital_one_transaction_id?: string; // Store Nessie _id
   ```

2. **Create Sync Endpoint:**
   - `/api/capital-one/sync-transactions` - Fetch all transactions from Nessie and upsert to Supabase
   - Handle date ranges (e.g., sync last 90 days, or all time)
   - Map merchant IDs to merchant names/categories

3. **Account Linking:**
   - Store Nessie account IDs in Supabase `accounts` table
   - Link via `plaid_account_id` field (or create `external_account_id`)

---

## 📝 Key Differences: Nessie vs Plaid

| Feature | Plaid | Nessie |
|---------|-------|--------|
| **Historical Data** | ✅ Real bank data (90 days) | ❌ None - you create it |
| **Account Types** | ✅ Real accounts | ✅ Mock accounts you create |
| **Transaction Categories** | ✅ Auto-categorized | ❌ Manual categorization needed |
| **Merchant Info** | ✅ Rich merchant data | ⚠️ Basic merchant data |
| **Location Data** | ✅ Transaction locations | ⚠️ Only merchant locations |
| **Real-time Sync** | ✅ Yes | ⚠️ Manual sync only |
| **Use Case** | Production banking | Demo/hackathon/testing |

---

## 🚀 Implementation Recommendations

1. **For Demo/Hackathon:**
   - Use Nessie to create sample customers/accounts/transactions
   - Generate historical data programmatically (like your `generateFiveYearsOfTransactions`)
   - Map to Supabase using the mappings above

2. **For Production:**
   - Use Plaid for real user data
   - Use Nessie only for testing/demo accounts
   - Keep data sources separate (`source` field)

3. **Hybrid Approach:**
   - Allow users to connect Plaid (real data)
   - Also allow manual entry via Nessie API (demo data)
   - Display both in unified transaction list

---

## 📋 Next Steps

1. ✅ API route created (`/api/capital-one/route.ts`)
2. ⏳ Create sync endpoint to import Nessie transactions to Supabase
3. ⏳ Add merchant lookup/categorization logic
4. ⏳ Extend Supabase schema to support `capital_one` source type
5. ⏳ Create UI to connect Capital One accounts (similar to Plaid flow)
