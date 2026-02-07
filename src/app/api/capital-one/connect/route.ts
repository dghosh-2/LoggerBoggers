import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserIdFromRequest } from '@/lib/auth';
import { generateFiveYearsOfTransactions, generateFiveYearsOfIncome } from '@/lib/fake-transaction-generator';

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
        const { error: insertError } = await supabase.from('plaid_items').upsert({
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
            await supabase.from('accounts').upsert({
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

        // Generate 5 years of fake historical data (same as Plaid flow)
        const fakeTransactions = generateFiveYearsOfTransactions();
        const fakeIncome = generateFiveYearsOfIncome();

        // Clear existing data and insert new
        await supabase.from('transactions').delete().eq('uuid_user_id', userId);
        await supabase.from('income').delete().eq('uuid_user_id', userId);

        // Add user_id to fake transactions and income
        const allTransactionsWithUser = fakeTransactions.map(tx => ({
            ...tx,
            user_id: userId,
            uuid_user_id: userId,
            source: 'generated' as const,
        }));

        const fakeIncomeWithUser = fakeIncome.map(inc => ({
            ...inc,
            user_id: userId,
            uuid_user_id: userId,
        }));

        // Insert transactions in batches
        const BATCH_SIZE = 500;
        for (let i = 0; i < allTransactionsWithUser.length; i += BATCH_SIZE) {
            const batch = allTransactionsWithUser.slice(i, i + BATCH_SIZE);
            await supabase.from('transactions').insert(batch);
        }

        // Insert income
        for (let i = 0; i < fakeIncomeWithUser.length; i += BATCH_SIZE) {
            const batch = fakeIncomeWithUser.slice(i, i + BATCH_SIZE);
            await supabase.from('income').insert(batch);
        }

        // Sync some transactions to Capital One API (for demo purposes)
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

        // Update user connection status
        await supabase.from('user_plaid_connections').upsert({
            user_id: userId,
            uuid_user_id: userId,
            is_connected: true,
            plaid_item_id: itemId,
            connected_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
        }, {
            onConflict: 'uuid_user_id',
        });

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
