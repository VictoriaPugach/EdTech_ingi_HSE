import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { yCollab } from 'y-codemirror.next';

const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:4001/ws';

/** Случайный приветливый ник для awareness — пока без auth. */
function randomUser() {
  const names = ['Кот', 'Лиса', 'Енот', 'Панда', 'Жираф', 'Медведь', 'Сова', 'Дельфин'];
  const colors = ['#ff7a59', '#1f9aff', '#52b6ff', '#7bd389', '#f5a623', '#a06cd5', '#ff6b9d'];
  return {
    name: names[Math.floor(Math.random() * names.length)] + ' ' + Math.floor(Math.random() * 100),
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [users, setUsers] = useState<RemoteUser[]>([]);
  const me = useMemo(() => randomUser(), []);

  useEffect(() => {
    if (!sessionId || !editorHostRef.current) return;

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, sessionId, ydoc, {
      // Передаём session в query — наш сервер умеет извлекать оба варианта
      params: { session: sessionId },
      connect: true,
    });

    provider.on('status', ({ status: s }: { status: string }) => {
      if (s === 'connected') setStatus('connected');
      else if (s === 'disconnected') setStatus('disconnected');
      else setStatus('connecting');
    });

    // Сообщаем серверу нашу awareness-инфу (ник и цвет курсора)
    provider.awareness.setLocalStateField('user', me);

    const updateUsers = () => {
      const list: RemoteUser[] = [];
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: { name: string; color: string } }).user;
        if (user) list.push({ clientId, name: user.name, color: user.color });
      });
      setUsers(list);
    };
    provider.awareness.on('change', updateUsers);
    updateUsers();

    const yText = ydoc.getText('codemirror');

    // Если документ пустой — пишем приветственный шаблон (только первый клиент это сделает,
    // дальнейшие подгрузят состояние из CRDT). Используем событие 'sync' (y-websocket v2 API).
    const onSync = (isSynced: boolean) => {
      if (!isSynced) return;
      if (yText.length === 0) {
        yText.insert(
          0,
          [
            '# Привет! Это совместный редактор кода 🚀',
            '# Все, кто открыл эту страницу, видят одно и то же.',
            '# Попробуй написать что-нибудь, а друг увидит твои изменения в реальном времени.',
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
      ],
    });
    const view = new EditorView({ state, parent: editorHostRef.current });

    return () => {
      view.destroy();
      provider.awareness.off('change', updateUsers);
      provider.destroy();
      ydoc.destroy();
    };
    // sessionId — единственная зависимость; me стабилен (useMemo)
  }, [sessionId, me]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Шапка сессии */}
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
        </div>

        <div className="flex items-center gap-3">
          <ConnectionBadge status={status} />
          <UsersBadge users={users} me={me} />
        </div>
      </div>

      <div ref={editorHostRef} className="flex-1 overflow-auto" />

      <footer className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">
        CRDT через Yjs · WebSocket к <code className="font-mono">{WS_URL}</code> · Подсказки
        пока в разработке
      </footer>
    </div>
  );
}

function ConnectionBadge({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const map = {
    connecting: { label: 'Подключаюсь…', cls: 'bg-yellow-100 text-yellow-700' },
    connected: { label: 'На связи', cls: 'bg-green-100 text-green-700' },
    disconnected: { label: 'Отключено', cls: 'bg-red-100 text-red-700' },
  } as const;
  const { label, cls } = map[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

function UsersBadge({ users, me }: { users: RemoteUser[]; me: { name: string; color: string } }) {
  if (users.length === 0)
    return (
      <span className="text-xs text-slate-500">
        Ты:&nbsp;<b style={{ color: me.color }}>{me.name}</b>
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
      {users.length > 6 && (
        <span className="text-xs text-slate-500">+{users.length - 6}</span>
      )}
    </div>
  );
}
