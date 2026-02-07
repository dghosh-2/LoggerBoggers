import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Validate environment variables
if (!process.env.PLAID_CLIENT_ID) {
    throw new Error('Missing PLAID_CLIENT_ID environment variable');
}

if (!process.env.PLAID_SECRET) {
    throw new Error('Missing PLAID_SECRET environment variable');
}

// Force sandbox environment
const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox, // Explicitly use sandbox
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

console.log('Plaid configured for SANDBOX environment');
console.log('Plaid Client ID:', process.env.PLAID_CLIENT_ID?.substring(0, 8) + '...');

export const plaidClient = new PlaidApi(configuration);
