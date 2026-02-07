'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import styles from './shadcn-tabs.module.css';

const ShadTabs = TabsPrimitive.Root;

const ShadTabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
    ({ className, ...props }, ref) => (
        <TabsPrimitive.List ref={ref} className={cn(styles.list, className)} {...props} />
    )
);
ShadTabsList.displayName = TabsPrimitive.List.displayName;

const ShadTabsTrigger = forwardRef<
    ElementRef<typeof TabsPrimitive.Trigger>,
    ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn(styles.trigger, className)} {...props} />
));
ShadTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const ShadTabsContent = forwardRef<
    ElementRef<typeof TabsPrimitive.Content>,
    ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={cn(styles.content, className)} {...props} />
));
ShadTabsContent.displayName = TabsPrimitive.Content.displayName;

export { ShadTabs, ShadTabsList, ShadTabsTrigger, ShadTabsContent };
