import type { DashboardFilters, ItemState, UnstuckItem } from '@/types/unstuck';
import { getItemFocusDate, isItemInHorizon, parseIsoDate } from '@/utils/dateUtils';

export const stateOrder: ItemState[] = ['active', 'simmering', 'parked', 'archived', 'resolved'];

export function sortItemsForInteraction(items: UnstuckItem[]) {
  return [...items].sort((left, right) => {
    const leftRank = typeof left.rank === 'number' ? left.rank : null;
    const rightRank = typeof right.rank === 'number' ? right.rank : null;

    if (leftRank !== null && rightRank !== null && leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if (leftRank !== null && rightRank === null) {
      return -1;
    }
    if (leftRank === null && rightRank !== null) {
      return 1;
    }

    const leftDate = getItemFocusDate(left);
    const rightDate = getItemFocusDate(right);
    if (leftDate && rightDate && leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }
    if (leftDate && !rightDate) {
      return -1;
    }
    if (!leftDate && rightDate) {
      return 1;
    }

    return left.title.localeCompare(right.title);
  });
}

export function getFilteredItems(items: UnstuckItem[], filters: DashboardFilters) {
  const searchTerm = filters.search.trim().toLowerCase();
  return sortItemsForInteraction(items).filter((item) => {
    if (!filters.states.includes(item.state)) {
      return false;
    }

    if (!isItemInHorizon(item, filters.horizon) && !(filters.view === 'day' && !getItemFocusDate(item))) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    const haystack = [
      item.title,
      item.summary,
      item.status,
      item.searchText,
      (item.tags || []).join(' '),
      (item.domains || []).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchTerm);
  });
}

export function groupItemsByState(items: UnstuckItem[]) {
  return stateOrder.reduce<Record<ItemState, UnstuckItem[]>>((groups, state) => {
    groups[state] = sortItemsForInteraction(items.filter((item) => item.state === state));
    return groups;
  }, {
    active: [],
    simmering: [],
    parked: [],
    archived: [],
    resolved: [],
  });
}

export function getDayBuckets(items: UnstuckItem[]) {
  const today = parseIsoDate(new Date().toISOString().slice(0, 10));
  const tomorrow = today ? new Date(today.getTime() + 86400000) : null;

  return {
    today: items.filter((item) => getItemFocusDate(item) === new Date().toISOString().slice(0, 10)),
    tomorrow: tomorrow
      ? items.filter((item) => getItemFocusDate(item) === tomorrow.toISOString().slice(0, 10))
      : [],
    soon: items.filter((item) => {
      const focusDate = parseIsoDate(getItemFocusDate(item));
      if (!focusDate || !today) {
        return false;
      }

      const diff = Math.floor((focusDate.getTime() - today.getTime()) / 86400000);
      return diff > 1 && diff < 7;
    }),
    unscheduled: items.filter((item) => !getItemFocusDate(item)),
  };
}

export function buildColumnRanks(items: UnstuckItem[], state: ItemState) {
  return sortItemsForInteraction(items.filter((item) => item.state === state)).map((item, index) => ({
    id: item.id,
    patch: {
      state,
      rank: (index + 1) * 100,
    },
  }));
}
