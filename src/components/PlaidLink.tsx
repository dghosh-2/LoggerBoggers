'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { toast } from '@/components/ui/toast';
import { GlassButton } from '@/components/ui/glass-button';
import { Link2, Loader2 } from 'lucide-react';

interface PlaidLinkProps {
    onSuccess?: () => void;
    onExit?: () => void;
    buttonText?: string;
    buttonVariant?: 'primary' | 'secondary';
    buttonSize?: 'sm' | 'md' | 'lg';
    className?: string;
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
    const [loading, setLoading] = useState(false);

    // Fetch link token on mount
    useEffect(() => {
        const fetchLinkToken = async () => {
            try {
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
            }
        };

        fetchLinkToken();
    }, []);

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
                throw new Error('Failed to exchange token');
            }

            toast.success(`${metadata.institution?.name || 'Account'} connected successfully!`);
            onSuccess?.();
        } catch (error) {
            console.error('Error exchanging token:', error);
            toast.error('Failed to connect account. Please try again.');
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

    const { open, ready } = usePlaidLink({
        token: linkToken,
        onSuccess: handleOnSuccess,
        onExit: handleOnExit,
    });

    return (
        <GlassButton
            variant={buttonVariant}
            size={buttonSize}
            onClick={() => open()}
            disabled={!ready || loading}
            className={className}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Link2 className="w-3.5 h-3.5" />
            )}
            {loading ? 'Connecting...' : buttonText}
        </GlassButton>
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
