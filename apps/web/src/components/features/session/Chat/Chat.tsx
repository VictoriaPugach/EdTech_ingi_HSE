import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './Chat.module.scss';

/** Сообщение чата в Y.Array('chat') и в истории (ADR in-session-chat). */
export interface ChatItem {
  id: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  /** ISO-строка. */
  createdAt: string;
  kind: 'user' | 'system';
}

interface ChatProps {
  messages: ChatItem[];
  currentUserId: string;
  /** Наблюдатель (VIEWER) не может писать — поле ввода блокируется. */
  canSend: boolean;
  onSend: (body: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Чат онлайн-занятия (Figma «Member_chat»). Доставка — через Y.Array('chat')
 * в Y.Doc сессии; этот компонент только отображает и отправляет.
 */
export function Chat({ messages, currentUserId, canSend, onSend }: ChatProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  // Автопрокрутка вниз при новом сообщении.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div className={styles.chat}>
      <div className={styles.header}>Чат занятия</div>

      <div className={styles.list} ref={listRef}>
        {messages.length === 0 && (
          <p className={styles.empty}>Пока сообщений нет. Напишите первым!</p>
        )}
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <div key={m.id} className={styles.system}>
                {m.body}
              </div>
            );
          }
          const own = m.authorId === currentUserId;
          return (
            <div
              key={m.id}
              className={[styles.message, own ? styles.own : ''].filter(Boolean).join(' ')}
            >
              {!own && <span className={styles.author}>{m.authorName ?? 'Гость'}</span>}
              <span className={styles.bubble}>{m.body}</span>
              <span className={styles.time}>{formatTime(m.createdAt)}</span>
            </div>
          );
        })}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canSend ? 'Сообщение…' : 'Только просмотр'}
          disabled={!canSend}
          maxLength={2000}
        />
        <button className={styles.send} type="submit" disabled={!canSend || !draft.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
