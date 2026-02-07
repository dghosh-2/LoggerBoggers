import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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

export const plaidClient = new PlaidApi(configuration);
