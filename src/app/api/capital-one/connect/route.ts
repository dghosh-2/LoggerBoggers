import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome, generateHoldings } from '@/lib/fake-transaction-generator';
import { generateAggregatedStatistics } from '@/lib/aggregated-statistics';

const NESSIE_BASE_URL = 'http://api.nessieisreal.com';
const API_KEY = process.env.CAPITAL_ONE_API_KEY;

// Generate a unique ID for Capital One items
function generateCapitalOneItemId(): string {
    return `cap1_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create Capital One customer and accounts via Nessie API
async function createCapitalOneData(userId: string) {
    // Create a customer in Capital One
    const customerResponse = await fetch(`${NESSIE_BASE_URL}/customers?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            first_name: 'Demo',
            last_name: 'User',
            address: {
                street_number: '5000',
                street_name: 'Forbes Ave',
                city: 'Pittsburgh',
                state: 'PA',
                zip: '15213',
            },
        }),
    });
    
    const customerData = await customerResponse.json();
    const customerId = customerData.objectCreated?._id;
    
    if (!customerId) {
        throw new Error('Failed to create Capital One customer');
    }
    
    // Create accounts - matching the types Plaid would provide
    const accountsToCreate = [
        { type: 'Checking', nickname: 'Primary Checking', balance: 12500, rewards: 0 },
        { type: 'Savings', nickname: 'High-Yield Savings', balance: 35000, rewards: 500 },
        { type: 'Credit Card', nickname: 'Venture Rewards Card', balance: 2500, rewards: 45000 },
    ];
    
    const createdAccounts = [];
    
    for (const account of accountsToCreate) {
        const accountResponse = await fetch(`${NESSIE_BASE_URL}/customers/${customerId}/accounts?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account),
        });
        
        const accountData = await accountResponse.json();
        if (accountData.objectCreated) {
            createdAccounts.push({
                ...accountData.objectCreated,
                originalType: account.type,
            });
        }
    }
    
    return { customerId, accounts: createdAccounts };
}

// Sync a sample of transactions to Capital One API (just recent ones for demo)
async function syncTransactionsToCapitalOne(accountId: string, transactions: any[]) {
    // Get a merchant ID for purchases (use existing or create one)
    let merchantId: string | null = null;
    
    try {
        const merchantsResponse = await fetch(`${NESSIE_BASE_URL}/merchants?key=${API_KEY}`);
        const merchants = await merchantsResponse.json();
        if (Array.isArray(merchants) && merchants.length > 0) {
            merchantId = merchants[0]._id;
        }
    } catch (e) {
        console.error('Error fetching merchants:', e);
    }
    
    // Only sync last 30 days of transactions to Capital One (to avoid API limits)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentTransactions = transactions.filter(tx => new Date(tx.date) >= thirtyDaysAgo);
    
    // Sync up to 50 transactions to Capital One
    const transactionsToSync = recentTransactions.slice(0, 50);
    
    for (const tx of transactionsToSync) {
        try {
            if (merchantId) {
                // Create as purchase
                await fetch(`${NESSIE_BASE_URL}/accounts/${accountId}/purchases?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        merchant_id: merchantId,
                        medium: 'balance',
                        purchase_date: tx.date,
                        amount: tx.amount,
                        description: tx.name,
                    }),
                });
            }
        } catch (e) {
            // Silently continue if individual transaction fails
            console.error('Error syncing transaction to Capital One:', e);
        }
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Generate a unique item ID for this Capital One connection
        const itemId = generateCapitalOneItemId();
        const institutionName = 'Capital One';

        // Create data in Capital One API
        let capitalOneData: { customerId: string; accounts: any[] } | null = null;
        
        try {
            capitalOneData = await createCapitalOneData(userId);
        } catch (e) {
            console.error('Error creating Capital One data:', e);
            // Continue even if Capital One API fails - we'll still populate Supabase
        }

        // Default locations for different account types
        const accountLocations: Record<string, string> = {
            'depository': '600 Grant St, Pittsburgh, PA 15219',
            'checking': '600 Grant St, Pittsburgh, PA 15219',
            'savings': '1 PPG Pl, Pittsburgh, PA 15222',
            'investment': '1 PPG Pl, Pittsburgh, PA 15222',
            'loan': '525 William Penn Pl, Pittsburgh, PA 15219',
            'credit': '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
            'credit card': '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
        };

        // Store the Capital One item in Supabase (similar to plaid_items)
        const { error: insertError } = await supabaseAdmin.from('plaid_items').upsert({
            user_id: userId,
            uuid_user_id: userId,
            item_id: itemId,
            access_token: `cap1_${capitalOneData?.customerId || 'demo'}`, // Store Capital One customer ID
            institution_id: 'capital_one',
            institution_name: institutionName,
            status: 'active',
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'item_id',
        });

        if (insertError) {
            console.error('Error storing Capital One item:', insertError);
            return NextResponse.json(
                { error: 'Failed to store connection' },
                { status: 500 }
            );
        }

        // Create accounts in Supabase - same structure as Plaid
        // These are the accounts that will show up in the app
        const accountsToStore = [
            {
                plaid_account_id: `cap1_checking_${Date.now()}`,
                name: 'Capital One 360 Checking',
                official_name: 'Capital One 360 Checking Account',
                type: 'depository',
                subtype: 'checking',
                current_balance: 12500,
                available_balance: 12500,
                mask: '4521',
            },
            {
                plaid_account_id: `cap1_savings_${Date.now()}`,
                name: 'Capital One 360 Savings',
                official_name: 'Capital One 360 Performance Savings',
                type: 'depository',
                subtype: 'savings',
                current_balance: 35000,
                available_balance: 35000,
                mask: '7832',
            },
            {
                plaid_account_id: `cap1_credit_${Date.now()}`,
                name: 'Venture Rewards Card',
                official_name: 'Capital One Venture Rewards Credit Card',
                type: 'credit',
                subtype: 'credit card',
                current_balance: 2500,
                available_balance: null,
                credit_limit: 15000,
                mask: '9012',
            },
        ];

        for (const account of accountsToStore) {
            await supabaseAdmin.from('accounts').upsert({
                user_id: userId,
                uuid_user_id: userId,
                plaid_account_id: account.plaid_account_id,
                plaid_item_id: itemId,
                name: account.name,
                official_name: account.official_name,
                type: account.type,
                subtype: account.subtype,
                institution_name: institutionName,
                current_balance: account.current_balance,
                available_balance: account.available_balance,
                credit_limit: account.credit_limit || null,
                mask: account.mask,
                iso_currency_code: 'USD',
                location: accountLocations[account.type] || accountLocations[account.subtype || ''] || '600 Grant St, Pittsburgh, PA 15219',
                last_synced_at: new Date().toISOString(),
            }, {
                onConflict: 'plaid_account_id',
            });
        }

        // Only seed demo history once per user; never wipe existing history.
        const [{ data: anyTx }, { data: anyIncome }] = await Promise.all([
            supabaseAdmin.from('financial_transactions').select('id').eq('uuid_user_id', userId).limit(1),
            supabaseAdmin.from('income').select('id').eq('uuid_user_id', userId).limit(1),
        ]);
        const hasExistingFinancialData = (anyTx?.length ?? 0) > 0 || (anyIncome?.length ?? 0) > 0;

        const BATCH_SIZE = 500;
        let allTransactionsWithUser: any[] = [];

        if (!hasExistingFinancialData) {
            // Generate 5 years of fake historical data (same as Plaid flow)
            console.log('=== CAPITAL ONE: GENERATING FAKE DATA (FIRST TIME ONLY) ===');
            const fakeTransactions = generateFiveYearsOfTransactions();
            const fakeIncome = generateFiveYearsOfIncome();
            console.log(`Generated ${fakeTransactions.length} transactions`);
            console.log(`Generated ${fakeIncome.length} income records`);

            // Transform transactions to match actual database schema
            // Schema: user_id, uuid_user_id, date, category, name, merchant_name, amount, tip, tax, location, source, pending
            allTransactionsWithUser = fakeTransactions.map((tx) => {
                return {
                    user_id: userId,
                    uuid_user_id: userId,
                    merchant_name: tx.merchant_name || tx.name,
                    name: tx.name || tx.merchant_name,
                    amount: tx.amount,
                    date: tx.date,
                    category: tx.category || 'Other',
                    source: 'capital_one',
                    location: tx.location || null,
                    pending: false,
                    tip: tx.tip || null,
                    tax: tx.tax || null,
                };
            });

            // Transform income to match actual database schema
            // Schema: user_id, uuid_user_id, amount, source, name, date, recurring, frequency, location
            const fakeIncomeWithUser = fakeIncome.map(inc => ({
                user_id: userId,
                uuid_user_id: userId,
                amount: inc.amount,
                source: inc.source || 'Salary',
                name: inc.name || inc.source || 'Salary',
                date: inc.date,
                recurring: inc.recurring ?? true,
                frequency: inc.frequency || 'monthly',
                location: inc.location || null,
            }));

            // Insert transactions in batches
            console.log('=== CAPITAL ONE: INSERTING TRANSACTIONS (SEED) ===');
            let insertedTx = 0;
            for (let i = 0; i < allTransactionsWithUser.length; i += BATCH_SIZE) {
                const batch = allTransactionsWithUser.slice(i, i + BATCH_SIZE);
                const { error: txError } = await supabaseAdmin.from('financial_transactions').insert(batch);
                if (txError) {
                    console.error('Error inserting transactions batch:', txError);
                } else {
                    insertedTx += batch.length;
                }
            }
            console.log(`Successfully inserted ${insertedTx} transactions`);

            // Insert income
            console.log('=== CAPITAL ONE: INSERTING INCOME (SEED) ===');
            let insertedIncome = 0;
            for (let i = 0; i < fakeIncomeWithUser.length; i += BATCH_SIZE) {
                const batch = fakeIncomeWithUser.slice(i, i + BATCH_SIZE);
                const { error: incError } = await supabaseAdmin.from('income').insert(batch);
                if (incError) {
                    console.error('Error inserting income batch:', incError);
                } else {
                    insertedIncome += batch.length;
                }
            }
            console.log(`Successfully inserted ${insertedIncome} income records`);

            // Sync some transactions to Capital One API (demo only, best-effort)
            if (capitalOneData && capitalOneData.accounts.length > 0) {
                const checkingAccount = capitalOneData.accounts.find(a => a.type === 'Checking');
                if (checkingAccount) {
                    try {
                        await syncTransactionsToCapitalOne(checkingAccount._id, allTransactionsWithUser);
                    } catch (e) {
                        console.error('Error syncing to Capital One:', e);
                    }
                }
            }
        } else {
            console.log('Skipping demo data generation: existing financial data found for user:', userId);
        }

        // Generate and insert holdings for portfolio
        const fakeHoldings = generateHoldings();
        
        // Seed holdings only if the user doesn't already have holdings.
        const { data: anyHoldings } = await supabaseAdmin
            .from('holdings')
            .select('id')
            .eq('uuid_user_id', userId)
            .limit(1);
        const hasExistingHoldings = (anyHoldings?.length ?? 0) > 0;
        
        const holdingsWithUser = fakeHoldings.map(holding => ({
            user_id: userId,
            uuid_user_id: userId,
            // Note: account_id column may not exist in holdings table
            plaid_security_id: `sec_cap1_${holding.symbol.toLowerCase()}_${Date.now()}`,
            symbol: holding.symbol,
            name: holding.name,
            quantity: holding.quantity,
            price: holding.price,
            value: holding.value,
            cost_basis: holding.cost_basis,
            gain_loss: holding.gain_loss,
            gain_loss_percent: holding.gain_loss_percent,
            location: holding.location,
            last_updated_at: new Date().toISOString(),
        }));
        
        if (!hasExistingHoldings && holdingsWithUser.length > 0) {
            const { error: holdingsError } = await supabaseAdmin.from('holdings').insert(holdingsWithUser);
            if (holdingsError) {
                console.error('Error inserting holdings:', holdingsError);
            } else {
                console.log(`Successfully inserted ${holdingsWithUser.length} holdings for Capital One user:`, userId);
            }
        } else if (hasExistingHoldings) {
            console.log('Skipping holdings seed: existing holdings found for user:', userId);
        }

        // Update user connection status - use select then insert/update for reliability
        const { data: existingConnection } = await supabaseAdmin
            .from('user_plaid_connections')
            .select('id')
            .eq('uuid_user_id', userId)
            .single();

        let connectionError;
        if (existingConnection) {
            // Update existing record
            const { error } = await supabaseAdmin
                .from('user_plaid_connections')
                .update({
                    is_connected: true,
                    plaid_item_id: itemId,
                    last_sync_at: new Date().toISOString(),
                })
                .eq('uuid_user_id', userId);
            connectionError = error;
        } else {
            // Insert new record
            const { error } = await supabaseAdmin
                .from('user_plaid_connections')
                .insert({
                    user_id: userId,
                    uuid_user_id: userId,
                    is_connected: true,
                    plaid_item_id: itemId,
                    connected_at: new Date().toISOString(),
                    last_sync_at: new Date().toISOString(),
                });
            connectionError = error;
        }

        if (connectionError) {
            console.error('Error updating user_plaid_connections:', connectionError);
        } else {
            console.log('Successfully updated user_plaid_connections for Capital One user:', userId);
        }

        // Generate aggregated statistics for chatbot and dashboards
        console.log('=== CAPITAL ONE: GENERATING AGGREGATED STATISTICS ===');
        await generateAggregatedStatistics(userId);

        return NextResponse.json({ 
            success: true,
            item_id: itemId,
            institution: {
                name: institutionName,
                institution_id: 'capital_one',
            },
            message: 'Capital One account connected and data synced successfully',
            accounts_created: accountsToStore.length,
            transactions_generated: allTransactionsWithUser.length,
        });

    } catch (error: any) {
        console.error('Error connecting Capital One:', error);
        return NextResponse.json(
            { error: 'Failed to connect Capital One', details: error.message },
            { status: 500 }
        );
    }
}
