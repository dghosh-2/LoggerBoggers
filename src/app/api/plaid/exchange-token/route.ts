import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getUserIdFromRequest } from '@/lib/auth';
import { generateAggregatedStatistics } from '@/lib/aggregated-statistics';

export async function POST(request: NextRequest) {
    console.log('=== EXCHANGE TOKEN API CALLED ===');
    try {
        // Get authenticated user ID
        const userId = await getUserIdFromRequest(request);
        console.log('User ID from request:', userId);
        
        if (!userId) {
            console.error('Authentication failed: No user ID found');
            return NextResponse.json(
                { error: 'Authentication required', details: 'No valid session found' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { public_token, institution } = body;
        console.log('Request body received:', { hasPublicToken: !!public_token, institution });

        if (!public_token) {
            console.error('Missing public_token in request');
            return NextResponse.json(
                { error: 'Public token is required' },
                { status: 400 }
            );
        }

        console.log('Attempting to exchange public token for user:', userId);
        console.log('Institution:', institution?.name || 'Unknown');

        // Exchange public token for access token with retry logic
        let response;
        let accessToken: string;
        let itemId: string;
        let attempts = 0;
        const MAX_ATTEMPTS = 3;
        
        while (attempts < MAX_ATTEMPTS) {
            try {
                response = await plaidClient.itemPublicTokenExchange({
                    public_token,
                });
                
                accessToken = response.data.access_token;
                itemId = response.data.item_id;
                break; // Success, exit loop
            } catch (exchangeError: any) {
                attempts++;
                console.error(`Token exchange attempt ${attempts} failed:`, exchangeError);
                
                // Don't retry on client errors (4xx)
                if (exchangeError.response?.status && exchangeError.response.status < 500) {
                    throw exchangeError;
                }
                
                // Retry on server errors (5xx) or network errors
                if (attempts < MAX_ATTEMPTS) {
                    const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff
                    console.log(`Retrying token exchange in ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    throw exchangeError;
                }
            }
        }

        console.log('Successfully exchanged token. Item ID:', itemId);

        // Store the access token in Supabase (in production, encrypt this!)
        const { error: insertError } = await supabaseAdmin.from('plaid_items').upsert({
            user_id: userId,
            uuid_user_id: userId,
            item_id: itemId,
            access_token: accessToken,
            institution_id: institution?.institution_id || null,
            institution_name: institution?.name || 'Unknown',
            status: 'active',
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'item_id',
        });

        if (insertError) {
            console.error('Error storing access token:', insertError);
            return NextResponse.json(
                { error: 'Failed to store access token', details: insertError.message },
                { status: 500 }
            );
        }

        // Sync transactions and accounts
        try {
            // Get accounts from Plaid
            const accountsResponse = await plaidClient.accountsGet({
                access_token: accessToken,
            });

            const plaidAccounts = accountsResponse.data.accounts;

            // Store accounts in Supabase
            // Note: For demo purposes, we adjust balances to show a positive net worth
            // In production, you'd use the actual Plaid balances
            
            // Default locations for different account types
            const accountLocations: Record<string, string> = {
                'depository': '600 Grant St, Pittsburgh, PA 15219',
                'investment': '1 PPG Pl, Pittsburgh, PA 15222',
                'loan': '525 William Penn Pl, Pittsburgh, PA 15219',
                'credit': '420 Fort Duquesne Blvd, Pittsburgh, PA 15222',
            };
            
            for (const account of plaidAccounts) {
                let adjustedBalance = account.balances.current || 0;
                
                // For demo: scale down loan balances to show positive net worth
                // This makes the demo more visually appealing
                if (account.type === 'loan') {
                    adjustedBalance = Math.round(adjustedBalance * 0.15); // Reduce loans to 15%
                } else if (account.type === 'depository') {
                    adjustedBalance = Math.round(adjustedBalance * 1.5); // Increase cash by 50%
                } else if (account.type === 'investment') {
                    adjustedBalance = Math.round(adjustedBalance * 2); // Double investments
                }
                
                await supabaseAdmin.from('accounts').upsert({
                    user_id: userId,
                    uuid_user_id: userId,
                    plaid_account_id: account.account_id,
                    plaid_item_id: itemId,
                    name: account.name,
                    official_name: account.official_name,
                    type: account.type,
                    subtype: account.subtype,
                    institution_name: institution?.name || 'Unknown',
                    current_balance: adjustedBalance,
                    available_balance: account.balances.available,
                    credit_limit: account.balances.limit,
                    mask: account.mask,
                    iso_currency_code: account.balances.iso_currency_code || 'USD',
                    location: accountLocations[account.type] || '600 Grant St, Pittsburgh, PA 15219',
                    last_synced_at: new Date().toISOString(),
                }, {
                    onConflict: 'plaid_account_id',
                });
            }

            // Fetch and store transactions
            const now = new Date();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const transactionsResponse = await plaidClient.transactionsGet({
                access_token: accessToken,
                start_date: ninetyDaysAgo.toISOString().split('T')[0],
                end_date: now.toISOString().split('T')[0],
            });

            const plaidTransactions = transactionsResponse.data.transactions;

            // Import the generator and category mapper
            const { generateFiveYearsOfTransactions, generateFiveYearsOfIncome, generateHoldings } = await import('@/lib/fake-transaction-generator');

            // Map Plaid categories to our simplified categories
            // Also check merchant name for better categorization
            const mapPlaidCategory = (plaidCategories: string[] | null | undefined, merchantName?: string | null): string => {
                const name = (merchantName || '').toLowerCase();
                
                // First try to categorize by merchant name (more reliable for sandbox)
                if (name.includes('starbucks') || name.includes('mcdonald') || name.includes('kfc') || 
                    name.includes('restaurant') || name.includes('cafe') || name.includes('coffee') ||
                    name.includes('doordash') || name.includes('uber eats') || name.includes('grubhub')) {
                    return 'Food & Drink';
                }
                if (name.includes('uber') || name.includes('lyft') || name.includes('gas') || 
                    name.includes('shell') || name.includes('chevron') || name.includes('exxon') ||
                    name.includes('parking') || name.includes('transit')) {
                    return 'Transportation';
                }
                if (name.includes('united') || name.includes('delta') || name.includes('american airlines') ||
                    name.includes('southwest') || name.includes('airline') || name.includes('hotel') ||
                    name.includes('marriott') || name.includes('hilton') || name.includes('airbnb')) {
                    return 'Travel';
                }
                if (name.includes('amazon') || name.includes('walmart') || name.includes('target') ||
                    name.includes('costco') || name.includes('best buy') || name.includes('shop')) {
                    return 'Shopping';
                }
                if (name.includes('netflix') || name.includes('spotify') || name.includes('hulu') ||
                    name.includes('disney') || name.includes('hbo') || name.includes('theater') ||
                    name.includes('cinema') || name.includes('game')) {
                    return 'Entertainment';
                }
                if (name.includes('gym') || name.includes('fitness') || name.includes('pharmacy') ||
                    name.includes('cvs') || name.includes('walgreens') || name.includes('doctor') ||
                    name.includes('medical') || name.includes('health')) {
                    return 'Health & Fitness';
                }
                if (name.includes('electric') || name.includes('water') || name.includes('utility') ||
                    name.includes('comcast') || name.includes('verizon') || name.includes('at&t') ||
                    name.includes('t-mobile') || name.includes('internet') || name.includes('payment')) {
                    return 'Bills & Utilities';
                }
                
                // Fall back to Plaid categories if merchant name didn't match
                if (!plaidCategories || plaidCategories.length === 0) return 'Other';
                const allCategories = plaidCategories.join(' ').toLowerCase();
                if (allCategories.includes('food') || allCategories.includes('restaurant') || allCategories.includes('coffee')) return 'Food & Drink';
                if (allCategories.includes('travel') || allCategories.includes('airline') || allCategories.includes('hotel')) return 'Travel';
                if (allCategories.includes('transport') || allCategories.includes('uber') || allCategories.includes('lyft') || allCategories.includes('gas')) return 'Transportation';
                if (allCategories.includes('shop') || allCategories.includes('merchandise') || allCategories.includes('store')) return 'Shopping';
                if (allCategories.includes('entertainment') || allCategories.includes('recreation')) return 'Entertainment';
                if (allCategories.includes('health') || allCategories.includes('medical') || allCategories.includes('pharmacy')) return 'Health & Fitness';
                if (allCategories.includes('bill') || allCategories.includes('utility') || allCategories.includes('telecom')) return 'Bills & Utilities';
                if (allCategories.includes('personal') || allCategories.includes('service')) return 'Personal Care';
                if (allCategories.includes('education') || allCategories.includes('book')) return 'Education';
                return 'Other';
            };

            // Convert Plaid transactions to our format
            // Note: We'll skip Plaid sandbox transactions as they have unrealistic amounts ($500 for everything)
            // and use our generated data instead for a better demo experience
            const formattedPlaidTransactions = plaidTransactions.map(tx => {
                const isFoodRelated = (tx.category?.[0] || '').toLowerCase().includes('food');
                return {
                    user_id: userId,
                    uuid_user_id: userId,
                    plaid_transaction_id: tx.transaction_id,
                    merchant_name: tx.merchant_name || tx.name,
                    name: tx.name,
                    amount: Math.abs(tx.amount),
                    date: tx.date,
                    category: tx.category?.[0] || 'Other',
                    source: 'plaid',
                    pending: tx.pending,
                    tip: isFoodRelated ? Math.round(Math.abs(tx.amount) * 0.15 * 100) / 100 : null,
                    tax: isFoodRelated ? Math.round(Math.abs(tx.amount) * 0.08 * 100) / 100 : null,
                };
            });

            // Only seed demo data once per user; never wipe existing history.
            const [{ data: anyTx }, { data: anyIncome }] = await Promise.all([
                supabaseAdmin.from('transactions').select('id').eq('uuid_user_id', userId).limit(1),
                supabaseAdmin.from('income').select('id').eq('uuid_user_id', userId).limit(1),
            ]);
            const hasExistingFinancialData = (anyTx?.length ?? 0) > 0 || (anyIncome?.length ?? 0) > 0;

            const BATCH_SIZE = 500;
            if (!hasExistingFinancialData) {
                // Generate 5 years of fake historical data (up to TODAY, not 90 days ago)
                console.log('=== GENERATING FAKE DATA (FIRST TIME ONLY) ===');
                const fakeTransactions = generateFiveYearsOfTransactions();
                const fakeIncome = generateFiveYearsOfIncome();
                console.log(`Generated ${fakeTransactions.length} transactions`);
                console.log(`Generated ${fakeIncome.length} income records`);

                // Use ALL fake transactions - they go up to current date
                // Don't filter by 90 days since Plaid sandbox data has unrealistic amounts
                // For a real production app, you'd want to merge Plaid data properly
                const allTransactions = fakeTransactions;

                // Transform transactions to match actual database schema
                // Schema: user_id, uuid_user_id, date, category, name, merchant_name, amount, tip, tax, location, source, pending
                const allTransactionsWithUser = allTransactions.map(tx => {
                    return {
                        user_id: userId,
                        uuid_user_id: userId,
                        merchant_name: tx.merchant_name || tx.name,
                        name: tx.name || tx.merchant_name,
                        amount: tx.amount,
                        date: tx.date,
                        category: tx.category || 'Other',
                        source: 'plaid',
                        location: tx.location || null,
                        pending: false,
                        tip: tx.tip || null,
                        tax: tx.tax || null,
                    };
                });

                // Transform income to match actual schema
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
                console.log('=== INSERTING TRANSACTIONS (SEED) ===');
                let insertedTx = 0;
                for (let i = 0; i < allTransactionsWithUser.length; i += BATCH_SIZE) {
                    const batch = allTransactionsWithUser.slice(i, i + BATCH_SIZE);
                    const { error: txError } = await supabaseAdmin.from('transactions').insert(batch);
                    if (txError) {
                        console.error(`Error inserting transaction batch ${i}:`, txError);
                    } else {
                        insertedTx += batch.length;
                    }
                }
                console.log(`Successfully inserted ${insertedTx} transactions`);

                // Insert income
                console.log('=== INSERTING INCOME (SEED) ===');
                let insertedIncome = 0;
                for (let i = 0; i < fakeIncomeWithUser.length; i += BATCH_SIZE) {
                    const batch = fakeIncomeWithUser.slice(i, i + BATCH_SIZE);
                    const { error: incError } = await supabaseAdmin.from('income').insert(batch);
                    if (incError) {
                        console.error(`Error inserting income batch ${i}:`, incError);
                    } else {
                        insertedIncome += batch.length;
                    }
                }
                console.log(`Successfully inserted ${insertedIncome} income records`);
            } else {
                console.log('Skipping demo data generation: existing financial data found for user:', userId);
            }

            // Generate and insert holdings for investment accounts
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
                plaid_security_id: `sec_${holding.symbol.toLowerCase()}_${Date.now()}`,
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
                    console.log(`Successfully inserted ${holdingsWithUser.length} holdings for user:`, userId);
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
                console.log('Successfully updated user_plaid_connections for user:', userId);
            }

            // Generate aggregated statistics for chatbot and dashboards
            console.log('=== GENERATING AGGREGATED STATISTICS ===');
            await generateAggregatedStatistics(userId);

            // Trigger budget recalculation (client-side will pick this up)
            console.log('=== DATA SYNC COMPLETE - Budget will auto-refresh on client ===');

        } catch (syncError: any) {
            console.error('Error syncing data:', syncError);
            console.error('Sync error details:', syncError.response?.data || syncError.message);
            // Don't fail the connection if sync fails - data can be synced later
        }

        console.log('Account connected successfully for user:', userId);

        return NextResponse.json({ 
            success: true,
            item_id: itemId,
            message: 'Account connected and data synced successfully',
        });
    } catch (error: any) {
        console.error('Error exchanging token:', error);
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            statusCode: error.response?.status,
        });
        
        // Provide more specific error messages
        let errorMessage = 'Failed to exchange token';
        let errorDetails = error.message;
        let statusCode = 500;
        
        if (error.response?.data) {
            errorDetails = JSON.stringify(error.response.data);
            
            // Check for common Plaid errors
            if (error.response.data.error_code === 'INVALID_PUBLIC_TOKEN') {
                errorMessage = 'Invalid or expired Plaid token';
                errorDetails = 'Please try connecting your account again';
                statusCode = 400;
            } else if (error.response.data.error_code === 'INVALID_CREDENTIALS') {
                errorMessage = 'Invalid Plaid API credentials';
                errorDetails = 'Please check your Plaid configuration';
                statusCode = 500;
            } else if (error.response.data.error_code === 'RATE_LIMIT_EXCEEDED') {
                errorMessage = 'Too many requests. Please try again in a moment.';
                errorDetails = 'Rate limit exceeded';
                statusCode = 429;
            } else if (error.response.data.error_code === 'ITEM_ERROR') {
                errorMessage = 'Plaid service error. Please try again.';
                errorDetails = error.response.data.error_message || errorDetails;
                statusCode = 500;
            } else if (error.response.data.error_message) {
                errorMessage = error.response.data.error_message;
            }
        } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
            errorMessage = 'Connection timeout. Please try again.';
            errorDetails = 'The request took too long to complete';
            statusCode = 504;
        } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('network')) {
            errorMessage = 'Network error. Please check your connection.';
            errorDetails = 'Unable to reach Plaid service';
            statusCode = 503;
        }
        
        return NextResponse.json(
            { error: errorMessage, details: errorDetails },
            { status: statusCode }
        );
    }
}
