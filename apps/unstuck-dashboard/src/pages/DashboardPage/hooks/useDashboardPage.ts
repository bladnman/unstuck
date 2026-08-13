import { useEffect, useRef, useState } from 'react';

import type {
  AiProvider,
  AiSession,
  DashboardFilters,
  DashboardResponse,
  DashboardView,
  HorizonValue,
  ItemDetail,
  ItemState,
  MemoryBrowserDetail,
  MemoryBrowserEntry,
  SessionBrowserDetail,
  SessionBrowserEntry,
  UnstuckItem,
} from '@/types/unstuck';
import { addUtcDays, formatIsoDate, getTodayIsoDate } from '@/utils/dateUtils';
import { getFilteredItems, stateOrder } from '@/utils/dashboardFilters';

const defaultFilters: DashboardFilters = {
  search: '',
  states: [...stateOrder],
  view: 'board',
  horizon: 'all',
};

async function getJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed for ${url}`);
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Request failed for ${url}`);
  }

  return response.json() as Promise<T>;
}

function patchLocalItem(items: UnstuckItem[], itemId: string, patch: Partial<UnstuckItem>) {
  return items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
}

function coerceHorizonForView(view: DashboardView, horizon: HorizonValue) {
  if (view === 'day') {
    return horizon === 'today' || horizon === '3d' || horizon === 'week' ? horizon : 'week';
  }

  if (view === 'timeline') {
    return horizon === 'week' || horizon === '2w' || horizon === '4w' || horizon === '8w'
      ? horizon
      : '2w';
  }

  return horizon;
}

function relativeDate(offsetDays: number) {
  const today = new Date(`${getTodayIsoDate()}T00:00:00Z`);
  return formatIsoDate(addUtcDays(today, offsetDays));
}

export function useDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [panelMode, setPanelMode] = useState<'details' | 'ai' | 'none'>('none');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [aiSession, setAiSession] = useState<AiSession | null>(null);
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [browserMode, setBrowserMode] = useState<'sessions' | 'memory' | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [browserErrorMessage, setBrowserErrorMessage] = useState('');
  const [sessionEntries, setSessionEntries] = useState<SessionBrowserEntry[]>([]);
  const [sessionDetail, setSessionDetail] = useState<SessionBrowserDetail | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<MemoryBrowserEntry[]>([]);
  const [memoryDetail, setMemoryDetail] = useState<MemoryBrowserDetail | null>(null);
  const detailRequestId = useRef(0);

  const refreshDashboard = async () => {
    try {
      setErrorMessage('');
      const payload = await getJson<DashboardResponse>('/api/dashboard');
      setDashboard(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const loadItemDetail = async (itemId: string) => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setIsLoadingDetail(true);
    setItemDetail((current) => (current?.id === itemId ? current : null));
    try {
      const detail = await getJson<ItemDetail>(`/api/items/${itemId}`);
      if (detailRequestId.current !== requestId) {
        return;
      }
      setItemDetail(detail);
    } catch (error) {
      if (detailRequestId.current !== requestId) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : 'Unable to load item details');
    } finally {
      if (detailRequestId.current === requestId) {
        setIsLoadingDetail(false);
      }
    }
  };

  const openItemDetail = (itemId: string) => {
    setSelectedItemId(itemId);
    setPanelMode('details');
  };

  const closeItemDetail = () => {
    detailRequestId.current += 1;
    setSelectedItemId(null);
    setItemDetail(null);
    setIsLoadingDetail(false);
    setPanelMode('none');
  };

  const closeAiPanel = () => {
    setPanelMode('none');
  };

  const updateItem = async (itemId: string, patch: Partial<UnstuckItem>) => {
    if (dashboard) {
      setDashboard({
        ...dashboard,
        items: patchLocalItem(dashboard.items, itemId, patch),
      });
    }

    const updated = await sendJson<UnstuckItem>(`/api/items/${itemId}`, 'PATCH', patch);

    setDashboard((current) =>
      current
        ? {
            ...current,
            items: patchLocalItem(current.items, itemId, updated),
          }
        : current,
    );

    if (selectedItemId === itemId) {
      loadItemDetail(itemId);
    }
  };

  const updateManyItems = async (updates: Array<{ id: string; patch: Partial<UnstuckItem> }>) => {
    for (const update of updates) {
      await updateItem(update.id, update.patch);
    }
  };

  const saveItemDocument = async (itemId: string, document: string) => {
    const detail = await sendJson<ItemDetail>(`/api/items/${itemId}/document`, 'PUT', {
      document,
    });
    setItemDetail(detail);
    refreshDashboard();
  };

  const createItem = async (title: string, summary: string) => {
    const created = await sendJson<UnstuckItem>('/api/items', 'POST', {
      title,
      summary,
      planningMode: 'unscheduled',
    });
    await refreshDashboard();
    openItemDetail(created.id);
  };

  const startAiSession = async (providerId: string) => {
    try {
      setAiErrorMessage('');
      const session = await sendJson<AiSession>('/api/ai/sessions', 'POST', {
        providerId,
      });
      setAiSession(session);
      setPanelMode('ai');
      return session.id;
    } catch (error) {
      setAiErrorMessage(error instanceof Error ? error.message : 'Unable to start AI session');
      throw error;
    }
  };

  const sendAiMessage = async (message: string, contextItems: string[], providerId?: string) => {
    try {
      setAiErrorMessage('');
      let session = aiSession;
      if (!session && providerId) {
        const createdSession = await sendJson<AiSession>('/api/ai/sessions', 'POST', {
          providerId,
        });
        setAiSession(createdSession);
        session = createdSession;
      }

      if (!session) {
        return;
      }

      setIsAiStreaming(true);
      const nextSession = await sendJson<AiSession>(`/api/ai/sessions/${session.id}/messages`, 'POST', {
        message,
        contextItems,
      });
      setAiSession(nextSession);
    } catch (error) {
      setIsAiStreaming(false);
      setAiErrorMessage(error instanceof Error ? error.message : 'Unable to send AI message');
      throw error;
    }
  };

  const openSessionBrowser = async () => {
    try {
      setBrowserMode('sessions');
      setBrowserLoading(true);
      setBrowserErrorMessage('');
      const entries = await getJson<SessionBrowserEntry[]>('/api/sessions');
      setSessionEntries(entries);
      if (entries.length) {
        setSessionDetail(await getJson<SessionBrowserDetail>(`/api/sessions/${entries[0].id}`));
      } else {
        setSessionDetail(null);
      }
    } catch (error) {
      setBrowserErrorMessage(error instanceof Error ? error.message : 'Unable to load sessions');
    } finally {
      setBrowserLoading(false);
    }
  };

  const openSessionEntry = async (sessionId: string) => {
    try {
      setBrowserMode('sessions');
      setBrowserLoading(true);
      setBrowserErrorMessage('');
      if (!sessionEntries.length) {
        setSessionEntries(await getJson<SessionBrowserEntry[]>('/api/sessions'));
      }
      setSessionDetail(await getJson<SessionBrowserDetail>(`/api/sessions/${sessionId}`));
    } catch (error) {
      setBrowserErrorMessage(error instanceof Error ? error.message : 'Unable to load session');
    } finally {
      setBrowserLoading(false);
    }
  };

  const openMemoryBrowser = async () => {
    try {
      setBrowserMode('memory');
      setBrowserLoading(true);
      setBrowserErrorMessage('');
      const entries = await getJson<MemoryBrowserEntry[]>('/api/memory');
      setMemoryEntries(entries);
      if (entries.length) {
        setMemoryDetail(await getJson<MemoryBrowserDetail>(`/api/memory/${entries[0].id}`));
      } else {
        setMemoryDetail(null);
      }
    } catch (error) {
      setBrowserErrorMessage(error instanceof Error ? error.message : 'Unable to load memory');
    } finally {
      setBrowserLoading(false);
    }
  };

  const openMemoryEntry = async (memoryId: string) => {
    try {
      setBrowserMode('memory');
      setBrowserLoading(true);
      setBrowserErrorMessage('');
      if (!memoryEntries.length) {
        setMemoryEntries(await getJson<MemoryBrowserEntry[]>('/api/memory'));
      }
      setMemoryDetail(await getJson<MemoryBrowserDetail>(`/api/memory/${memoryId}`));
    } catch (error) {
      setBrowserErrorMessage(error instanceof Error ? error.message : 'Unable to load memory file');
    } finally {
      setBrowserLoading(false);
    }
  };

  const closeBrowser = () => {
    setBrowserMode(null);
    setBrowserErrorMessage('');
  };

  const quickScheduleItem = async (itemId: string, preset: 'today' | 'tomorrow' | 'next-week' | 'unscheduled') => {
    if (preset === 'unscheduled') {
      await updateItem(itemId, {
        plannedStart: null,
        fixedStartTime: null,
        planningMode: 'unscheduled',
      });
      return;
    }

    const offset = preset === 'today' ? 0 : preset === 'tomorrow' ? 1 : 7;
    await updateItem(itemId, {
      plannedStart: relativeDate(offset),
      planningMode: 'optimistic',
    });
  };

  useEffect(() => {
    refreshDashboard();
    getJson<AiProvider[]>('/api/ai/providers')
      .then(setProviders)
      .catch(() => {
        setProviders([]);
      });
  }, []);

  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onmessage = () => {
      refreshDashboard();
    };

    return () => {
      events.close();
    };
  }, []);

  useEffect(() => {
    if (!selectedItemId) {
      detailRequestId.current += 1;
      setItemDetail(null);
      setIsLoadingDetail(false);
      return;
    }

    loadItemDetail(selectedItemId);
  }, [selectedItemId]);

  useEffect(() => {
    if (!aiSession) {
      return;
    }

    const stream = new EventSource(`/api/ai/sessions/${aiSession.id}/stream`);
    stream.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { snapshot: AiSession; type: string };
      setAiSession(payload.snapshot);
      setIsAiStreaming(payload.snapshot.status === 'streaming');
    };

    return () => {
      stream.close();
    };
  }, [aiSession?.id]);

  const visibleItems = dashboard ? getFilteredItems(dashboard.items, filters) : [];
  const selectedItem = dashboard?.items.find((item) => item.id === selectedItemId) || null;

  return {
    dashboard,
    filters,
    setSearch(search: string) {
      setFilters((current) => ({ ...current, search }));
    },
    setView(view: DashboardView) {
      setFilters((current) => ({
        ...current,
        view,
        horizon: coerceHorizonForView(view, current.horizon),
      }));
    },
    setHorizon(horizon: HorizonValue) {
      setFilters((current) => ({ ...current, horizon }));
    },
    toggleState(state: ItemState) {
      setFilters((current) => {
        const stateSet = new Set(current.states);
        if (stateSet.has(state)) {
          stateSet.delete(state);
        } else {
          stateSet.add(state);
        }

        const nextStates = stateOrder.filter((entry) => stateSet.has(entry));
        return {
          ...current,
          states: nextStates.length ? nextStates : [state],
        };
      });
    },
    setAllStates() {
      setFilters((current) => ({ ...current, states: [...stateOrder] }));
    },
    focusNowItems() {
      setFilters((current) => ({
        ...current,
        view: 'board',
        horizon: 'all',
        states: ['active', 'simmering'],
      }));
      setOverviewExpanded(false);
    },
    overviewExpanded,
    setOverviewExpanded,
    browserMode,
    browserLoading,
    browserErrorMessage,
    sessionEntries,
    sessionDetail,
    memoryEntries,
    memoryDetail,
    openSessionBrowser,
    openSessionEntry,
    openMemoryBrowser,
    openMemoryEntry,
    closeBrowser,
    visibleItems,
    selectedItem,
    selectedItemId,
    openItemDetail,
    closeItemDetail,
    closeAiPanel,
    quickScheduleSelected(preset: 'today' | 'tomorrow' | 'next-week' | 'unscheduled') {
      if (!selectedItemId) {
        return Promise.resolve();
      }

      return quickScheduleItem(selectedItemId, preset);
    },
    quickScheduleItem,
    itemDetail,
    isLoading,
    isLoadingDetail,
    errorMessage,
    panelMode,
    setPanelMode,
    updateItem,
    updateManyItems,
    saveItemDocument,
    createItem,
    providers,
    aiSession,
    isAiStreaming,
    aiErrorMessage,
    startAiSession,
    sendAiMessage,
    refreshDashboard,
  };
}
