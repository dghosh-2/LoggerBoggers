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

class PlaidErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode; fallback: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Plaid Error Boundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
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
        setLoading(true);
        try {
            const response = await fetch('/api/plaid/exchange-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_token,
                    institution: metadata.institution,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Token exchange failed:', errorData);
                throw new Error(errorData.error || 'Failed to exchange token');
            }

            // Invalidate all caches so fresh data is fetched
            useFinancialDataStore.getState().invalidateCache();
            usePortfolioStore.getState().invalidateCache();

            toast.success(`${metadata.institution?.name || 'Account'} connected successfully!`);
            onSuccess?.();
        } catch (error: any) {
            console.error('Error exchanging token:', error);
            const errorMessage = error.message || 'Failed to connect account. Please try again.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    const handleOnExit = useCallback((err: any, metadata: any) => {
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

    // Fetch link token on mount
    useEffect(() => {
        const fetchLinkToken = async () => {
            try {
                setTokenLoading(true);
                setTokenError(null);
                
                const response = await fetch('/api/plaid/create-link-token', {
                    method: 'POST',
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to create link token');
                }
                
                const data = await response.json();
                if (data.link_token) {
                    setLinkToken(data.link_token);
                } else {
                    throw new Error('No link token received');
                }
            } catch (error: any) {
                console.error('Error fetching link token:', error);
                setTokenError(error.message);
                toast.error('Failed to initialize Plaid. Please refresh and try again.');
            } finally {
                setTokenLoading(false);
            }
        };

        fetchLinkToken();
    }, []);

    // Show loading state while fetching token
    if (tokenLoading) {
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

    // If token failed to load, show disabled button with retry option
    if (!linkToken || tokenError) {
        return (
            <GlassButton
                variant={buttonVariant}
                size={buttonSize}
                disabled
                className={className}
            >
                {buttonText}
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
                    disabled
                    className={className}
                >
                    {buttonText}
                </GlassButton>
            }
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
