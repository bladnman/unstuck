import type { DashboardResponse } from '@/types/unstuck';

import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  dashboard: DashboardResponse | null;
  errorMessage: string;
  onOpenAiPanel: () => void;
  onToggleOverview: () => void;
  overviewExpanded: boolean;
}

export function DashboardHeader({
  dashboard,
  errorMessage,
  onOpenAiPanel,
  onToggleOverview,
  overviewExpanded,
}: DashboardHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleWrap}>
        <span className={styles.eyebrow}>Dynamic dashboard</span>
        <h1 className={styles.title}>Workspace first.</h1>
        <p className={styles.description}>
          Keep the board, table, day, and timeline as the main surface. Open the overview only
          when you need history, session traces, or recent memory writes.
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
        <div className={styles.actionRow}>
          <button className={styles.secondaryButton} onClick={onToggleOverview} type="button">
            {overviewExpanded ? 'Hide overview' : 'Show overview'}
          </button>
          <button className={styles.actionButton} onClick={onOpenAiPanel} type="button">
            Open AI panel
          </button>
        </div>
      </div>
    </header>
  );
}
