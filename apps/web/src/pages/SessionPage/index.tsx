import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { yCollab } from 'y-codemirror.next';
import type { SessionRole } from '@edtech/shared';
import { useAuth } from '../../hooks/useAuth';
import { sessionsApi } from '../../services/sessions';
import { Chat, type ChatItem } from '../../components/features/session/Chat';
import { IconButton } from '../../components/ui/IconButton';
import { CameraIcon, PresentationIcon, ChevronDownIcon } from '../../components/ui/icons';
import profileSvg from '../../assets/icons/ui/ui-profile.svg';
import settingsSvg from '../../assets/icons/ui/ui-settings.svg';
import bellSvg from '../../assets/icons/ui/ui-notification.svg';
import styles from './SessionPage.module.scss';

// Видео грузим лениво: тяжёлый LiveKit-бандл не попадает в основной чанк и
// подтягивается только когда участник реально включает видеозвонок.
const VideoCall = lazy(() =>
  import('../../components/features/session/VideoCall').then((m) => ({ default: m.VideoCall })),
);

const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:4001/ws';

const USER_COLORS = [
  '#7B5BF4', '#1f9aff', '#4AB179', '#f5a623',
  '#a06cd5', '#ff6b9d', '#52b6ff', '#ff7a59',
];

/** Стабильный цвет участника по его id (для курсора и аватара). */
function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
}

const ROLE_LABEL: Record<SessionRole, string> = {
  host: 'Ведущий',
  editor: 'Редактор',
  viewer: 'Наблюдатель',
};

/** Тёмный редактор на всю высоту консоли. */
const editorHeightTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': { overflow: 'auto' },
});

function formatElapsed(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { token, user } = useAuth();

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const yChatRef = useRef<Y.Array<ChatItem> | null>(null);
  const roleRef = useRef<SessionRole>('editor');
  const messagesMapRef = useRef<Map<string, ChatItem>>(new Map());

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const [role, setRole] = useState<SessionRole>('editor');
  const [anonymous, setAnonymous] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [presentationOpen, setPresentationOpen] = useState(false);

  // Видеозвонок (LiveKit). Подключаем лениво по кнопке — чтобы не нагружать
  // SFU и канал, пока видео реально не нужно.
  const [videoTok, setVideoTok] = useState<{ url: string; token: string; canPublish: boolean } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Таймер занятия (с момента входа).
  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  // Слить новые сообщения в map (дедуп по id) и пересобрать отсортированный список.
  const mergeMessages = useCallback((items: ChatItem[]) => {
    const map = messagesMapRef.current;
    for (const it of items) if (it?.id) map.set(it.id, it);
    setMessages(
      [...map.values()].sort((a, b) =>
        a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt),
      ),
    );
  }, []);

  useEffect(() => {
    if (!sessionId || !editorHostRef.current || !token || !user) return;

    let cancelled = false;
    let cleanup = () => {};

    void (async () => {
      // 1. Подключение к занятию: роль + сессионный JWT для WS (НФТ-5).
      //    Если сессии нет в БД (ad-hoc комната в dev) — анонимный режим:
      //    подключаемся без токена, что работает при REQUIRE_AUTH=false.
      let wsToken: string | null = null;
      let resolvedRole: SessionRole = 'editor';
      try {
        const joined = await sessionsApi.join(token, sessionId);
        wsToken = joined.token;
        resolvedRole = joined.role;
      } catch {
        if (!cancelled) setAnonymous(true);
      }
      if (cancelled || !editorHostRef.current) return;

      roleRef.current = resolvedRole;
      setRole(resolvedRole);
      const editable = resolvedRole !== 'viewer';

      // 2. Y.Doc + WebSocket-провайдер. Токен прокидывается в query (?token=),
      //    Realtime Sync валидирует подпись и роль (VIEWER не может писать).
      const ydoc = new Y.Doc();
      const params: Record<string, string> = { session: sessionId };
      if (wsToken) params.token = wsToken;
      const provider = new WebsocketProvider(WS_URL, sessionId, ydoc, { params, connect: true });

      provider.on('status', ({ status: s }: { status: string }) => {
        if (cancelled) return;
        if (s === 'connected') setStatus('connected');
        else if (s === 'disconnected') setStatus('disconnected');
        else setStatus('connecting');
      });

      // 3. Реальная личность участника в awareness (курсор + список онлайн).
      const me = { name: user.name, color: colorFromId(user.id) };
      provider.awareness.setLocalStateField('user', me);

      const updateUsers = () => {
        if (cancelled) return;
        const list: RemoteUser[] = [];
        provider.awareness.getStates().forEach((state, clientId) => {
          const u = (state as { user?: { name: string; color: string } }).user;
          if (u) list.push({ clientId, name: u.name, color: u.color });
        });
        setUsers(list);
      };
      provider.awareness.on('change', updateUsers);
      updateUsers();

      // 4. Чат: Y.Array('chat') в том же Y.Doc — живая доставка по каналу CRDT.
      const yChat = ydoc.getArray<ChatItem>('chat');
      yChatRef.current = yChat;
      const onChatChange = () => mergeMessages(yChat.toArray());
      yChat.observe(onChatChange);
      mergeMessages(yChat.toArray());

      // 5. История чата из БД (ADR in-session-chat) — для перезахода.
      sessionsApi
        .getChat(token, sessionId)
        .then((history) => {
          if (cancelled) return;
          mergeMessages(
            history.map((m) => ({
              id: m.id,
              authorId: m.userId,
              authorName: m.authorName,
              body: m.body,
              createdAt: m.createdAt,
              kind: m.kind,
            })),
          );
        })
        .catch(() => {
          /* история недоступна (dev/anon) — не критично, живой чат работает */
        });

      // 6. Редактор кода (тёмная консоль). Для наблюдателя — «только чтение».
      const yText = ydoc.getText('codemirror');
      const onSync = (isSynced: boolean) => {
        if (!isSynced) return;
        if (editable && yText.length === 0) {
          yText.insert(
            0,
            [
              '# Привет! Это совместный редактор кода 🚀',
              '# Все участники видят одно и то же в реальном времени.',
              '',
              'name = "Виктория"',
              'print("Hello, " + name + "!")',
              '',
            ].join('\n'),
          );
        }
        provider.off('sync', onSync);
      };
      provider.on('sync', onSync);

      const undoManager = new Y.UndoManager(yText);
      const state = EditorState.create({
        doc: yText.toString(),
        extensions: [
          lineNumbers(),
          python(),
          keymap.of([...defaultKeymap, indentWithTab]),
          yCollab(yText, provider.awareness, { undoManager }),
          EditorView.lineWrapping,
          oneDark,
          editorHeightTheme,
          ...(editable ? [] : [EditorState.readOnly.of(true), EditorView.editable.of(false)]),
        ],
      });
      const view = new EditorView({ state, parent: editorHostRef.current });

      cleanup = () => {
        view.destroy();
        yChat.unobserve(onChatChange);
        provider.awareness.off('change', updateUsers);
        provider.destroy();
        ydoc.destroy();
        yChatRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [sessionId, token, user, mergeMessages]);

  // Отправка сообщения: мгновенно в Y.Array (живая доставка) + зеркало в БД.
  const handleSend = useCallback(
    (body: string) => {
      const yChat = yChatRef.current;
      if (!yChat || !user || !token || !sessionId || roleRef.current === 'viewer') return;
      const item: ChatItem = {
        id: crypto.randomUUID(),
        authorId: user.id,
        authorName: user.name,
        body,
        createdAt: new Date().toISOString(),
        kind: 'user',
      };
      yChat.push([item]);
      sessionsApi.postChat(token, sessionId, { id: item.id, body }).catch(() => {
        /* зеркало не критично для живой доставки */
      });
    },
    [user, token, sessionId],
  );

  // Подключить видеозвонок: токен LiveKit берём лениво при первом включении.
  const connectVideo = useCallback(async () => {
    setVideoError(null);
    if (!token || !sessionId) return;
    setVideoLoading(true);
    try {
      const t = await sessionsApi.livekitToken(token, sessionId);
      setVideoTok({ url: t.url, token: t.token, canPublish: t.canPublish });
    } catch {
      setVideoError('Видео недоступно: нужна реальная сессия в БД (не demo-режим) и запущенный LiveKit.');
    } finally {
      setVideoLoading(false);
    }
  }, [token, sessionId]);

  const statusMeta = {
    connecting: { cls: styles.dotWait, label: 'Подключение…' },
    connected: { cls: styles.dotOk, label: 'На связи' },
    disconnected: { cls: styles.dotOff, label: 'Нет связи' },
  }[status];

  return (
    <div className={styles.page}>
      {/* ── Шапка ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Онлайн урок</h1>
          <span className={styles.timer}>
            <span aria-hidden>●</span> {formatElapsed(elapsed)}
          </span>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.role}>{ROLE_LABEL[role]}</span>
          <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(window.location.href)}>
            Скопировать ссылку
          </button>
          <span className={styles.status}>
            <span className={`${styles.dot} ${statusMeta.cls}`} /> {statusMeta.label}
          </span>
          <span className={styles.headerIcons}>
            <IconButton aria-label="Профиль"><img src={profileSvg} alt="" /></IconButton>
            <IconButton aria-label="Настройки"><img src={settingsSvg} alt="" /></IconButton>
            <IconButton aria-label="Уведомления"><img src={bellSvg} alt="" /></IconButton>
          </span>
        </div>
      </header>

      {anonymous && (
        <div className={styles.banner}>
          Демо-режим: сессия не найдена в БД, подключение без авторизации. Создайте занятие через
          преподавателя, чтобы получить роли и постоянную историю.
        </div>
      )}
      {videoError && <div className={styles.bannerError}>{videoError}</div>}

      {/* ── Тело: слева презентация + код, справа видео + чат ───────────── */}
      <div className={styles.body}>
        <div className={styles.leftCol}>
          {presentationOpen && (
            <section className={styles.presentation}>
              <div className={styles.presHeader}>
                <div className={styles.presTabs}>
                  <button className={`${styles.presTab} ${styles.presTabActive}`}>Презентация</button>
                  <button className={styles.presTab}>Задание</button>
                </div>
                <button
                  className={styles.presClose}
                  onClick={() => setPresentationOpen(false)}
                  aria-label="Свернуть презентацию"
                  title="Свернуть"
                >
                  <ChevronDownIcon width={18} height={18} />
                </button>
              </div>
              <div className={styles.presBody}>
                <span className={styles.presBodyTitle}>Презентация занятия</span>
                <span className={styles.presBodyHint}>
                  Здесь появятся слайды урока. Сверните панель — редактор кода развернётся на всю высоту.
                </span>
              </div>
            </section>
          )}

          <section className={styles.console}>
            <div className={styles.consoleHeader}>
              <span className={styles.macDots}>
                <span className={`${styles.macDot} ${styles.macRed}`} />
                <span className={`${styles.macDot} ${styles.macYellow}`} />
                <span className={`${styles.macDot} ${styles.macGreen}`} />
              </span>
              <span className={styles.fileName}>main.py</span>
              {!presentationOpen && (
                <button
                  className={styles.presToggle}
                  onClick={() => setPresentationOpen(true)}
                  title="Открыть презентацию"
                >
                  <PresentationIcon width={16} height={16} /> Презентация
                </button>
              )}
              <span className={styles.peers}>
                {users.slice(0, 4).map((u) => (
                  <span key={u.clientId} className={styles.peer} style={{ color: u.color }} title={u.name}>
                    <span className={styles.peerDot} style={{ backgroundColor: u.color }} />
                    {u.name}
                  </span>
                ))}
              </span>
            </div>
            <div ref={editorHostRef} className={styles.editorHost} />
          </section>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.videoCard}>
            {videoTok ? (
              <Suspense fallback={<div className={styles.videoPlaceholder}>Загрузка видео…</div>}>
                <VideoCall
                  url={videoTok.url}
                  token={videoTok.token}
                  canPublish={videoTok.canPublish}
                  onLeave={() => setVideoTok(null)}
                />
              </Suspense>
            ) : (
              <div className={styles.videoPlaceholder}>
                <span className={styles.placeholderText}>Видеосвязь занятия</span>
                <button className={styles.connectBtn} onClick={connectVideo} disabled={videoLoading}>
                  <CameraIcon width={18} height={18} />
                  {videoLoading ? 'Подключение…' : 'Подключиться к видео'}
                </button>
              </div>
            )}
          </div>

          <aside className={styles.chatCard}>
            <Chat
              messages={messages}
              currentUserId={user?.id ?? ''}
              canSend={role !== 'viewer'}
              onSend={handleSend}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
