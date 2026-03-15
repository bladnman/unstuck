import type { DashboardResponse } from '@/types/unstuck';

import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  dashboard: DashboardResponse | null;
  errorMessage: string;
  onOpenAiPanel: () => void;
}

export function DashboardHeader({
  dashboard,
  errorMessage,
  onOpenAiPanel,
}: DashboardHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        <span className={styles.eyebrow}>Dynamic dashboard</span>
        <h1 className={styles.title}>Unstuck, but interactive.</h1>
        <p className={styles.description}>
          This app sits beside the static dashboard and works directly against the canonical
          <code> index.json </code>
          contract. Drag work around, edit item markdown, and keep the static browser companion in
          sync after every mutation.
        </p>
        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
      </div>

      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Tracked items</span>
            <span className={styles.metaValue}>{dashboard?.items.length ?? '—'}</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Last update</span>
            <span className={styles.metaValue}>{dashboard?.lastUpdated ?? '—'}</span>
          </div>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>UNSTUCK_HOME</span>
            <span className={styles.metaValue}>{dashboard?.home ?? 'Resolving…'}</span>
          </div>
        </div>
        <button className={styles.actionButton} onClick={onOpenAiPanel} type="button">
          Open AI side panel
        </button>
      </div>
    </header>
  );
}
