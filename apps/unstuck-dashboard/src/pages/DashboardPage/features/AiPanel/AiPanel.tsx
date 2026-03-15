import { useEffect, useRef, useState } from 'react';

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
  const [stickToBottom, setStickToBottom] = useState(true);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const contextItems = currentItem
    ? [`${currentItem.title} (${currentItem.id})`, currentItem.status]
    : [];
  const transcript = session?.transcript || [];
  const notices = session?.notices || [];
  const lastEntry = transcript.length ? transcript[transcript.length - 1] : null;

  useEffect(() => {
    setStickToBottom(true);
  }, [session?.id]);

  useEffect(() => {
    const container = transcriptRef.current;
    if (!container || !stickToBottom) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [isStreaming, lastEntry?.updatedAt, transcript.length, stickToBottom]);

  const handleTranscriptScroll = () => {
    const container = transcriptRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setStickToBottom(distanceFromBottom < 48);
  };

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

      {notices.length ? (
        <div className={styles.noticeTray}>
          {notices.map((notice) => (
            <div className={styles.notice} key={notice.id} title={notice.lastMessage}>
              <span>{notice.label}</span>
              <span className={styles.noticeCount}>{notice.count}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.transcript} onScroll={handleTranscriptScroll} ref={transcriptRef}>
        {transcript.length ? transcript.map((entry) => (
          <article
            className={`${styles.message} ${styles[entry.role]} ${entry.kind === 'command' ? styles.commandMessage : ''}`}
            key={entry.id}
          >
            <span className={styles.messageLabel}>{entry.label || entry.role}</span>
            {entry.kind === 'command' ? (
              <div className={styles.commandCard}>
                <code className={styles.commandText}>{entry.command}</code>
                <div className={styles.commandMeta}>
                  {entry.status === 'running' ? 'Running…' : entry.exitCode === 0 ? 'Completed' : `Exited ${entry.exitCode ?? 'with error'}`}
                </div>
                {entry.content ? (
                  <pre className={styles.commandOutput}>{entry.content}</pre>
                ) : (
                  <div className={styles.commandPending}>
                    {entry.status === 'running' ? 'Waiting for output…' : 'No command output.'}
                  </div>
                )}
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
            )}
          </article>
        )) : (
          <div className={styles.emptyState}>
            Start a session to see the transcript here.
          </div>
        )}
      </div>
    </section>
  );
}
