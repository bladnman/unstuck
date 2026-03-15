import { useState } from 'react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { AiProvider, AiSession, UnstuckItem } from '@/types/unstuck';

import styles from './AiPanel.module.css';

interface AiPanelProps {
  currentItem: UnstuckItem | null;
  errorMessage: string;
  providers: AiProvider[];
  session: AiSession | null;
  isStreaming: boolean;
  onStartSession: (providerId: string) => Promise<string>;
  onSendMessage: (message: string, contextItems: string[], providerId?: string) => Promise<void>;
}

export function AiPanel({
  currentItem,
  errorMessage,
  isStreaming,
  onSendMessage,
  onStartSession,
  providers,
  session,
}: AiPanelProps) {
  const [message, setMessage] = useState('');
  const [providerId, setProviderId] = useState(providers[0]?.id || 'codex');
  const contextItems = currentItem
    ? [`${currentItem.title} (${currentItem.id})`, currentItem.status]
    : [];

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>AI side panel</h2>
        <p className={styles.subcopy}>
          This is an experimental CLI bridge. It opens a long-lived terminal-backed session, prefixes
          prompts with the Unstuck skill command, and can send the currently selected item as context.
        </p>
      </header>

      <div className={styles.controls}>
        <select
          className={styles.select}
          onChange={(event) => setProviderId(event.target.value)}
          value={providerId}
        >
          {(providers.length ? providers : [{ id: 'codex', label: 'Codex CLI', available: false }]).map(
            (provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
                {provider.available ? '' : ' (not detected)'}
              </option>
            ),
          )}
        </select>

        <div className={styles.buttonRow}>
          <button className={styles.button} onClick={() => onStartSession(providerId)} type="button">
            {session ? 'New session' : 'Start session'}
          </button>
          <button className={styles.secondaryButton} type="button">
            {currentItem ? `Context: ${currentItem.title}` : 'No item context selected'}
          </button>
          {isStreaming ? <span className={styles.streaming}>Streaming…</span> : null}
        </div>
        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <textarea
          className={styles.textarea}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Talk to the skill from here. The selected item can be sent as context so references stay grounded."
          value={message}
        />

        <button
          className={styles.button}
          onClick={async () => {
            if (!message.trim()) {
              return;
            }

            await onSendMessage(message, contextItems, providerId);
            setMessage('');
          }}
          type="button"
        >
          Send through /unstuck
        </button>
      </div>

      <div className={styles.transcript}>
        {(session?.transcript || []).map((entry) => (
          <article className={`${styles.message} ${styles[entry.role]}`} key={entry.id}>
            <span className={styles.messageLabel}>{entry.role}</span>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </article>
        ))}
      </div>
    </section>
  );
}
