import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import { DndContext, DragEndEvent, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import type { HorizonValue, UnstuckItem } from '@/types/unstuck';
import {
  formatClockTime,
  formatDurationMinutes,
  formatHourLabel,
  getDayRangeDates,
  getLongDateLabel,
  parseClockTime,
} from '@/utils/dateUtils';

import styles from './DayView.module.css';

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 24;
const START_MINUTES = 6 * 60;
const END_MINUTES = 22 * 60;
const TOTAL_SLOTS = (END_MINUTES - START_MINUTES) / SLOT_MINUTES;

interface DayViewProps {
  horizon: HorizonValue;
  items: UnstuckItem[];
  selectedItemId: string | null;
  onOpenItem: (itemId: string) => void;
  onScheduleItem: (itemId: string, patch: Partial<UnstuckItem>) => Promise<void>;
}

function buildSlotTimes() {
  return Array.from({ length: TOTAL_SLOTS + 1 }, (_, index) => START_MINUTES + index * SLOT_MINUTES);
}

function DaySlot({ date, time }: { date: string; time: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot|${date}|${time}`,
  });

  return <div className={`${styles.slot} ${isOver ? styles.slotOver : ''}`} ref={setNodeRef} />;
}

function ScheduledCard({
  isSelected,
  item,
  onOpenItem,
}: {
  isSelected: boolean;
  item: UnstuckItem;
  onOpenItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  const startMinutes = parseClockTime(item.fixedStartTime) ?? START_MINUTES;
  const durationMinutes = item.durationMinutes || 60;
  const offsetMinutes = Math.max(0, startMinutes - START_MINUTES);
  const top = (offsetMinutes / SLOT_MINUTES) * SLOT_HEIGHT;
  const height = Math.max(SLOT_HEIGHT, (durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT);

  return (
    <button
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${
        isSelected ? styles.cardSelected : ''
      }`}
      onClick={() => onOpenItem(item.id)}
      ref={setNodeRef}
      style={
        {
          top: `${top}px`,
          height: `${height}px`,
          transform: CSS.Translate.toString(transform),
        } as CSSProperties
      }
      type="button"
      {...attributes}
      {...listeners}
    >
      <span className={styles.cardTitle}>{item.title}</span>
      <span className={styles.cardMeta}>
        {item.fixedStartTime || 'Unscheduled'} · {formatDurationMinutes(item.durationMinutes || 60)}
      </span>
    </button>
  );
}

function UnscheduledCard({
  item,
  isSelected,
  onOpenItem,
}: {
  item: UnstuckItem;
  isSelected: boolean;
  onOpenItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  return (
    <button
      className={`${styles.unscheduledCard} ${isDragging ? styles.cardDragging : ''} ${
        isSelected ? styles.cardSelected : ''
      }`}
      onClick={() => onOpenItem(item.id)}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      type="button"
      {...attributes}
      {...listeners}
    >
      <span className={styles.cardTitle}>{item.title}</span>
      <span className={styles.cardMeta}>
        {item.fixedStartTime ? item.fixedStartTime : 'Drag into the grid'} ·{' '}
        {formatDurationMinutes(item.durationMinutes || 60)}
      </span>
    </button>
  );
}

export function DayView({
  horizon,
  items,
  onOpenItem,
  onScheduleItem,
  selectedItemId,
}: DayViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleDates = useMemo(() => getDayRangeDates(horizon), [horizon]);
  const slotTimes = useMemo(() => buildSlotTimes(), []);

  const scheduledItems = items.filter(
    (item) => item.plannedStart && item.fixedStartTime && visibleDates.includes(item.plannedStart),
  );
  const unscheduledItems = items.filter(
    (item) => !item.plannedStart || !item.fixedStartTime || !visibleDates.includes(item.plannedStart),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const overId = event.over?.id ? String(event.over.id) : '';
    if (!overId.startsWith('slot|')) {
      return;
    }

    const [, plannedStart, fixedStartTime] = overId.split('|');
    const activeItem = items.find((item) => item.id === event.active.id);
    if (!activeItem) {
      return;
    }

    await onScheduleItem(activeItem.id, {
      plannedStart,
      fixedStartTime,
      durationMinutes: activeItem.durationMinutes || 60,
    });
  };

  return (
    <section className={styles.view}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Day scheduler</h3>
          <p className={styles.copy}>
            This view is now an actual hourly planner. Drag cards into a time slot to set the day
            and start hour. Use the filter above to switch between today, three days, and week.
          </p>
        </div>
      </header>

      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      >
        <section className={styles.unscheduledStrip}>
          <div className={styles.unscheduledHeader}>
            <span className={styles.unscheduledTitle}>Needs a slot</span>
            <span className={styles.unscheduledCount}>{unscheduledItems.length}</span>
          </div>
          <div className={styles.unscheduledList}>
            {unscheduledItems.length ? (
              unscheduledItems.map((item) => (
                <UnscheduledCard
                  isSelected={selectedItemId === item.id || activeId === item.id}
                  item={item}
                  key={item.id}
                  onOpenItem={onOpenItem}
                />
              ))
            ) : (
              <div className={styles.emptyState}>Everything visible already has a time slot.</div>
            )}
          </div>
        </section>

        <div className={styles.scheduler}>
          <div className={styles.timeRail}>
            <div className={styles.railSpacer} />
            {slotTimes.slice(0, -1).map((minutes) => (
              <div className={styles.timeLabel} key={minutes}>
                {minutes % 60 === 0 ? formatHourLabel(minutes) : ''}
              </div>
            ))}
          </div>

          <div className={styles.days}>
            {visibleDates.map((date) => {
              const itemsForDay = scheduledItems
                .filter((item) => item.plannedStart === date)
                .sort((left, right) => (parseClockTime(left.fixedStartTime) || 0) - (parseClockTime(right.fixedStartTime) || 0));

              return (
                <section className={styles.dayColumn} key={date}>
                  <header className={styles.dayHeader}>
                    <span className={styles.dayTitle}>{getLongDateLabel(date)}</span>
                    <span className={styles.dayCount}>{itemsForDay.length} blocks</span>
                  </header>
                  <div className={styles.dayCanvas}>
                    {slotTimes.slice(0, -1).map((minutes) => (
                      <DaySlot date={date} key={`${date}-${minutes}`} time={formatClockTime(minutes)} />
                    ))}
                    {itemsForDay.map((item) => (
                      <ScheduledCard
                        isSelected={selectedItemId === item.id || activeId === item.id}
                        item={item}
                        key={item.id}
                        onOpenItem={onOpenItem}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </DndContext>
    </section>
  );
}
