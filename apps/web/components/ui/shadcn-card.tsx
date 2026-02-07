import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './shadcn-card.module.css';

export function ShadCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(styles.card, className)} {...props} />;
}

export function ShadCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(styles.header, className)} {...props} />;
}

export function ShadCardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn(styles.title, className)} {...props} />;
}

export function ShadCardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn(styles.description, className)} {...props} />;
}

export function ShadCardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(styles.content, className)} {...props} />;
}

export function ShadCardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn(styles.footer, className)} {...props} />;
}
