import { NextRequest, NextResponse } from 'next/server';

const NESSIE_BASE_URL = 'http://api.nessieisreal.com';
const API_KEY = process.env.CAPITAL_ONE_API_KEY;

// Helper function to make Nessie API requests
async function nessieRequest(endpoint: string, method: string = 'GET', body?: object) {
    const url = `${NESSIE_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${API_KEY}`;
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nessie API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

// GET - Test all available endpoints and return data summary
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const id = searchParams.get('id');
    
    try {
        // If specific endpoint requested, fetch that
        if (endpoint) {
            let path = '';
            
            switch (endpoint) {
                // Customer endpoints
                case 'customers':
                    path = '/customers';
                    break;
                case 'customer':
                    if (!id) throw new Error('Customer ID required');
                    path = `/customers/${id}`;
                    break;
                case 'customer-accounts':
                    if (!id) throw new Error('Customer ID required');
                    path = `/customers/${id}/accounts`;
                    break;
                case 'customer-bills':
                    if (!id) throw new Error('Customer ID required');
                    path = `/customers/${id}/bills`;
                    break;
                    
                // Account endpoints
                case 'accounts':
                    path = '/accounts';
                    break;
                case 'account':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}`;
                    break;
                case 'account-purchases':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/purchases`;
                    break;
                case 'account-deposits':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/deposits`;
                    break;
                case 'account-withdrawals':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/withdrawals`;
                    break;
                case 'account-transfers':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/transfers`;
                    break;
                case 'account-bills':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/bills`;
                    break;
                case 'account-loans':
                    if (!id) throw new Error('Account ID required');
                    path = `/accounts/${id}/loans`;
                    break;
                    
                // Loan endpoints
                case 'loans':
                    path = '/loans';
                    break;
                case 'loan':
                    if (!id) throw new Error('Loan ID required');
                    path = `/loans/${id}`;
                    break;
                    
                // Merchant endpoints
                case 'merchants':
                    path = '/merchants';
                    break;
                case 'merchant':
                    if (!id) throw new Error('Merchant ID required');
                    path = `/merchants/${id}`;
                    break;
                    
                // Location endpoints
                case 'atms':
                    path = '/atms';
                    break;
                case 'atm':
                    if (!id) throw new Error('ATM ID required');
                    path = `/atms/${id}`;
                    break;
                case 'branches':
                    path = '/branches';
                    break;
                case 'branch':
                    if (!id) throw new Error('Branch ID required');
                    path = `/branches/${id}`;
                    break;
                    
                // Transaction endpoints
                case 'purchases':
                    path = '/purchases';
                    break;
                case 'purchase':
                    if (!id) throw new Error('Purchase ID required');
                    path = `/purchases/${id}`;
                    break;
                case 'deposits':
                    path = '/deposits';
                    break;
                case 'deposit':
                    if (!id) throw new Error('Deposit ID required');
                    path = `/deposits/${id}`;
                    break;
                case 'withdrawals':
                    path = '/withdrawals';
                    break;
                case 'withdrawal':
                    if (!id) throw new Error('Withdrawal ID required');
                    path = `/withdrawals/${id}`;
                    break;
                case 'transfers':
                    path = '/transfers';
                    break;
                case 'transfer':
                    if (!id) throw new Error('Transfer ID required');
                    path = `/transfers/${id}`;
                    break;
                case 'bills':
                    path = '/bills';
                    break;
                case 'bill':
                    if (!id) throw new Error('Bill ID required');
                    path = `/bills/${id}`;
                    break;
                    
                // Enterprise endpoints (read-only)
                case 'enterprise-customers':
                    path = '/enterprise/customers';
                    break;
                case 'enterprise-accounts':
                    path = '/enterprise/accounts';
                    break;
                case 'enterprise-merchants':
                    path = '/enterprise/merchants';
                    break;
                case 'enterprise-purchases':
                    path = '/enterprise/purchases';
                    break;
                case 'enterprise-deposits':
                    path = '/enterprise/deposits';
                    break;
                case 'enterprise-withdrawals':
                    path = '/enterprise/withdrawals';
                    break;
                case 'enterprise-transfers':
                    path = '/enterprise/transfers';
                    break;
                case 'enterprise-bills':
                    path = '/enterprise/bills';
                    break;
                case 'enterprise-loans':
                    path = '/enterprise/loans';
                    break;
                    
                default:
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }
            
            const data = await nessieRequest(path);
            return NextResponse.json({ success: true, endpoint, data });
        }
        
        // Default: Test multiple endpoints and return summary
        const results: Record<string, unknown> = {};
        const errors: Record<string, string> = {};
        
        // Test key endpoints
        const endpointsToTest = [
            { name: 'customers', path: '/customers' },
            { name: 'accounts', path: '/accounts' },
            { name: 'merchants', path: '/merchants' },
            { name: 'atms', path: '/atms' },
            { name: 'branches', path: '/branches' },
            { name: 'purchases', path: '/purchases' },
            { name: 'deposits', path: '/deposits' },
            { name: 'withdrawals', path: '/withdrawals' },
            { name: 'transfers', path: '/transfers' },
            { name: 'bills', path: '/bills' },
            { name: 'loans', path: '/loans' },
        ];
        
        for (const ep of endpointsToTest) {
            try {
                const data = await nessieRequest(ep.path);
                results[ep.name] = {
                    count: Array.isArray(data) ? data.length : 1,
                    sample: Array.isArray(data) ? data.slice(0, 2) : data,
                };
            } catch (error) {
                errors[ep.name] = error instanceof Error ? error.message : 'Unknown error';
            }
        }
        
        return NextResponse.json({
            success: true,
            apiKey: API_KEY ? `${API_KEY.slice(0, 8)}...` : 'NOT SET',
            results,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
        });
        
    } catch (error) {
        console.error('Capital One API error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}

// POST - Create new resources
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    try {
        const body = await request.json();
        
        switch (action) {
            case 'create-customer': {
                // Create a new customer
                const customerData = {
                    first_name: body.first_name || 'Test',
                    last_name: body.last_name || 'User',
                    address: body.address || {
                        street_number: '123',
                        street_name: 'Main St',
                        city: 'Pittsburgh',
                        state: 'PA',
                        zip: '15213',
                    },
                };
                
                const url = `${NESSIE_BASE_URL}/customers?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-account': {
                // Create account for a customer
                const { customer_id, type, nickname, rewards, balance } = body;
                if (!customer_id) throw new Error('customer_id required');
                
                const accountData = {
                    type: type || 'Checking',
                    nickname: nickname || 'My Account',
                    rewards: rewards || 0,
                    balance: balance || 0,
                };
                
                const url = `${NESSIE_BASE_URL}/customers/${customer_id}/accounts?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(accountData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-purchase': {
                // Create a purchase transaction
                const { account_id, merchant_id, amount, description } = body;
                if (!account_id) throw new Error('account_id required');
                if (!merchant_id) throw new Error('merchant_id required');
                
                const purchaseData = {
                    merchant_id,
                    medium: 'balance',
                    purchase_date: new Date().toISOString().split('T')[0],
                    amount: amount || 10,
                    description: description || 'Purchase',
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${account_id}/purchases?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(purchaseData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-deposit': {
                // Create a deposit
                const { account_id, amount, description } = body;
                if (!account_id) throw new Error('account_id required');
                
                const depositData = {
                    medium: 'balance',
                    transaction_date: new Date().toISOString().split('T')[0],
                    amount: amount || 100,
                    description: description || 'Deposit',
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${account_id}/deposits?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(depositData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-withdrawal': {
                // Create a withdrawal
                const { account_id, amount, description } = body;
                if (!account_id) throw new Error('account_id required');
                
                const withdrawalData = {
                    medium: 'balance',
                    transaction_date: new Date().toISOString().split('T')[0],
                    amount: amount || 50,
                    description: description || 'Withdrawal',
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${account_id}/withdrawals?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(withdrawalData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-transfer': {
                // Create a transfer between accounts
                const { from_account_id, to_account_id, amount, description } = body;
                if (!from_account_id) throw new Error('from_account_id required');
                if (!to_account_id) throw new Error('to_account_id required');
                
                const transferData = {
                    medium: 'balance',
                    payee_id: to_account_id,
                    transaction_date: new Date().toISOString().split('T')[0],
                    amount: amount || 25,
                    description: description || 'Transfer',
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${from_account_id}/transfers?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transferData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-bill': {
                // Create a bill
                const { account_id, payee, amount, recurring_date } = body;
                if (!account_id) throw new Error('account_id required');
                
                const billData = {
                    status: 'pending',
                    payee: payee || 'Utility Company',
                    nickname: body.nickname || 'Monthly Bill',
                    creation_date: new Date().toISOString().split('T')[0],
                    payment_date: body.payment_date || new Date().toISOString().split('T')[0],
                    recurring_date: recurring_date || 1,
                    upcoming_payment_date: body.upcoming_payment_date || new Date().toISOString().split('T')[0],
                    payment_amount: amount || 100,
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${account_id}/bills?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(billData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-loan': {
                // Create a loan for an account
                const { account_id, type, status, credit_score, monthly_payment, amount } = body;
                if (!account_id) throw new Error('account_id required');
                
                const loanData = {
                    type: type || 'student',
                    status: status || 'active',
                    credit_score: credit_score || 750,
                    monthly_payment: monthly_payment || 200,
                    amount: amount || 10000,
                };
                
                const url = `${NESSIE_BASE_URL}/accounts/${account_id}/loans?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loanData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            case 'create-merchant': {
                // Create a merchant
                const merchantData = {
                    name: body.name || 'Test Merchant',
                    category: body.category || ['food'],
                    address: body.address || {
                        street_number: '456',
                        street_name: 'Commerce St',
                        city: 'Pittsburgh',
                        state: 'PA',
                        zip: '15213',
                    },
                    geocode: body.geocode || {
                        lat: 40.4406,
                        lng: -79.9959,
                    },
                };
                
                const url = `${NESSIE_BASE_URL}/merchants?key=${API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(merchantData),
                });
                
                const data = await response.json();
                return NextResponse.json({ success: true, action, data });
            }
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
        
    } catch (error) {
        console.error('Capital One API POST error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}
