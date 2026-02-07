'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions } from 'react-plaid-link';
import { toast } from '@/components/ui/toast';
import { GlassButton } from '@/components/ui/glass-button';
import { Link2, Loader2 } from 'lucide-react';
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
                // Try to parse JSON error details, but don't assume it's always JSON.
                let errorData: any = null;
                try {
                    errorData = await response.json();
                } catch {
                    // ignore
                }
                console.error('Token exchange failed:', { status: response.status, errorData });
                const message =
                    errorData?.details ||
                    errorData?.error ||
                    `Failed to exchange token (HTTP ${response.status})`;
                throw new Error(message);
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
            console.error('Plaid Link error:', err);
        }
        onExit?.();
    }, [onExit]);

    const config: PlaidLinkOptions = {
        token: linkToken,
        onSuccess: handleOnSuccess,
        onExit: handleOnExit,
    };

    const { open, ready } = usePlaidLink(config);

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

    // Fetch link token on mount
    useEffect(() => {
        const fetchLinkToken = async () => {
            try {
                setTokenLoading(true);
                const response = await fetch('/api/plaid/create-link-token', {
                    method: 'POST',
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create link token');
                }
                
                const data = await response.json();
                setLinkToken(data.link_token);
            } catch (error) {
                console.error('Error fetching link token:', error);
                toast.error('Failed to initialize Plaid. Please try again.');
            } finally {
                setTokenLoading(false);
            }
        };

        fetchLinkToken();
    }, []);

    // Show loading state while fetching token
    if (tokenLoading || !linkToken) {
        return (
            <GlassButton
                variant={buttonVariant}
                size={buttonSize}
                disabled
                className={className}
            >
                {tokenLoading ? 'Loading...' : buttonText}
            </GlassButton>
        );
    }

    return (
        <PlaidLinkButtonInner
            linkToken={linkToken}
            onSuccess={onSuccess}
            onExit={onExit}
            buttonText={buttonText}
            buttonVariant={buttonVariant}
            buttonSize={buttonSize}
            className={className}
        />
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
