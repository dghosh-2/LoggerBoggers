'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge, Group, ThemeIcon } from '@mantine/core';
import ReceiptUpload from '@/components/ReceiptUpload';
import MobileReceiptBridge from '@/components/MobileReceiptBridge';
import {
    ShadCard,
    ShadCardContent,
    ShadCardDescription,
    ShadCardHeader,
    ShadCardTitle,
} from '@/components/ui/shadcn-card';
import { ShadTabs, ShadTabsContent, ShadTabsList, ShadTabsTrigger } from '@/components/ui/shadcn-tabs';
import styles from './page.module.css';

const fadeUp = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: 'easeOut' },
};

export default function ImportsPage() {
    const [activeTab, setActiveTab] = useState<'receipts' | 'csv'>('receipts');

    return (
        <div className={styles.container}>
            <motion.header {...fadeUp} className={styles.header}>
                <Group align="center" justify="space-between" wrap="wrap" className={styles.headerTop}>
                    <div>
                        <Badge size="sm" color="green" variant="light" className={styles.headerBadge}>Picture Ingestion</Badge>
                        <h1>Import Pipeline</h1>
                        <p>Upload receipt images, process extraction, and route data into your transaction graph.</p>
                    </div>
                    <div className={styles.kpis}>
                        <ShadCard>
                            <ShadCardContent className={styles.kpiCard}>
                                <span>Input Modes</span>
                                <strong>2</strong>
                            </ShadCardContent>
                        </ShadCard>
                        <ShadCard>
                            <ShadCardContent className={styles.kpiCard}>
                                <span>Pipeline</span>
                                <strong>Live</strong>
                            </ShadCardContent>
                        </ShadCard>
                    </div>
                </Group>
            </motion.header>

            <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }}>
                <ShadTabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'receipts' | 'csv')}>
                    <ShadTabsList>
                        <ShadTabsTrigger value="receipts">Receipt Scanning</ShadTabsTrigger>
                        <ShadTabsTrigger value="csv">CSV Upload</ShadTabsTrigger>
                    </ShadTabsList>

                    <AnimatePresence mode="wait" initial={false}>
                        {activeTab === 'receipts' ? (
                            <motion.div
                                key="receipts"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.24 }}
                            >
                                <ShadTabsContent value="receipts" forceMount>
                                    <ShadCard className={styles.panelCard}>
                                        <ShadCardHeader>
                                            <div className={styles.cardTitleRow}>
                                                <ThemeIcon radius="xl" variant="light" color="green">
                                                    AI
                                                </ThemeIcon>
                                                <div>
                                                    <ShadCardTitle>Receipt Image Intake</ShadCardTitle>
                                                    <ShadCardDescription>
                                                        Drag an image, preview it, and run OCR extraction with one click.
                                                    </ShadCardDescription>
                                                </div>
                                            </div>
                                        </ShadCardHeader>
                                        <ShadCardContent className={styles.panelContent}>
                                            <ReceiptUpload />
                                            <MobileReceiptBridge />
                                        </ShadCardContent>
                                    </ShadCard>
                                </ShadTabsContent>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="csv"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.24 }}
                            >
                                <ShadTabsContent value="csv" forceMount>
                                    <ShadCard className={styles.panelCard}>
                                        <ShadCardHeader>
                                            <div className={styles.cardTitleRow}>
                                                <ThemeIcon radius="xl" variant="light" color="teal">
                                                    CSV
                                                </ThemeIcon>
                                                <div>
                                                    <ShadCardTitle>Batch Statement Import</ShadCardTitle>
                                                    <ShadCardDescription>
                                                        CSV ingestion is staged and will plug into the same validation pipeline.
                                                    </ShadCardDescription>
                                                </div>
                                            </div>
                                        </ShadCardHeader>
                                        <ShadCardContent>
                                            <div className={styles.placeholder}>
                                                <ThemeIcon radius="xl" size="lg" variant="light" color="gray">
                                                    +++
                                                </ThemeIcon>
                                                <h3>Coming next</h3>
                                                <p>Schema mapping, delimiter detection, and import previews will live here.</p>
                                            </div>
                                        </ShadCardContent>
                                    </ShadCard>
                                </ShadTabsContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </ShadTabs>
            </motion.section>
        </div>
    );
}
