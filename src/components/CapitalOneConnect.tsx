'use client';

import { useState } from 'react';
import { toast } from '@/components/ui/toast';
import { GlassButton } from '@/components/ui/glass-button';
import { useFinancialDataStore } from '@/stores/financial-data-store';
import { usePortfolioStore } from '@/stores/portfolio-store';

interface CapitalOneConnectProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    buttonText?: string;
    buttonVariant?: 'primary' | 'secondary';
    buttonSize?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function CapitalOneConnectButton({
    onSuccess,
    onError,
    buttonText = 'Connect Capital One',
    buttonVariant = 'primary',
    buttonSize = 'sm',
    className,
}: CapitalOneConnectProps) {
    const [loading, setLoading] = useState(false);

    const handleConnect = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/capital-one/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect Capital One');
            }

            // Invalidate all caches so fresh data is fetched
            useFinancialDataStore.getState().invalidateCache();
            usePortfolioStore.getState().invalidateCache();

            toast.success('Capital One connected successfully!');
            onSuccess?.();
        } catch (error: any) {
            console.error('Error connecting Capital One:', error);
            toast.error(error.message || 'Failed to connect Capital One. Please try again.');
            onError?.(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <GlassButton
            variant={buttonVariant}
            size={buttonSize}
            onClick={handleConnect}
            disabled={loading}
            className={className}
        >
            {loading ? 'Connecting...' : buttonText}
        </GlassButton>
    );
}

export default CapitalOneConnectButton;
