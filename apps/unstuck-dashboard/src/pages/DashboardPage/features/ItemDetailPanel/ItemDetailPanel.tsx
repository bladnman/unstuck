import { useEffect, useRef, useState } from 'react';

import { Editor } from '@toast-ui/react-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { ItemDetail, ItemState } from '@/types/unstuck';

import styles from './ItemDetailPanel.module.css';

interface ItemDetailPanelProps {
  item: ItemDetail | null;
  isLoading: boolean;
  onSaveMetadata: (itemId: string, patch: Partial<ItemDetail>) => Promise<void>;
  onSaveDocument: (itemId: string, document: string) => Promise<void>;
}

export function ItemDetailPanel({
  isLoading,
  item,
  onSaveDocument,
  onSaveMetadata,
}: ItemDetailPanelProps) {
  const editorRef = useRef<Editor | null>(null);
  const [formState, setFormState] = useState<Partial<ItemDetail>>({});

  useEffect(() => {
    if (!item) {
      setFormState({});
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
      rank: item.rank,
    });
  }, [item?.id]);

  useEffect(() => {
    if (item && editorRef.current) {
      editorRef.current.getInstance().setMarkdown(item.document || '');
    }
  }, [item?.id, item?.document]);

  if (!item && isLoading) {
    return <div className={styles.loading}>Loading item detail…</div>;
  }

  if (!item) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>{item.title}</h2>
        <p className={styles.subcopy}>
          This panel edits both the index metadata and the markdown living in the item folder.
        </p>
      </header>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input
            className={styles.input}
            onChange={(event) => setFormState({ ...formState, title: event.target.value })}
            value={formState.title || ''}
          />
        </label>
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
        <label className={styles.field}>
          <span className={styles.label}>Summary</span>
          <textarea
            className={styles.textarea}
            onChange={(event) => setFormState({ ...formState, summary: event.target.value })}
            value={formState.summary || ''}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Status</span>
          <textarea
            className={styles.textarea}
            onChange={(event) => setFormState({ ...formState, status: event.target.value })}
            value={formState.status || ''}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Planned start</span>
          <input
            className={styles.input}
            onChange={(event) => setFormState({ ...formState, plannedStart: event.target.value })}
            type="date"
            value={formState.plannedStart || ''}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Fixed start time</span>
          <input
            className={styles.input}
            onChange={(event) => setFormState({ ...formState, fixedStartTime: event.target.value })}
            type="time"
            value={formState.fixedStartTime || ''}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Duration minutes</span>
          <input
            className={styles.input}
            onChange={(event) =>
              setFormState({ ...formState, durationMinutes: Number(event.target.value) || 30 })
            }
            type="number"
            value={formState.durationMinutes || 60}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Duration days</span>
          <input
            className={styles.input}
            onChange={(event) =>
              setFormState({ ...formState, durationDays: Number(event.target.value) || 1 })
            }
            type="number"
            value={formState.durationDays || 1}
          />
        </label>
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
          <span className={styles.label}>Schedule mode</span>
          <select
            className={styles.select}
            onChange={(event) => setFormState({ ...formState, scheduleMode: event.target.value })}
            value={formState.scheduleMode || 'all-days'}
          >
            <option value="all-days">All days</option>
            <option value="weekdays">Weekdays</option>
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.button}
          onClick={() => onSaveMetadata(item.id, formState)}
          type="button"
        >
          Save metadata
        </button>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            const document = editorRef.current?.getInstance().getMarkdown() || '';
            onSaveDocument(item.id, document);
          }}
          type="button"
        >
          Save markdown
        </button>
      </div>

      <Editor
        initialEditType="wysiwyg"
        initialValue={item.document}
        previewStyle="vertical"
        ref={editorRef}
        usageStatistics={false}
      />

      <div className={styles.contextList}>
        {item.contextFiles.map((contextFile) => (
          <article className={styles.contextCard} key={contextFile.path}>
            <h3 className={styles.contextTitle}>{contextFile.name}</h3>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{contextFile.content}</ReactMarkdown>
          </article>
        ))}
      </div>
    </section>
  );
}
