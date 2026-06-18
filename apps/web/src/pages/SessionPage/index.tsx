import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { yCollab } from 'y-codemirror.next';
import type { SessionRole } from '@edtech/shared';
import { useAuth } from '../../hooks/useAuth';
import { sessionsApi } from '../../services/sessions';
import { Chat, type ChatItem } from '../../components/features/session/Chat';

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
  viewer: 'Наблюдатель (только чтение)',
};

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

  // Видеозвонок (LiveKit). Подключаем лениво по кнопке — чтобы не нагружать
  // SFU и канал, пока видео реально не нужно.
  const [videoTok, setVideoTok] = useState<{ url: string; token: string; canPublish: boolean } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

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

      // 6. Редактор кода. Для наблюдателя — режим «только чтение».
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
          highlightActiveLine(),
          python(),
          keymap.of([...defaultKeymap, indentWithTab]),
          yCollab(yText, provider.awareness, { undoManager }),
          EditorView.lineWrapping,
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

  // Подключить/завершить видеозвонок: токен LiveKit берём лениво при первом включении.
  const toggleVideo = useCallback(async () => {
    setVideoError(null);
    if (videoTok) {
      setVideoTok(null);
      return;
    }
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
  }, [videoTok, token, sessionId]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b bg-brand-100/50 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Сессия:</span>
          <code className="rounded bg-white px-2 py-1 font-mono text-sm text-brand-700">
            {sessionId}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className="rounded bg-brand-200 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-400 hover:text-white"
          >
            Скопировать ссылку
          </button>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {ROLE_LABEL[role]}
          </span>
          <button
            onClick={toggleVideo}
            disabled={videoLoading}
            className={`rounded px-2 py-1 text-xs font-semibold text-white disabled:opacity-60 ${
              videoTok ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-700 hover:opacity-90'
            }`}
          >
            {videoTok ? 'Завершить видео' : videoLoading ? 'Подключение…' : '📹 Видеозвонок'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionBadge status={status} />
          <UsersBadge users={users} me={user ? { name: user.name, color: colorFromId(user.id) } : null} />
        </div>
      </div>

      {anonymous && (
        <div className="bg-yellow-50 px-4 py-1 text-xs text-yellow-800">
          Демо-режим: сессия не найдена в БД, подключение без авторизации. Создайте сессию через API,
          чтобы получить роли и постоянную историю чата.
        </div>
      )}

      {videoError && (
        <div className="bg-red-50 px-4 py-1 text-xs text-red-700">{videoError}</div>
      )}

      {videoTok && (
        <div className="h-56 shrink-0 border-b bg-[#14141c]">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-slate-300">Загрузка видео…</div>}>
            <VideoCall
              url={videoTok.url}
              token={videoTok.token}
              canPublish={videoTok.canPublish}
              onLeave={() => setVideoTok(null)}
            />
          </Suspense>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div ref={editorHostRef} className="min-w-0 flex-1 overflow-auto" />
        <aside className="w-80 shrink-0 border-l">
          <Chat
            messages={messages}
            currentUserId={user?.id ?? ''}
            canSend={role !== 'viewer'}
            onSend={handleSend}
          />
        </aside>
      </div>

      <footer className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">
        CRDT через Yjs · WebSocket к <code className="font-mono">{WS_URL}</code> · Чат — Y.Array в том же Y.Doc
      </footer>
    </div>
  );
}

function ConnectionBadge({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const map = {
    connecting: { label: 'Подключаюсь…', cls: 'bg-yellow-100 text-yellow-700' },
    connected:  { label: 'На связи',     cls: 'bg-green-100 text-green-700'  },
    disconnected: { label: 'Отключено',  cls: 'bg-red-100 text-red-700'      },
  } as const;
  const { label, cls } = map[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function UsersBadge({ users, me }: { users: RemoteUser[]; me: { name: string; color: string } | null }) {
  if (users.length === 0)
    return (
      <span className="text-xs text-slate-500">
        Ты:&nbsp;<b style={{ color: me?.color }}>{me?.name ?? '—'}</b>
      </span>
    );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">В сессии:</span>
      {users.slice(0, 6).map((u) => (
        <span
          key={u.clientId}
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: u.color + '33', color: u.color }}
          title={u.name}
        >
          {u.name}
        </span>
      ))}
      {users.length > 6 && <span className="text-xs text-slate-500">+{users.length - 6}</span>}
    </div>
  );
}
