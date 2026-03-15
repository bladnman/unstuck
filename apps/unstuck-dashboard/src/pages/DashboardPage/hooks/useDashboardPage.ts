import { useEffect, useState } from 'react';

import type {
  AiProvider,
  AiSession,
  DashboardFilters,
  DashboardResponse,
  DashboardView,
  HorizonValue,
  ItemDetail,
  ItemState,
  UnstuckItem,
} from '@/types/unstuck';
import { getFilteredItems, stateOrder } from '@/utils/dashboardFilters';

const defaultFilters: DashboardFilters = {
  search: '',
  states: [...stateOrder],
  view: 'board',
  horizon: '2w',
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

export function useDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [panelMode, setPanelMode] = useState<'details' | 'ai'>('details');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [aiSession, setAiSession] = useState<AiSession | null>(null);
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState('');

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
    setIsLoadingDetail(true);
    try {
      const detail = await getJson<ItemDetail>(`/api/items/${itemId}`);
      setItemDetail(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load item details');
    } finally {
      setIsLoadingDetail(false);
    }
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
    });
    await refreshDashboard();
    setSelectedItemId(created.id);
    setPanelMode('details');
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
      setItemDetail(null);
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
      setFilters({ ...filters, search });
    },
    setView(view: DashboardView) {
      const nextHorizon = view === 'day'
        ? (filters.horizon === 'today' || filters.horizon === '3d' || filters.horizon === 'week'
          ? filters.horizon
          : 'week')
        : filters.horizon;

      setFilters({ ...filters, view, horizon: nextHorizon });
    },
    setHorizon(horizon: HorizonValue) {
      setFilters({ ...filters, horizon });
    },
    toggleState(state: ItemState) {
      const stateSet = new Set(filters.states);
      if (stateSet.has(state)) {
        stateSet.delete(state);
      } else {
        stateSet.add(state);
      }

      const nextStates = stateOrder.filter((entry) => stateSet.has(entry));
      setFilters({
        ...filters,
        states: nextStates.length ? nextStates : [state],
      });
    },
    setAllStates() {
      setFilters({ ...filters, states: [...stateOrder] });
    },
    visibleItems,
    selectedItem,
    selectedItemId,
    setSelectedItemId,
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
