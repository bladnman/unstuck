import type { DashboardResponse } from '@/types/unstuck';
import { sortItemsForInteraction } from '@/utils/dashboardFilters';

import styles from './ActivityStrip.module.css';

interface ActivityStripProps {
  dashboard: DashboardResponse | null;
  onFocusNowItems: () => void;
  onOpenItem: (itemId: string) => void;
  onOpenMemory: (memoryId?: string) => void;
  onOpenSessions: (sessionId?: string) => void;
}

export function ActivityStrip({
  dashboard,
  onFocusNowItems,
  onOpenItem,
  onOpenMemory,
  onOpenSessions,
}: ActivityStripProps) {
  const activeItems = sortItemsForInteraction(
    (dashboard?.items || []).filter((item) => item.state === 'active'),
  ).slice(0, 5);

  return (
    <section className={styles.strip}>
      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.kicker}>Now items</span>
            <h2 className={styles.headline}>Where the immediate pressure lives</h2>
          </div>
          <button className={styles.cardButton} onClick={onFocusNowItems} type="button">
            Open in workspace
          </button>
        </div>
        <p className={styles.supporting}>
          The dynamic app keeps the same now-first bias as the skill: transient, dated things still
          matter if they are the reason someone feels blocked right now.
        </p>
        <div className={styles.list}>
          {activeItems.length ? activeItems.map((item) => (
            <button className={styles.listItemButton} key={item.id} onClick={() => onOpenItem(item.id)} type="button">
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.itemBody}>{item.summary}</p>
              <span className={styles.meta}>{item.status}</span>
            </button>
          )) : (
            <div className={styles.empty}>No active items right now.</div>
          )}
        </div>
      </article>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.kicker}>Recent sessions</span>
            <h2 className={styles.headline}>{dashboard?.dashboard.sessionCount ?? 0} sessions</h2>
          </div>
          <button className={styles.cardButton} onClick={() => onOpenSessions()} type="button">
            Browse all
          </button>
        </div>
        <div className={styles.list}>
          {(dashboard?.dashboard.recentSessions || []).slice(0, 3).map((session) => (
            <button
              className={styles.listItemButton}
              key={session.id}
              onClick={() => onOpenSessions(session.id)}
              type="button"
            >
              <p className={styles.itemTitle}>{session.id}</p>
              <p className={styles.itemBody}>{session.summary}</p>
              <span className={styles.meta}>
                {session.itemsTouchedCount} items · {session.rawInputCount} raw inputs
              </span>
            </button>
          ))}
        </div>
      </article>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span className={styles.kicker}>Recent memory writes</span>
            <h2 className={styles.headline}>{dashboard?.dashboard.memoryCount ?? 0} files</h2>
          </div>
          <button className={styles.cardButton} onClick={() => onOpenMemory()} type="button">
            Browse all
          </button>
        </div>
        <div className={styles.list}>
          {(dashboard?.dashboard.recentMemory || []).slice(0, 3).map((memory) => (
            <button
              className={styles.listItemButton}
              key={memory.id}
              onClick={() => onOpenMemory(memory.id)}
              type="button"
            >
              <p className={styles.itemTitle}>{memory.title}</p>
              <p className={styles.itemBody}>{memory.description || 'No description captured yet.'}</p>
              <span className={styles.meta}>{memory.updatedAt}</span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
