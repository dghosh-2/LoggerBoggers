import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './shadcn-button.module.css';

type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'default' | 'sm' | 'lg';

interface ShadButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function ShadButton({
    className,
    variant = 'default',
    size = 'default',
    ...props
}: ShadButtonProps) {
    return (
        <button
            data-variant={variant}
            data-size={size}
            className={cn(styles.button, className)}
            {...props}
        />
    );
}
