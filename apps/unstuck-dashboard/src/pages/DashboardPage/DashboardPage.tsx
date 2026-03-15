import { DashboardHeader } from '@/pages/DashboardPage/features/DashboardHeader/DashboardHeader';
import { DashboardFilters } from '@/pages/DashboardPage/features/DashboardFilters/DashboardFilters';
import { ActivityStrip } from '@/pages/DashboardPage/features/ActivityStrip/ActivityStrip';
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

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <DashboardHeader
            dashboard={dashboardPage.dashboard}
            errorMessage={dashboardPage.errorMessage}
            onOpenAiPanel={() => dashboardPage.setPanelMode('ai')}
          />
          <ActivityStrip dashboard={dashboardPage.dashboard} />
          <div className={`${styles.surface} ${styles.workspaceSurface}`}>
            <div className={styles.workspace}>
              <DashboardFilters
                filters={dashboardPage.filters}
                onCreateItem={dashboardPage.createItem}
                onSearchChange={dashboardPage.setSearch}
                onSetAllStates={dashboardPage.setAllStates}
                onToggleState={dashboardPage.toggleState}
                onViewChange={dashboardPage.setView}
                onHorizonChange={dashboardPage.setHorizon}
              />
              {dashboardPage.filters.view === 'table' && (
                <TableView
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onOpenItem={(itemId) => {
                    dashboardPage.setSelectedItemId(itemId);
                    dashboardPage.setPanelMode('details');
                  }}
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
                  onOpenItem={(itemId) => {
                    dashboardPage.setSelectedItemId(itemId);
                    dashboardPage.setPanelMode('details');
                  }}
                  onReorderItems={dashboardPage.updateManyItems}
                />
              )}
              {dashboardPage.filters.view === 'day' && (
                <DayView
                  horizon={dashboardPage.filters.horizon}
                  items={dashboardPage.visibleItems}
                  selectedItemId={dashboardPage.selectedItemId}
                  onOpenItem={(itemId) => {
                    dashboardPage.setSelectedItemId(itemId);
                    dashboardPage.setPanelMode('details');
                  }}
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
                  onOpenItem={(itemId) => {
                    dashboardPage.setSelectedItemId(itemId);
                    dashboardPage.setPanelMode('details');
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.rail}>
          <div className={styles.railTabs}>
            <button
              className={`${styles.railTab} ${
                dashboardPage.panelMode === 'details' ? styles.railTabActive : ''
              }`}
              onClick={() => dashboardPage.setPanelMode('details')}
              type="button"
            >
              Item detail
            </button>
            <button
              className={`${styles.railTab} ${
                dashboardPage.panelMode === 'ai' ? styles.railTabActive : ''
              }`}
              onClick={() => dashboardPage.setPanelMode('ai')}
              type="button"
            >
              AI panel
            </button>
          </div>

          {dashboardPage.panelMode === 'details' ? (
            <ItemDetailPanel
              item={dashboardPage.itemDetail}
              isLoading={dashboardPage.isLoadingDetail}
              onSaveDocument={dashboardPage.saveItemDocument}
              onSaveMetadata={dashboardPage.updateItem}
            />
          ) : (
            <AiPanel
              errorMessage={dashboardPage.aiErrorMessage}
              currentItem={dashboardPage.selectedItem}
              isStreaming={dashboardPage.isAiStreaming}
              providers={dashboardPage.providers}
              session={dashboardPage.aiSession}
              onSendMessage={dashboardPage.sendAiMessage}
              onStartSession={dashboardPage.startAiSession}
            />
          )}

          {!dashboardPage.itemDetail && dashboardPage.panelMode === 'details' ? (
            <div className={`${styles.surface} ${styles.emptyRail}`}>
              Pick an item from any view to inspect its markdown, notes, and planning fields.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
