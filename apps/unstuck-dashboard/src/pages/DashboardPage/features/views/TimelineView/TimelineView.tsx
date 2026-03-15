import type { CSSProperties } from 'react';
import { useState } from 'react';

import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import type { HorizonValue, UnstuckItem } from '@/types/unstuck';
import { getTimelineDates } from '@/utils/dateUtils';

import styles from './TimelineView.module.css';

interface TimelineViewProps {
  horizon: HorizonValue;
  items: UnstuckItem[];
  selectedItemId: string | null;
  onMoveItem: (itemId: string, plannedStart: string) => Promise<void>;
  onDurationChange: (itemId: string, durationDays: number) => Promise<void>;
  onOpenItem: (itemId: string) => void;
}

function DropCell({ itemId, date }: { itemId: string; date: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${itemId}:${date}`,
  });

  return <div className={`${styles.cell} ${isOver ? styles.cellOver : ''}`} ref={setNodeRef} />;
}

function TimelineBar({
  item,
  startIndex,
  onOpenItem,
}: {
  item: UnstuckItem;
  startIndex: number;
  onOpenItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  return (
    <button
      className={`${styles.bar} ${isDragging ? styles.barDragging : ''}`}
      onClick={() => onOpenItem(item.id)}
      ref={setNodeRef}
      style={
        {
          '--bar-start': `${startIndex + 1}`,
          '--bar-span': `${item.durationDays || 1}`,
          transform: CSS.Translate.toString(transform),
        } as CSSProperties
      }
      type="button"
      {...attributes}
      {...listeners}
    >
      {item.title}
    </button>
  );
}

export function TimelineView({
  horizon,
  items,
  onDurationChange,
  onMoveItem,
  onOpenItem,
}: TimelineViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dates = getTimelineDates(horizon);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const overId = event.over?.id ? String(event.over.id) : '';
    if (!overId.includes(':')) {
      return;
    }

    const [itemId, plannedStart] = overId.split(':');
    await onMoveItem(itemId, plannedStart);
  };

  return (
    <div className={styles.timeline}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Working timeline</h3>
          <p className={styles.copy}>
            Drag bars horizontally to reconstruct the planning assumptions. Use the small controls
            to stretch or shrink duration without leaving the board.
          </p>
        </div>
      </div>

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(event) => setActiveId(String(event.active.id))}
      >
        <div
          className={styles.grid}
          style={{ '--timeline-columns': String(dates.length) } as CSSProperties}
        >
          <div className={styles.labelHeader}>Plan</div>
          {dates.map((date) => (
            <div className={styles.dateHeader} key={date}>
              {date.slice(5)}
            </div>
          ))}

          {items.map((item) => {
            const startIndex = dates.indexOf(item.plannedStart || '');
            return (
              <div key={item.id} style={{ display: 'contents' }}>
                <div className={styles.rowLabel}>
                  <button className={styles.rowTitleButton} onClick={() => onOpenItem(item.id)} type="button">
                    {item.title}
                  </button>
                  <div className={styles.rowMeta}>{item.status}</div>
                  <div className={styles.rowControls}>
                    <button
                      className={styles.miniButton}
                      onClick={() => onDurationChange(item.id, Math.max(1, (item.durationDays || 1) - 1))}
                      type="button"
                    >
                      -
                    </button>
                    <button
                      className={styles.miniButton}
                      onClick={() => onDurationChange(item.id, (item.durationDays || 1) + 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
                {dates.map((date) => (
                  <DropCell date={date} itemId={item.id} key={`${item.id}-${date}`} />
                ))}
                {startIndex >= 0 ? <TimelineBar item={item} onOpenItem={onOpenItem} startIndex={startIndex} /> : null}
              </div>
            );
          })}

          {!items.length ? <div className={styles.empty}>No items inside the current filters.</div> : null}
        </div>
      </DndContext>
    </div>
  );
}
