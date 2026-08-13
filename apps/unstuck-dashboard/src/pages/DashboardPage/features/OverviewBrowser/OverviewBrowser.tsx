import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './OverviewBrowser.module.css';

interface BrowserEntry {
  id: string;
  title: string;
  description: string;
  meta: string;
}

interface OverviewBrowserProps {
  detailTitle: string;
  detailMarkdown: string;
  entries: BrowserEntry[];
  errorMessage: string;
  isLoading: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  title: string;
}

export function OverviewBrowser({
  detailMarkdown,
  detailTitle,
  entries,
  errorMessage,
  isLoading,
  onClose,
  onSelect,
  selectedId,
  title,
}: OverviewBrowserProps) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.shell}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className={styles.closeButton} onClick={onClose} type="button">
          Close
        </button>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <span className={styles.eyebrow}>Overview browser</span>
            <h2 className={styles.title}>{title}</h2>
            {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
            <div className={styles.list}>
              {entries.map((entry) => (
                <button
                  className={`${styles.entryButton} ${selectedId === entry.id ? styles.entryButtonActive : ''}`}
                  key={entry.id}
                  onClick={() => onSelect(entry.id)}
                  type="button"
                >
                  <p className={styles.entryTitle}>{entry.title}</p>
                  <p className={styles.entryBody}>{entry.description}</p>
                  <span className={styles.entryMeta}>{entry.meta}</span>
                </button>
              ))}
              {!entries.length && !isLoading ? (
                <div className={styles.empty}>Nothing to show here yet.</div>
              ) : null}
            </div>
          </aside>

          <section className={styles.detailPane}>
            <span className={styles.eyebrow}>Detail</span>
            <h3 className={styles.detailTitle}>{detailTitle}</h3>
            {isLoading ? (
              <div className={styles.loading}>Loading…</div>
            ) : (
              <div className={styles.markdown}>
                {detailMarkdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailMarkdown}</ReactMarkdown>
                ) : (
                  <div className={styles.empty}>Pick something from the list to inspect it.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
