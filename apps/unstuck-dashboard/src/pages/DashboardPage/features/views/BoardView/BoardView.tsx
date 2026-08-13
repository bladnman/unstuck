import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { ItemState, UnstuckItem } from '@/types/unstuck';
import { buildColumnRanks, groupItemsByState, stateOrder } from '@/utils/dashboardFilters';

import styles from './BoardView.module.css';

interface BoardViewProps {
  items: UnstuckItem[];
  selectedItemId: string | null;
  onOpenItem: (itemId: string) => void;
  onReorderItems: (updates: Array<{ id: string; patch: Partial<UnstuckItem> }>) => Promise<void>;
}

function Column({
  children,
  collapsed,
  compactCards,
  items,
  onToggleCollapsed,
  state,
}: {
  children: ReactNode;
  collapsed: boolean;
  compactCards: boolean;
  items: UnstuckItem[];
  onToggleCollapsed: () => void;
  state: ItemState;
}) {
  const { setNodeRef } = useDroppable({
    id: `column:${state}`,
  });

  return (
    <div className={`${styles.column} ${collapsed ? styles.columnCollapsed : ''}`} ref={setNodeRef}>
      <div className={styles.columnHeader}>
        <div>
          <span>{state}</span>
          <div className={styles.columnHint}>
            {collapsed ? 'Collapsed, but still a drop target' : 'Top to bottom is current order'}
          </div>
        </div>
        <div className={styles.columnActions}>
          <span className={styles.count}>{items.length}</span>
          <button className={styles.columnToggle} onClick={onToggleCollapsed} type="button">
            {collapsed ? 'Open' : 'Hide'}
          </button>
        </div>
      </div>
      {!collapsed ? (
        <div className={`${styles.cardList} ${compactCards ? styles.cardListCompact : ''}`}>{children}</div>
      ) : (
        <div className={styles.collapsedDropHint}>Drop items here</div>
      )}
    </div>
  );
}

function SortableCard({
  compactCards,
  index,
  item,
  isSelected,
  onOpenItem,
}: {
  compactCards: boolean;
  index: number;
  item: UnstuckItem;
  isSelected: boolean;
  onOpenItem: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      className={`${styles.card} ${compactCards ? styles.cardCompact : ''} ${isSelected ? styles.cardSelected : ''} ${
        isDragging ? styles.cardDragging : ''
      }`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button className={styles.cardOpenButton} onClick={() => onOpenItem(item.id)} type="button">
        <div className={styles.cardTopline}>
          <span className={styles.cardRank}>#{index + 1}</span>
          <h3 className={styles.cardTitle}>{item.title}</h3>
        </div>
        {!compactCards ? <p className={styles.cardSummary}>{item.summary}</p> : null}
        <div className={`${styles.cardMeta} ${compactCards ? styles.cardMetaCompact : ''}`}>
          <span>{item.status}</span>
          {!compactCards ? <span>{item.lastTouched}</span> : null}
        </div>
      </button>
      <button
        className={styles.dragHandle}
        type="button"
        aria-label={`Reorder ${item.title}`}
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
    </div>
  );
}

export function BoardView({
  items,
  onOpenItem,
  onReorderItems,
  selectedItemId,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compactCards, setCompactCards] = useState(true);
  const [collapsedStates, setCollapsedStates] = useState<ItemState[]>(['archived', 'resolved']);
  const groupedItems = groupItemsByState(items);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeItem = items.find((item) => item.id === active.id);
    if (!activeItem) {
      return;
    }

    const targetColumn = String(over.id).startsWith('column:')
      ? String(over.id).replace('column:', '')
      : items.find((item) => item.id === over.id)?.state;

    if (!targetColumn) {
      return;
    }

    const nextGroups = groupItemsByState(items);
    nextGroups[activeItem.state] = nextGroups[activeItem.state].filter((item) => item.id !== activeItem.id);

    const targetItems = nextGroups[targetColumn as ItemState];
    const overIndex = targetItems.findIndex((item) => item.id === over.id);

    if (overIndex >= 0) {
      targetItems.splice(overIndex, 0, { ...activeItem, state: targetColumn as ItemState });
    } else {
      targetItems.push({ ...activeItem, state: targetColumn as ItemState });
    }

    const updates = activeItem.state === targetColumn
      ? buildColumnRanks(nextGroups[targetColumn as ItemState], targetColumn as ItemState)
      : [
          ...buildColumnRanks(nextGroups[activeItem.state], activeItem.state),
          ...buildColumnRanks(nextGroups[targetColumn as ItemState], targetColumn as ItemState),
        ];

    await onReorderItems(updates);
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      sensors={sensors}
    >
      <div className={styles.boardShell}>
        <div className={styles.boardToolbar}>
          <div className={styles.boardCopy}>
            <h3 className={styles.boardTitle}>Board view</h3>
            <p className={styles.boardDescription}>
              This board now defaults to a true Kanban posture: you can keep unscheduled ideas
              visible, collapse colder states, and open items without fighting drag mode.
            </p>
          </div>
          <button
            className={styles.compactToggle}
            onClick={() => setCompactCards((value) => !value)}
            type="button"
          >
            {compactCards ? 'Show details' : 'Titles only'}
          </button>
        </div>
        <div className={styles.board}>
          {stateOrder.map((state) => {
            const collapsed = collapsedStates.includes(state);
            return (
              <Column
                collapsed={collapsed}
                compactCards={compactCards}
                items={groupedItems[state]}
                key={state}
                onToggleCollapsed={() =>
                  setCollapsedStates((current) =>
                    current.includes(state)
                      ? current.filter((entry) => entry !== state)
                      : [...current, state],
                  )
                }
                state={state}
              >
                <SortableContext
                  items={groupedItems[state].map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {groupedItems[state].length ? (
                    groupedItems[state].map((item, index) => (
                      <SortableCard
                        compactCards={compactCards}
                        index={index}
                        isSelected={selectedItemId === item.id || activeId === item.id}
                        item={item}
                        key={item.id}
                        onOpenItem={onOpenItem}
                      />
                    ))
                  ) : (
                    <div className={styles.empty}>No items here yet.</div>
                  )}
                </SortableContext>
              </Column>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
