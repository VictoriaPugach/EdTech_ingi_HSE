import type { ChatMessageDto, JoinSessionDto, LivekitTokenDto, SessionDto } from '@edtech/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const SESSIONS_BASE = `${API_BASE}/api/sessions`;

export class SessionsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SessionsApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;

  let code = 'UnknownError';
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    code = body.error ?? code;
    message = body.message ?? message;
  } catch {
    // ignore parse errors
  }
  throw new SessionsApiError(code, message, res.status);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export interface CreateSessionInput {
  title: string;
  language?: 'python' | 'javascript';
  mode?: 'group' | 'single';
  lessonId?: string;
}

export interface PostChatInput {
  /** id, который клиент уже положил в Y.Array('chat') — для идемпотентного зеркала. */
  id?: string;
  body: string;
}

export const sessionsApi = {
  /** Создать сессию (текущий пользователь — HOST). */
  async create(token: string, input: CreateSessionInput): Promise<SessionDto> {
    const res = await fetch(SESSIONS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return handleResponse<SessionDto>(res);
  },

  /**
   * ВРЕМЕННО (для защиты): войти в единое общее занятие «Защита».
   * Get-or-create на бэкенде — все участники получают одну и ту же сессию.
   */
  async joinDefense(token: string): Promise<SessionDto> {
    const res = await fetch(`${SESSIONS_BASE}/defense`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<SessionDto>(res);
  },

  /** Список своих сессий. */
  async listMine(token: string): Promise<SessionDto[]> {
    const res = await fetch(SESSIONS_BASE, { headers: authHeaders(token) });
    return handleResponse<SessionDto[]>(res);
  },

  /** Найти сессию по invite-коду (для ссылки подключения). */
  async getByInvite(token: string, code: string): Promise<SessionDto> {
    const res = await fetch(`${SESSIONS_BASE}/by-invite/${encodeURIComponent(code)}`, {
      headers: authHeaders(token),
    });
    return handleResponse<SessionDto>(res);
  },

  /**
   * Подключиться к занятию: регистрирует участника, возвращает роль и
   * сессионный JWT для WebSocket Realtime Sync (НФТ-5).
   */
  async join(token: string, sessionId: string): Promise<JoinSessionDto> {
    const res = await fetch(`${SESSIONS_BASE}/${encodeURIComponent(sessionId)}/join`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<JoinSessionDto>(res);
  },

  /** История чата занятия (для восстановления при перезаходе). */
  async getChat(token: string, sessionId: string): Promise<ChatMessageDto[]> {
    const res = await fetch(`${SESSIONS_BASE}/${encodeURIComponent(sessionId)}/chat`, {
      headers: authHeaders(token),
    });
    return handleResponse<ChatMessageDto[]>(res);
  },

  /** Зеркалировать сообщение чата в постоянную историю. */
  async postChat(token: string, sessionId: string, input: PostChatInput): Promise<ChatMessageDto> {
    const res = await fetch(`${SESSIONS_BASE}/${encodeURIComponent(sessionId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return handleResponse<ChatMessageDto>(res);
  },

  /** Получить access-токен видеокомнаты LiveKit (групповой звонок занятия). */
  async livekitToken(token: string, sessionId: string): Promise<LivekitTokenDto> {
    const res = await fetch(`${SESSIONS_BASE}/${encodeURIComponent(sessionId)}/livekit-token`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse<LivekitTokenDto>(res);
  },
};
