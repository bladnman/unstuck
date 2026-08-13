export type ItemState = 'active' | 'simmering' | 'parked' | 'archived' | 'resolved';
export type DashboardView = 'table' | 'board' | 'day' | 'timeline';
export type HorizonValue = 'all' | 'today' | '3d' | 'week' | '2w' | '4w' | '8w';

export interface UnstuckItem {
  id: string;
  title: string;
  summary: string;
  state: ItemState;
  status: string;
  lastTouched: string;
  createdAt?: string;
  kind?: string;
  domains?: string[];
  tags?: string[];
  scope?: string;
  path?: string;
  dueDate?: string | null;
  plannedStart?: string | null;
  fixedStartTime?: string | null;
  durationMinutes?: number | null;
  durationDays?: number | null;
  scheduleMode?: string;
  planningMode?: string;
  planningNote?: string;
  expiresOn?: string | null;
  searchText?: string;
  rank?: number;
}

export interface DashboardFacets {
  stateCounts: Partial<Record<ItemState, number>>;
  domainCounts: Record<string, number>;
  kindCounts: Record<string, number>;
  scopeCounts?: Record<string, number>;
}

export interface RecentSession {
  id: string;
  path: string;
  summary: string;
  updatedAt: string;
  itemsTouchedCount: number;
  rawInputCount: number;
}

export interface RecentMemory {
  id: string;
  title: string;
  description: string;
  type: string;
  path: string;
  updatedAt: string;
}

export interface DashboardMeta {
  generatedAt: string;
  sessionCount: number;
  memoryCount: number;
  recentSessions: RecentSession[];
  recentMemory: RecentMemory[];
}

export interface DashboardResponse {
  schemaVersion: number;
  lastUpdated: string;
  home: string;
  items: UnstuckItem[];
  facets: DashboardFacets;
  dashboard: DashboardMeta;
}

export interface SessionBrowserEntry extends RecentSession {
  markdown?: string;
}

export interface SessionBrowserDetail extends RecentSession {
  markdown: string;
}

export interface MemoryBrowserEntry extends RecentMemory {
  markdown?: string;
}

export interface MemoryBrowserDetail extends RecentMemory {
  markdown: string;
}

export interface ItemContextFile {
  name: string;
  path: string;
  content: string;
}

export interface ItemDetail extends UnstuckItem {
  document: string;
  contextFiles: ItemContextFile[];
}

export interface AiProvider {
  id: string;
  label: string;
  command: string;
  cwd: string;
  available: boolean;
}

export interface AiTranscriptEntry {
  id: string;
  role: 'system' | 'user' | 'assistant';
  kind: 'message' | 'command' | 'error';
  label?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  command?: string;
  status?: string;
  exitCode?: number | null;
}

export interface AiSessionNotice {
  id: string;
  label: string;
  detail: string;
  count: number;
  latestAt: string;
  lastMessage: string;
}

export interface AiSession {
  id: string;
  providerId: string;
  providerLabel: string;
  startedAt: string;
  status: string;
  transcript: AiTranscriptEntry[];
  notices: AiSessionNotice[];
}

export interface DashboardFilters {
  search: string;
  states: ItemState[];
  view: DashboardView;
  horizon: HorizonValue;
}
