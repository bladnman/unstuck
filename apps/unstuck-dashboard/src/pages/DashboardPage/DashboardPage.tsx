import { DashboardHeader } from '@/pages/DashboardPage/features/DashboardHeader/DashboardHeader';
import { DashboardFilters } from '@/pages/DashboardPage/features/DashboardFilters/DashboardFilters';
import { ActivityStrip } from '@/pages/DashboardPage/features/ActivityStrip/ActivityStrip';
import { OverviewBrowser } from '@/pages/DashboardPage/features/OverviewBrowser/OverviewBrowser';
import { BoardView } from '@/pages/DashboardPage/features/views/BoardView/BoardView';
import { DayView } from '@/pages/DashboardPage/features/views/DayView/DayView';
import { TableView } from '@/pages/DashboardPage/features/views/TableView/TableView';
import { TimelineView } from '@/pages/DashboardPage/features/views/TimelineView/TimelineView';
import { ItemDetailPanel } from '@/pages/DashboardPage/features/ItemDetailPanel/ItemDetailPanel';
import { AiPanel } from '@/pages/DashboardPage/features/AiPanel/AiPanel';
import { useDashboardPage } from '@/pages/DashboardPage/hooks/useDashboardPage';

import styles from './DashboardPage.module.css';

export function DashboardPage() {
  const dashboardPage = useDashboardPage();
  const detailSurfaceItem = dashboardPage.itemDetail || (
    dashboardPage.selectedItem
      ? {
          ...dashboardPage.selectedItem,
          document: '',
          contextFiles: [],
        }
      : null
  );
  const isAiOpen = dashboardPage.panelMode === 'ai';
  const isDetailOverlayOpen = dashboardPage.panelMode === 'details' && Boolean(detailSurfaceItem);
  const isSessionBrowserOpen = dashboardPage.browserMode === 'sessions';
  const isMemoryBrowserOpen = dashboardPage.browserMode === 'memory';

  return (
    <div className={styles.page}>
      <div className={`${styles.layout} ${isAiOpen ? styles.layoutWithRail : styles.layoutFull}`}>
        <div className={styles.main}>
          <DashboardHeader
            dashboard={dashboardPage.dashboard}
            errorMessage={dashboardPage.errorMessage}
            onOpenAiPanel={() => dashboardPage.setPanelMode('ai')}
            onToggleOverview={() => dashboardPage.setOverviewExpanded(!dashboardPage.overviewExpanded)}
            overviewExpanded={dashboardPage.overviewExpanded}
          />
          <div className={`${styles.surface} ${styles.workspaceSurface}`}>
            <div className={styles.workspace}>
              <DashboardFilters
                filters={dashboardPage.filters}
                onCreateItem={dashboardPage.createItem}
                onSearchChange={dashboardPage.setSearch}
                onOpenSelectedItem={() => {
                  if (dashboardPage.selectedItem) {
                    dashboardPage.openItemDetail(dashboardPage.selectedItem.id);
                  }
                }}
                onQuickScheduleSelected={dashboardPage.quickScheduleSelected}
                onSetAllStates={dashboardPage.setAllStates}
                onToggleState={dashboardPage.toggleState}
                onViewChange={dashboardPage.setView}
                onHorizonChange={dashboardPage.setHorizon}
                selectedItem={dashboardPage.selectedItem}
              />
              {dashboardPage.filters.view === 'table' && (
                <TableView
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onOpenItem={dashboardPage.openItemDetail}
                  onToggleResolved={(item) =>
                    dashboardPage.updateItem(item.id, {
                      state: item.state === 'resolved' ? 'active' : 'resolved',
                    })
                  }
                />
              )}
              {dashboardPage.filters.view === 'board' && (
                <BoardView
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onOpenItem={dashboardPage.openItemDetail}
                  onReorderItems={dashboardPage.updateManyItems}
                />
              )}
              {dashboardPage.filters.view === 'day' && (
                <DayView
                  horizon={dashboardPage.filters.horizon}
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onOpenItem={dashboardPage.openItemDetail}
                  onScheduleItem={(itemId, patch) => dashboardPage.updateItem(itemId, patch)}
                />
              )}
              {dashboardPage.filters.view === 'timeline' && (
                <TimelineView
                  horizon={dashboardPage.filters.horizon}
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onMoveItem={(itemId, plannedStart) => dashboardPage.updateItem(itemId, { plannedStart })}
                  onDurationChange={(itemId, durationDays) =>
                    dashboardPage.updateItem(itemId, { durationDays })
                  }
                  onOpenItem={dashboardPage.openItemDetail}
                />
              )}
            </div>
          </div>
          {dashboardPage.overviewExpanded ? (
            <ActivityStrip
              dashboard={dashboardPage.dashboard}
              onFocusNowItems={dashboardPage.focusNowItems}
              onOpenItem={dashboardPage.openItemDetail}
              onOpenMemory={(memoryId) =>
                memoryId ? dashboardPage.openMemoryEntry(memoryId) : dashboardPage.openMemoryBrowser()
              }
              onOpenSessions={(sessionId) =>
                sessionId ? dashboardPage.openSessionEntry(sessionId) : dashboardPage.openSessionBrowser()
              }
            />
          ) : null}
        </div>

        {isAiOpen ? (
          <aside className={styles.rail}>
            <div className={styles.railHeader}>
              <div className={styles.railTitle}>AI panel</div>

              <button
                className={styles.railClose}
                onClick={() => dashboardPage.closeAiPanel()}
                type="button"
              >
                Close AI
              </button>
            </div>

            <div className={styles.railBody}>
              <AiPanel
                errorMessage={dashboardPage.aiErrorMessage}
                currentItem={dashboardPage.selectedItem}
                isStreaming={dashboardPage.isAiStreaming}
                providers={dashboardPage.providers}
                session={dashboardPage.aiSession}
                onSendMessage={dashboardPage.sendAiMessage}
                onStartSession={dashboardPage.startAiSession}
              />
            </div>
          </aside>
        ) : null}
      </div>

      {isDetailOverlayOpen ? (
        <div className={styles.detailOverlayBackdrop}>
          <div className={styles.detailOverlayShell}>
            <ItemDetailPanel
              item={detailSurfaceItem}
              isLoading={dashboardPage.isLoadingDetail}
              onClose={dashboardPage.closeItemDetail}
              onSaveDocument={dashboardPage.saveItemDocument}
              onSaveMetadata={dashboardPage.updateItem}
            />
          </div>
        </div>
      ) : null}

      {isSessionBrowserOpen ? (
        <OverviewBrowser
          detailMarkdown={dashboardPage.sessionDetail?.markdown || ''}
          detailTitle={dashboardPage.sessionDetail?.id || 'Session detail'}
          entries={dashboardPage.sessionEntries.map((entry) => ({
            id: entry.id,
            title: entry.id,
            description: entry.summary,
            meta: `${entry.updatedAt} · ${entry.itemsTouchedCount} items · ${entry.rawInputCount} raw inputs`,
          }))}
          errorMessage={dashboardPage.browserErrorMessage}
          isLoading={dashboardPage.browserLoading}
          onClose={dashboardPage.closeBrowser}
          onSelect={dashboardPage.openSessionEntry}
          selectedId={dashboardPage.sessionDetail?.id || null}
          title="Sessions"
        />
      ) : null}

      {isMemoryBrowserOpen ? (
        <OverviewBrowser
          detailMarkdown={dashboardPage.memoryDetail?.markdown || ''}
          detailTitle={dashboardPage.memoryDetail?.title || 'Memory detail'}
          entries={dashboardPage.memoryEntries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            description: entry.description || 'No description captured yet.',
            meta: `${entry.updatedAt} · ${entry.type || 'memory'}`,
          }))}
          errorMessage={dashboardPage.browserErrorMessage}
          isLoading={dashboardPage.browserLoading}
          onClose={dashboardPage.closeBrowser}
          onSelect={dashboardPage.openMemoryEntry}
          selectedId={dashboardPage.memoryDetail?.id || null}
          title="Memory"
        />
      ) : null}
    </div>
  );
}
