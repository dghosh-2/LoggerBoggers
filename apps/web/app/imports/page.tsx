'use client';

import ReceiptUpload from '@/components/ReceiptUpload';
import MobileReceiptBridge from '@/components/MobileReceiptBridge';
import styles from './page.module.css';

export default function ImportsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Import Receipt</h1>
                <p>Upload a receipt photo, or scan the QR to upload from your phone.</p>
            </header>

            <div className={styles.content}>
                <div className={styles.uploadPane}>
                    <ReceiptUpload />
                </div>
                <div className={styles.bridgePane}>
                    <MobileReceiptBridge />
                </div>
            </div>
        </div>
    );
}
