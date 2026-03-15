import { useState } from 'react';

import { SegmentedControl } from '@/components/SegmentedControl/SegmentedControl';
import type { DashboardFilters as DashboardFiltersState, DashboardView, HorizonValue, ItemState } from '@/types/unstuck';
import { stateOrder } from '@/utils/dashboardFilters';

import styles from './DashboardFilters.module.css';

const viewOptions: Array<{ label: string; value: DashboardView }> = [
  { label: 'Board', value: 'board' },
  { label: 'Table', value: 'table' },
  { label: 'Day', value: 'day' },
  { label: 'Timeline', value: 'timeline' },
];

const sharedHorizonOptions: Array<{ label: string; value: HorizonValue }> = [
  { label: 'Today', value: 'today' },
  { label: '3 Days', value: '3d' },
  { label: 'Week', value: 'week' },
  { label: '2 Weeks', value: '2w' },
  { label: '4 Weeks', value: '4w' },
  { label: '8 Weeks', value: '8w' },
];

const dayHorizonOptions = sharedHorizonOptions.filter((option) =>
  ['today', '3d', 'week'].includes(option.value),
);

const horizonOptionsByView: Record<DashboardView, Array<{ label: string; value: HorizonValue }>> = {
  board: sharedHorizonOptions,
  table: sharedHorizonOptions,
  day: dayHorizonOptions,
  timeline: sharedHorizonOptions.filter((option) => option.value !== 'today'),
};

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onSearchChange: (search: string) => void;
  onViewChange: (view: DashboardView) => void;
  onHorizonChange: (horizon: HorizonValue) => void;
  onToggleState: (state: ItemState) => void;
  onSetAllStates: () => void;
  onCreateItem: (title: string, summary: string) => Promise<void>;
}

export function DashboardFilters({
  filters,
  onCreateItem,
  onHorizonChange,
  onSearchChange,
  onSetAllStates,
  onToggleState,
  onViewChange,
}: DashboardFiltersProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const horizonOptions = horizonOptionsByView[filters.view];

  return (
    <section className={styles.shell}>
      <div className={styles.row}>
        <div className={styles.fieldWrap}>
          <input
            className={styles.searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search titles, summaries, tags, memory context…"
            value={filters.search}
          />
          <SegmentedControl onChange={onViewChange} options={viewOptions} value={filters.view} />
        </div>

        <div className={styles.quickForm}>
          <input
            className={styles.quickInput}
            onChange={(event) => setNewItemTitle(event.target.value)}
            placeholder="Quick add a new item"
            value={newItemTitle}
          />
          <button
            className={styles.quickButton}
            onClick={async () => {
              if (!newItemTitle.trim()) {
                return;
              }

              await onCreateItem(newItemTitle.trim(), 'Captured from the dynamic dashboard quick add.');
              setNewItemTitle('');
            }}
            type="button"
          >
            New item
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <SegmentedControl onChange={onHorizonChange} options={horizonOptions} value={filters.horizon} />

        <div className={styles.stateRow}>
          <button className={styles.stateButton} onClick={onSetAllStates} type="button">
            All
          </button>
          {stateOrder.map((state) => (
            <button
              className={filters.states.includes(state) ? styles.stateButtonActive : styles.stateButton}
              key={state}
              onClick={() => onToggleState(state)}
              type="button"
            >
              {state}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
