'use client';

import { useCallback, useEffect, useState, Component, ReactNode } from 'react';
import { usePlaidLink, PlaidLinkOptions } from 'react-plaid-link';
import { toast } from '@/components/ui/toast';
import { GlassButton } from '@/components/ui/glass-button';
import { useFinancialDataStore } from '@/stores/financial-data-store';
import { usePortfolioStore } from '@/stores/portfolio-store';

interface PlaidLinkProps {
    onSuccess?: () => void;
    onExit?: () => void;
    buttonText?: string;
    buttonVariant?: 'primary' | 'secondary';
    buttonSize?: 'sm' | 'md' | 'lg';
    className?: string;
}

// Error boundary to catch Plaid errors
interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

class PlaidErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onRetry?: () => void }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode; fallback: ReactNode; onRetry?: () => void }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Plaid Error Boundary caught error:', error, errorInfo);
        // Log to error tracking service in production
    }

    render() {
        if (this.state.hasError) {
            // Try to recover after a delay
            setTimeout(() => {
                this.setState({ hasError: false });
                this.props.onRetry?.();
            }, 3000);
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Inner component that uses the hook only when token is available
function PlaidLinkButtonInner({
    linkToken,
    onSuccess,
    onExit,
    buttonText,
    buttonVariant,
    buttonSize,
    className,
}: PlaidLinkProps & { linkToken: string }) {
    const [loading, setLoading] = useState(false);

    const handleOnSuccess = useCallback(async (public_token: string, metadata: any) => {
        console.log('=== PLAID LINK SUCCESS ===');
        console.log('Public token received:', public_token?.substring(0, 20) + '...');
        console.log('Metadata:', JSON.stringify(metadata, null, 2));
        
        setLoading(true);
        let attempt = 0;
        const MAX_EXCHANGE_RETRIES = 2;
        
        while (attempt <= MAX_EXCHANGE_RETRIES) {
            try {
                console.log(`Exchange attempt ${attempt + 1}...`);
                // Add timeout for exchange request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch('/api/plaid/exchange-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        public_token,
                        institution: metadata.institution,
                    }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Try to parse JSON error details, but don't assume it's always JSON.
                    let errorData: any = null;
                    try {
                        errorData = await response.json();
                    } catch {
                        // ignore
                    }
                    console.error('Token exchange failed:', { status: response.status, errorData, attempt });
                    
                    // Handle auth errors specifically
                    if (response.status === 401) {
                        throw new Error('Please log in first to connect your accounts');
                    }
                    
                    // Retry on 5xx errors
                    if (response.status >= 500 && attempt < MAX_EXCHANGE_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        attempt++;
                        continue;
                    }
                    
                    const message =
                        errorData?.details ||
                        errorData?.error ||
                        `Failed to exchange token (HTTP ${response.status})`;
                    throw new Error(message);
                }

                // Success - invalidate caches and show success message
                useFinancialDataStore.getState().invalidateCache();
                usePortfolioStore.getState().invalidateCache();

                toast.success(`${metadata.institution?.name || 'Account'} connected successfully!`);
                onSuccess?.();
                return; // Exit on success
            } catch (error: any) {
                console.error(`Error exchanging token (attempt ${attempt + 1}):`, error);
                
                // Handle timeout
                if (error.name === 'AbortError') {
                    if (attempt < MAX_EXCHANGE_RETRIES) {
                        attempt++;
                        continue;
                    }
                    toast.error('Connection timeout. Please try again.');
                } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                    if (attempt < MAX_EXCHANGE_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        attempt++;
                        continue;
                    }
                    toast.error('Network error. Please check your connection and try again.');
                } else {
                    // Don't retry on client errors (4xx)
                    const errorMessage = error.message || 'Failed to connect account. Please try again.';
                    toast.error(errorMessage);
                    break;
                }
            }
        }
        
        setLoading(false);
    }, [onSuccess]);

    const handleOnExit = useCallback((err: any, metadata: any) => {
        console.log('=== PLAID LINK EXIT ===');
        console.log('Error:', err);
        console.log('Exit metadata:', JSON.stringify(metadata, null, 2));
        if (err) {
            console.error('Plaid Link exit error:', err);
        }
        onExit?.();
    }, [onExit]);

    const config: PlaidLinkOptions = {
        token: linkToken,
        onSuccess: handleOnSuccess,
        onExit: handleOnExit,
    };

    const { open, ready, error: plaidError } = usePlaidLink(config);

    useEffect(() => {
        if (plaidError) {
            console.error('Plaid Link hook error:', plaidError);
            // Log detailed error information for debugging
            if (plaidError.error_code) {
                console.error('Plaid error code:', plaidError.error_code);
                console.error('Plaid error message:', plaidError.error_message);
                console.error('Plaid error type:', plaidError.error_type);
            }
            
            // Show user-friendly error based on error type
            let userMessage = 'Plaid connection error';
            if (plaidError.error_code === 'ITEM_LOGIN_REQUIRED') {
                userMessage = 'Please log in to your bank account again.';
            } else if (plaidError.error_code === 'RATE_LIMIT_EXCEEDED') {
                userMessage = 'Too many requests. Please wait a moment and try again.';
            } else if (plaidError.error_message) {
                userMessage = plaidError.error_message;
            }
            
            toast.error(userMessage);
        }
    }, [plaidError]);

    return (
        <GlassButton
            variant={buttonVariant}
            size={buttonSize}
            onClick={() => open()}
            disabled={!ready || loading}
            className={className}
        >
            {loading ? 'Connecting...' : buttonText}
        </GlassButton>
    );
}

export function PlaidLinkButton({
    onSuccess,
    onExit,
    buttonText = 'Connect Account',
    buttonVariant = 'primary',
    buttonSize = 'sm',
    className,
}: PlaidLinkProps) {
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [tokenLoading, setTokenLoading] = useState(true);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const MAX_RETRIES = 3;

    // Check if user is authenticated
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/session');
                const data = await response.json();
                setIsAuthenticated(!!data.user);
            } catch {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    // Fetch link token with retry logic
    const fetchLinkToken = useCallback(async (attempt: number = 0): Promise<void> => {
        try {
            setTokenLoading(true);
            setTokenError(null);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/api/plaid/create-link-token', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch {
                    // If JSON parsing fails, use status text
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                // Handle specific error codes
                if (response.status === 429) {
                    // Rate limited - wait and retry
                    if (attempt < MAX_RETRIES) {
                        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        return fetchLinkToken(attempt + 1);
                    }
                    throw new Error('Too many requests. Please wait a moment and try again.');
                }
                
                if (response.status === 401) {
                    throw new Error('Please log in to connect your account.');
                }
                
                throw new Error(errorData.error || errorData.details || 'Failed to create link token');
            }
            
            const data = await response.json();
            if (data.link_token) {
                setLinkToken(data.link_token);
                setRetryCount(0); // Reset retry count on success
            } else {
                throw new Error('No link token received from server');
            }
        } catch (error: any) {
            console.error(`Error fetching link token (attempt ${attempt + 1}):`, error);
            
            // Handle network errors
            if (error.name === 'AbortError') {
                if (attempt < MAX_RETRIES) {
                    // Retry on timeout
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return fetchLinkToken(attempt + 1);
                }
                setTokenError('Connection timeout. Please check your internet and try again.');
            } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                if (attempt < MAX_RETRIES) {
                    // Retry on network errors
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return fetchLinkToken(attempt + 1);
                }
                setTokenError('Network error. Please check your connection and try again.');
            } else {
                setTokenError(error.message || 'Failed to initialize Plaid');
            }
            
            // Show user-friendly error message
            if (attempt === MAX_RETRIES - 1) {
                const errorMsg = error.message || 'Failed to initialize Plaid';
                if (errorMsg.includes('credentials') || errorMsg.includes('API')) {
                    toast.error('Plaid configuration error. Please contact support.');
                } else if (errorMsg.includes('timeout')) {
                    toast.error('Connection timeout. Please try again.');
                } else if (errorMsg.includes('Network')) {
                    toast.error('Network error. Please check your connection.');
                } else {
                    toast.error('Failed to initialize Plaid. Please refresh the page and try again.');
                }
            }
        } finally {
            setTokenLoading(false);
        }
    }, []);

    // Fetch link token on mount
    useEffect(() => {
        fetchLinkToken(0);
    }, [fetchLinkToken]);

    // Show loading state while checking auth or fetching token
    if (isAuthenticated === null || tokenLoading) {
        return (
            <GlassButton
                variant={buttonVariant}
                size={buttonSize}
                disabled
                className={className}
            >
                Loading...
            </GlassButton>
        );
    }

    // If not authenticated, show login prompt
    if (!isAuthenticated) {
        return (
            <GlassButton
                variant={buttonVariant}
                size={buttonSize}
                onClick={() => {
                    toast.error('Please log in first to connect your accounts');
                }}
                className={className}
            >
                {buttonText}
            </GlassButton>
        );
    }

    // If token failed to load, show retry button
    if (!linkToken || tokenError) {
        return (
            <GlassButton
                variant={buttonVariant}
                size={buttonSize}
                onClick={() => {
                    setRetryCount(prev => prev + 1);
                    fetchLinkToken(0);
                }}
                className={className}
                title={tokenError ? `Error: ${tokenError}. Click to retry.` : 'Click to retry'}
            >
                {tokenError ? 'Retry Connection' : buttonText}
            </GlassButton>
        );
    }

    // Wrap in error boundary to catch any Plaid initialization errors
    return (
        <PlaidErrorBoundary
            fallback={
                <GlassButton
                    variant={buttonVariant}
                    size={buttonSize}
                    onClick={() => {
                        setRetryCount(prev => prev + 1);
                        fetchLinkToken(0);
                    }}
                    className={className}
                >
                    Retry Connection
                </GlassButton>
            }
            onRetry={() => {
                // Retry fetching token when error boundary recovers
                fetchLinkToken(0);
            }}
        >
            <PlaidLinkButtonInner
                linkToken={linkToken}
                onSuccess={onSuccess}
                onExit={onExit}
                buttonText={buttonText}
                buttonVariant={buttonVariant}
                buttonSize={buttonSize}
                className={className}
            />
        </PlaidErrorBoundary>
    );
}

// Standalone hook for custom implementations
export function usePlaidLinkToken() {
    const [linkToken, setLinkToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLinkToken = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/plaid/create-link-token', {
                    method: 'POST',
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create link token');
                }
                
                const data = await response.json();
                setLinkToken(data.link_token);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching link token:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLinkToken();
    }, []);

    const refreshToken = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/plaid/create-link-token', {
                method: 'POST',
            });
            
            if (!response.ok) {
                throw new Error('Failed to create link token');
            }
            
            const data = await response.json();
            setLinkToken(data.link_token);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { linkToken, loading, error, refreshToken };
}

export default PlaidLinkButton;
