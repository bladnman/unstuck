import { Badge } from '@/components/Badge/Badge';
import type { UnstuckItem } from '@/types/unstuck';
import { formatDurationMinutes, getDateLabel } from '@/utils/dateUtils';

import styles from './TableView.module.css';

interface TableViewProps {
  items: UnstuckItem[];
  selectedItemId: string | null;
  onOpenItem: (itemId: string) => void;
  onToggleResolved: (item: UnstuckItem) => void;
}

export function TableView({
  items,
  selectedItemId,
  onOpenItem,
  onToggleResolved,
}: TableViewProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead className={styles.head}>
          <tr>
            <th className={styles.headCell}>Item</th>
            <th className={styles.headCell}>Summary</th>
            <th className={styles.headCell}>State</th>
            <th className={styles.headCell}>Status</th>
            <th className={styles.headCell}>Planned</th>
            <th className={styles.headCell}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={`${styles.row} ${selectedItemId === item.id ? styles.selected : ''}`}
              key={item.id}
            >
              <td className={styles.cell}>
                <button className={styles.itemButton} onClick={() => onOpenItem(item.id)} type="button">
                  {item.title}
                </button>
              </td>
              <td className={`${styles.cell} ${styles.summary}`}>{item.summary}</td>
              <td className={styles.cell}>
                <Badge label={item.state} tone={item.state} />
              </td>
              <td className={styles.cell}>
                <span className={styles.status}>{item.status}</span>
              </td>
              <td className={styles.cell}>
                {getDateLabel(item.plannedStart)}
                {item.fixedStartTime ? ` · ${item.fixedStartTime}` : ''}
                {item.durationMinutes ? ` · ${formatDurationMinutes(item.durationMinutes)}` : ''}
              </td>
              <td className={styles.cell}>
                <button className={styles.resolveButton} onClick={() => onToggleResolved(item)} type="button">
                  {item.state === 'resolved' ? 'Re-open' : 'Resolve'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
