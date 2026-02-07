import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>LoggerBoggers<span>AI</span></div>
        <nav className={styles.nav}>
          {/* <Link href="/insights">Insights</Link>
          <Link href="/transactions">Transactions</Link> */}
          <div className={styles.badge}>Web Dashboard</div>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            Next-Gen <br />
            <span>Receipt Intelligence</span>
          </h1>
          <p className={styles.subtitle}>
            Professional-grade parsing for your finances. <br />
            Upload. Extract. Sort. Visualize.
          </p>

          <div className={styles.heroActions}>
            <Link href="/imports" className={styles.primaryBtn}>
              Upload Receipt
            </Link>
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>01</div>
            <h3>Smart Extraction</h3>
            <p>High-fidelity receipt parsing using backend intelligence.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>02</div>
            <h3>Auto-Sorting</h3>
            <p>Items fly into category buckets using GPT-4o intelligence.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}>03</div>
            <h3>Financial Graph</h3>
            <p>Every scan automatically updates your spending nodes and edges.</p>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 LoggerBoggers Monorepo • Built for Advanced AI-First Finance</p>
      </footer>
    </div>
  );
}
