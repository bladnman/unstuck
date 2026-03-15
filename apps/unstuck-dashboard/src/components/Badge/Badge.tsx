import clsx from 'clsx';

import type { ItemState } from '@/types/unstuck';

import styles from './Badge.module.css';

interface BadgeProps {
  label: string;
  tone?: ItemState | 'neutral';
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <span className={clsx(styles.badge, tone !== 'neutral' && styles[tone])}>
      <span className={styles.dot} />
      {label}
    </span>
  );
}
