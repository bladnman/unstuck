import type { HorizonValue, UnstuckItem } from '@/types/unstuck';

const horizonDays: Record<HorizonValue, number> = {
  today: 1,
  '3d': 3,
  week: 7,
  '2w': 14,
  '4w': 28,
  '8w': 56,
};

export function parseIsoDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addUtcDays(date: Date, days: number) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

export function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function getDateLabel(value?: string) {
  const date = parseIsoDate(value);
  if (!date) {
    return 'Unscheduled';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getLongDateLabel(value?: string) {
  const date = parseIsoDate(value);
  if (!date) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getHorizonDays(horizon: HorizonValue) {
  return horizonDays[horizon];
}

export function getTimelineDates(horizon: HorizonValue) {
  const dates: string[] = [];
  const totalDays = getHorizonDays(horizon);
  const today = parseIsoDate(getTodayIsoDate());

  if (!today) {
    return dates;
  }

  for (let offset = 0; offset < totalDays; offset += 1) {
    dates.push(formatIsoDate(addUtcDays(today, offset)));
  }

  return dates;
}

export function getDayRangeDates(horizon: HorizonValue) {
  const effectiveHorizon = horizon === 'today' || horizon === '3d' || horizon === 'week'
    ? horizon
    : 'week';

  return getTimelineDates(effectiveHorizon);
}

export function getItemFocusDate(item: UnstuckItem) {
  return item.plannedStart || item.dueDate || item.expiresOn || undefined;
}

export function parseClockTime(value?: string) {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatClockTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatHourLabel(totalMinutes: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(`2000-01-01T${formatClockTime(totalMinutes)}:00`));
}

export function formatDurationMinutes(value?: number) {
  const totalMinutes = Number(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return '';
  }

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function isItemInHorizon(item: UnstuckItem, horizon: HorizonValue) {
  if (horizon === '8w') {
    return true;
  }

  const focusDate = parseIsoDate(getItemFocusDate(item));
  if (!focusDate) {
    return horizon !== 'today';
  }

  const today = parseIsoDate(getTodayIsoDate());
  if (!today) {
    return true;
  }

  const diff = Math.floor((focusDate.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff < getHorizonDays(horizon);
}

export function getDurationDates(item: UnstuckItem) {
  if (!item.plannedStart || !item.durationDays) {
    return [];
  }

  const startDate = parseIsoDate(item.plannedStart);
  if (!startDate) {
    return [];
  }

  return Array.from({ length: item.durationDays }, (_, index) =>
    formatIsoDate(addUtcDays(startDate, index)),
  );
}
