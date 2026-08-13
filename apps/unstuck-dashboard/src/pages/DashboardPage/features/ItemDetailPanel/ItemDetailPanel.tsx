import { useEffect, useRef, useState } from 'react';

import { Editor as ToastEditor } from '@toast-ui/react-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ItemContextFile, ItemDetail, ItemState } from '@/types/unstuck';
import { addUtcDays, formatIsoDate, getTodayIsoDate } from '@/utils/dateUtils';

import styles from './ItemDetailPanel.module.css';

interface ItemDetailPanelProps {
  item: ItemDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onSaveMetadata: (itemId: string, patch: Partial<ItemDetail>) => Promise<void>;
  onSaveDocument: (itemId: string, document: string) => Promise<void>;
}

type ActiveFileId = 'document' | string;

interface DetailFileEntry {
  id: ActiveFileId;
  name: string;
  content: string;
  kind: 'document' | 'context';
}

function buildTomorrowDate() {
  return formatIsoDate(addUtcDays(new Date(`${getTodayIsoDate()}T00:00:00Z`), 1));
}

function buildNextWeekDate() {
  return formatIsoDate(addUtcDays(new Date(`${getTodayIsoDate()}T00:00:00Z`), 7));
}

function contextFileToEntry(contextFile: ItemContextFile): DetailFileEntry {
  return {
    id: contextFile.path,
    name: contextFile.name,
    content: contextFile.content,
    kind: 'context',
  };
}

export function ItemDetailPanel({
  isLoading,
  item,
  onClose,
  onSaveDocument,
  onSaveMetadata,
}: ItemDetailPanelProps) {
  const editorRef = useRef<ToastEditor>(null);
  const [formState, setFormState] = useState<Partial<ItemDetail>>({});
  const [documentDraft, setDocumentDraft] = useState('');
  const [activeFileId, setActiveFileId] = useState<ActiveFileId>('document');
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isShellOnly = isLoading && (!item?.document && !(item?.contextFiles.length));

  useEffect(() => {
    if (!item) {
      setFormState({});
      setDocumentDraft('');
      setActiveFileId('document');
      setMetadataOpen(false);
      return;
    }

    setFormState({
      title: item.title,
      summary: item.summary,
      state: item.state,
      status: item.status,
      plannedStart: item.plannedStart,
      fixedStartTime: item.fixedStartTime,
      durationMinutes: item.durationMinutes,
      durationDays: item.durationDays,
      dueDate: item.dueDate,
      scheduleMode: item.scheduleMode,
      planningMode: item.planningMode,
      rank: item.rank,
    });
    setDocumentDraft(item.document || '');
    setActiveFileId('document');
    setMetadataOpen(false);
  }, [item?.id, item?.document]);

  useEffect(() => {
    if (activeFileId !== 'document') {
      return;
    }

    const instance = editorRef.current?.getInstance();
    if (!instance) {
      return;
    }

    if (instance.getMarkdown() !== documentDraft) {
      instance.setMarkdown(documentDraft || '', false);
    }
  }, [activeFileId, documentDraft, item?.id]);

  if (!item && isLoading) {
    return <div className={styles.loading}>Loading item detail…</div>;
  }

  if (!item) {
    return null;
  }

  const documentEntry: DetailFileEntry = {
    id: 'document',
    name: 'ITEM.md',
    content: documentDraft,
    kind: 'document',
  };
  const fileEntries = [documentEntry, ...item.contextFiles.map(contextFileToEntry)];
  const activeFile = fileEntries.find((entry) => entry.id === activeFileId) || documentEntry;
  const isDocumentSelected = activeFile.id === 'document';

  const handleEditorChange = () => {
    const instance = editorRef.current?.getInstance();
    if (!instance) {
      return;
    }

    setDocumentDraft(instance.getMarkdown());
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveMetadata(item.id, formState);

      if (isDocumentSelected) {
        const markdown = editorRef.current?.getInstance().getMarkdown() ?? documentDraft;
        setDocumentDraft(markdown);
        await onSaveDocument(item.id, markdown);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.workspace}>
        <aside className={styles.inventory}>
          <div className={styles.inventoryHeader}>
            <h2 className={styles.inventoryTitle}>Files</h2>
            <span className={styles.inventoryMeta}>{fileEntries.length} files</span>
          </div>

          <div className={styles.inventoryGroup}>
            {fileEntries.map((fileEntry) => {
              const isActive = fileEntry.id === activeFileId;

              return (
                <button
                  className={`${styles.fileButton} ${isActive ? styles.fileButtonActive : ''}`}
                  key={String(fileEntry.id)}
                  onClick={() => setActiveFileId(fileEntry.id)}
                  type="button"
                >
                  <span className={styles.fileName}>{fileEntry.name}</span>
                  <span className={styles.fileKind}>
                    {fileEntry.kind === 'document' ? 'Editable' : 'Read only'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className={styles.contentPane}>
          <div className={styles.chrome}>
            <div className={styles.activeFileName}>{activeFile.name}</div>

            <div className={styles.chromeActions}>
              <button
                className={styles.ghostButton}
                onClick={() => setMetadataOpen((current) => !current)}
                type="button"
              >
                {metadataOpen ? 'Hide properties' : 'Properties'}
              </button>
              <button
                className={styles.primaryButton}
                disabled={isSaving || isShellOnly}
                onClick={() => handleSave()}
                type="button"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.ghostButton} onClick={onClose} type="button">
                Close
              </button>
            </div>
          </div>

          <div className={`${styles.bodyPane} ${metadataOpen ? styles.bodyPaneWithDrawer : ''}`}>
            <div className={styles.documentSurface}>
              {isDocumentSelected ? (
                <div className={styles.editorShell}>
                  {isShellOnly ? (
                    <div className={styles.loadingBody}>
                      Loading the selected document…
                    </div>
                  ) : (
                    <ToastEditor
                      key={item.id}
                      ref={editorRef}
                      autofocus={false}
                      height="72vh"
                      hideModeSwitch
                      initialEditType="wysiwyg"
                      initialValue={documentDraft}
                      onChange={handleEditorChange}
                      placeholder="Start writing here…"
                      toolbarItems={[]}
                      usageStatistics={false}
                    />
                  )}
                </div>
              ) : (
                <section className={styles.contextShell}>
                  <div className={styles.contextPreview}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeFile.content}</ReactMarkdown>
                  </div>
                </section>
              )}
            </div>

            {metadataOpen ? (
              <aside className={styles.metadataDrawer}>
                <div className={styles.metadataStack}>
                  <label className={styles.field}>
                    <span className={styles.label}>State</span>
                    <select
                      className={styles.select}
                      onChange={(event) =>
                        setFormState({ ...formState, state: event.target.value as ItemState })
                      }
                      value={formState.state || 'active'}
                    >
                      <option value="active">Active</option>
                      <option value="simmering">Simmering</option>
                      <option value="parked">Parked</option>
                      <option value="archived">Archived</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </label>

                  <div className={styles.metadataRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Planned start</span>
                      <input
                        className={styles.input}
                        onChange={(event) =>
                          setFormState({ ...formState, plannedStart: event.target.value })
                        }
                        type="date"
                        value={formState.plannedStart || ''}
                      />
                    </label>
                  </div>

                  <div className={styles.metadataRow}>
                    <label className={styles.field}>
                      <span className={styles.label}>Due date</span>
                      <input
                        className={styles.input}
                        onChange={(event) => setFormState({ ...formState, dueDate: event.target.value })}
                        type="date"
                        value={formState.dueDate || ''}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Status</span>
                      <input
                        className={styles.input}
                        onChange={(event) => setFormState({ ...formState, status: event.target.value })}
                        value={formState.status || ''}
                      />
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>Status</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setFormState({ ...formState, status: event.target.value })}
                      value={formState.status || ''}
                    />
                  </label>
                </div>

                <details className={styles.drawerDetails}>
                  <summary className={styles.drawerSummary}>More</summary>

                  <div className={styles.drawerDetailsBody}>
                    <label className={styles.field}>
                      <span className={styles.label}>Title</span>
                      <input
                        className={styles.input}
                        onChange={(event) => setFormState({ ...formState, title: event.target.value })}
                        value={formState.title || ''}
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.label}>Summary</span>
                      <textarea
                        className={styles.summaryTextarea}
                        onChange={(event) => setFormState({ ...formState, summary: event.target.value })}
                        value={formState.summary || ''}
                      />
                    </label>

                    <div className={styles.utilityRow}>
                      <div className={styles.quickActions}>
                        <button
                          className={styles.quickActionButton}
                          onClick={() =>
                            setFormState({
                              ...formState,
                              plannedStart: getTodayIsoDate(),
                              planningMode: 'optimistic',
                            })
                          }
                          type="button"
                        >
                          Today
                        </button>
                        <button
                          className={styles.quickActionButton}
                          onClick={() =>
                            setFormState({
                              ...formState,
                              plannedStart: buildTomorrowDate(),
                              planningMode: 'optimistic',
                            })
                          }
                          type="button"
                        >
                          Tomorrow
                        </button>
                        <button
                          className={styles.quickActionButton}
                          onClick={() =>
                            setFormState({
                              ...formState,
                              plannedStart: buildNextWeekDate(),
                              planningMode: 'optimistic',
                            })
                          }
                          type="button"
                        >
                          Next week
                        </button>
                        <button
                          className={styles.quickActionGhost}
                          onClick={() =>
                            setFormState({
                              ...formState,
                              plannedStart: null,
                              fixedStartTime: null,
                              planningMode: 'unscheduled',
                            })
                          }
                          type="button"
                        >
                          Unscheduled
                        </button>
                      </div>
                    </div>

                    <div className={styles.utilityFields}>
                      <label className={styles.field}>
                        <span className={styles.label}>Time</span>
                        <input
                          className={styles.input}
                          onChange={(event) =>
                            setFormState({ ...formState, fixedStartTime: event.target.value })
                          }
                          type="time"
                          value={formState.fixedStartTime || ''}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Minutes</span>
                        <input
                          className={styles.input}
                          onChange={(event) =>
                            setFormState({
                              ...formState,
                              durationMinutes: Number(event.target.value) || 30,
                            })
                          }
                          type="number"
                          value={formState.durationMinutes || 60}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>Days</span>
                        <input
                          className={styles.input}
                          onChange={(event) =>
                            setFormState({
                              ...formState,
                              durationDays: Number(event.target.value) || 1,
                            })
                          }
                          type="number"
                          value={formState.durationDays || 1}
                        />
                      </label>
                    </div>
                  </div>
                </details>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
