import type { DashboardResponse } from '@/types/unstuck';
import { sortItemsForInteraction } from '@/utils/dashboardFilters';

import styles from './ActivityStrip.module.css';

interface ActivityStripProps {
  dashboard: DashboardResponse | null;
}

export function ActivityStrip({ dashboard }: ActivityStripProps) {
  const activeItems = sortItemsForInteraction(
    (dashboard?.items || []).filter((item) => item.state === 'active'),
  ).slice(0, 4);

  return (
    <section className={styles.strip}>
      <article className={styles.card}>
        <span className={styles.kicker}>Now items</span>
        <h2 className={styles.headline}>Where the immediate pressure lives</h2>
        <p className={styles.supporting}>
          The dynamic app keeps the same now-first bias as the skill: transient, dated things still
          matter if they are the reason someone feels blocked right now.
        </p>
        <div className={styles.list}>
          {activeItems.map((item) => (
            <div className={styles.listItem} key={item.id}>
              <p className={styles.itemTitle}>{item.title}</p>
              <p className={styles.itemBody}>{item.summary}</p>
              <span className={styles.meta}>{item.status}</span>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.kicker}>Recent sessions</span>
        <h2 className={styles.headline}>{dashboard?.dashboard.sessionCount ?? 0} sessions</h2>
        <div className={styles.list}>
          {(dashboard?.dashboard.recentSessions || []).slice(0, 3).map((session) => (
            <div className={styles.listItem} key={session.id}>
              <p className={styles.itemTitle}>{session.id}</p>
              <p className={styles.itemBody}>{session.summary}</p>
              <span className={styles.meta}>
                {session.itemsTouchedCount} items · {session.rawInputCount} raw inputs
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.card}>
        <span className={styles.kicker}>Recent memory writes</span>
        <h2 className={styles.headline}>{dashboard?.dashboard.memoryCount ?? 0} files</h2>
        <div className={styles.list}>
          {(dashboard?.dashboard.recentMemory || []).slice(0, 3).map((memory) => (
            <div className={styles.listItem} key={memory.id}>
              <p className={styles.itemTitle}>{memory.title}</p>
              <p className={styles.itemBody}>{memory.description || 'No description captured yet.'}</p>
              <span className={styles.meta}>{memory.updatedAt}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
