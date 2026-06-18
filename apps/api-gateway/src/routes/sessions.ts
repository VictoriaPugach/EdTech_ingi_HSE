/**
 * Сессии совместного редактирования / онлайн-занятия (ФТ-2, ФТ-13).
 * Создание, получение по invite-коду, список «мои сессии», подключение (join).
 *
 * При join API Gateway определяет роль участника (HOST/EDITOR/VIEWER) и выпускает
 * сессионный JWT для WebSocket Realtime Sync (НФТ-5). Роли — см. ADR/доку по БД.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, randomUUID } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';
import type { ChatMessageDto, SessionDto } from '@edtech/shared';
import { config } from '../config.js';
import {
  chatMessageSchema,
  joinSessionSchema,
  livekitTokenSchema,
  postChatBodySchema,
  sessionDtoSchema,
  simpleErrorSchema,
  validationErrorSchema,
} from '../openapi/schemas.js';

const createSchema = z.object({
  title: z.string().min(1).max(120),
  language: z.enum(['python', 'javascript']).default('python'),
  mode: z.enum(['group', 'single']).default('group'),
  lessonId: z.string().uuid().optional(),
});

const postChatSchema = z.object({
  id: z.string().uuid().optional(),
  body: z.string().trim().min(1).max(2000),
});

function makeInviteCode(): string {
  return randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
}

function toChatDto(m: {
  id: string;
  sessionId: string;
  userId: string | null;
  kind: string;
  body: string;
  createdAt: Date;
  user?: { name: string } | null;
}): ChatMessageDto {
  return {
    id: m.id,
    sessionId: m.sessionId,
    userId: m.userId,
    authorName: m.user?.name ?? null,
    kind: m.kind.toLowerCase() as ChatMessageDto['kind'],
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  };
}

const createSessionBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    language: { type: 'string', enum: ['python', 'javascript'] },
    mode: { type: 'string', enum: ['group', 'single'] },
    lessonId: { type: 'string', format: 'uuid' },
  },
} as const;

function toDto(s: {
  id: string;
  ownerId: string;
  title: string;
  language: string;
  mode: string;
  inviteCode: string;
  isActive: boolean;
  createdAt: Date;
}): SessionDto {
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    language: s.language.toLowerCase() as SessionDto['language'],
    mode: s.mode.toLowerCase() as SessionDto['mode'],
    inviteCode: s.inviteCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function sessionsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/sessions',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'Создать сессию',
        description: 'Новая комната редактирования/занятия; владелец становится HOST.',
        security: [{ bearerAuth: [] }],
        body: createSessionBodySchema,
        response: {
          201: sessionDtoSchema,
          400: validationErrorSchema,
          401: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
      }
      const { title, language, mode, lessonId } = parsed.data;

      const session = await app.prisma.session.create({
        data: {
          ownerId: req.user.sub,
          title,
          language: language.toUpperCase() as 'PYTHON' | 'JAVASCRIPT',
          mode: mode.toUpperCase() as 'GROUP' | 'SINGLE',
          lessonId,
          inviteCode: makeInviteCode(),
          participants: { create: { userId: req.user.sub, role: 'HOST' } },
        },
      });

      return reply.code(201).send(toDto(session));
    },
  );

  app.get(
    '/sessions',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'Мои сессии',
        description: 'Список сессий, где текущий пользователь — владелец.',
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: 'array', items: sessionDtoSchema },
          401: simpleErrorSchema,
        },
      },
    },
    async (req) => {
      const list = await app.prisma.session.findMany({
        where: { ownerId: req.user.sub },
        orderBy: { createdAt: 'desc' },
      });
      return list.map(toDto);
    },
  );

  app.get(
    '/sessions/by-invite/:code',
    {
      schema: {
        tags: ['Sessions'],
        summary: 'Сессия по invite-коду',
        description: 'Публичный эндпоинт: присоединение к сессии по коду приглашения.',
        params: {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', minLength: 1 } },
        },
        response: {
          200: sessionDtoSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const { code } = req.params as { code: string };
      const session = await app.prisma.session.findUnique({ where: { inviteCode: code } });
      if (!session || !session.isActive) {
        return reply.code(404).send({ error: 'SessionNotFoundOrClosed' });
      }
      return toDto(session);
    },
  );

  // ── Подключение к занятию: роль + сессионный токен для WS (НФТ-5) ───────────
  app.post(
    '/sessions/:id/join',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'Подключиться к занятию',
        description:
          'Регистрирует участника, определяет роль (HOST/EDITOR/VIEWER) и выпускает сессионный JWT для WebSocket Realtime Sync.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: joinSessionSchema,
          401: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = req.user.sub;

      const session = await app.prisma.session.findUnique({ where: { id } });
      if (!session || !session.isActive) {
        return reply.code(404).send({ error: 'SessionNotFoundOrClosed' });
      }

      // Определяем роль на занятии.
      let sessionRole: 'HOST' | 'EDITOR' | 'VIEWER';
      if (session.ownerId === userId || req.user.role === 'teacher' || req.user.role === 'admin') {
        sessionRole = 'HOST';
      } else if (session.mode === 'SINGLE') {
        const editor = await app.prisma.participant.findFirst({
          where: { sessionId: id, role: 'EDITOR' },
        });
        sessionRole = editor ? 'VIEWER' : 'EDITOR';
      } else {
        sessionRole = 'EDITOR';
      }

      await app.prisma.participant.upsert({
        where: { sessionId_userId: { sessionId: id, userId } },
        update: { role: sessionRole, lastSeenAt: new Date(), leftAt: null },
        create: { sessionId: id, userId, role: sessionRole },
      });

      const user = await app.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      const token = app.jwt.sign(
        {
          sub: userId,
          role: req.user.role,
          name: user?.name,
          sessionId: id,
          sessionRole,
          mode: session.mode,
        },
        { expiresIn: '12h' },
      );

      return reply.send({
        token,
        sessionId: id,
        role: sessionRole.toLowerCase(),
        mode: session.mode.toLowerCase(),
      });
    },
  );

  // ── Чат занятия: постоянная история (ADR in-session-chat) ───────────────────
  // Живая доставка идёт через Y.Array('chat') в Realtime Sync; эти эндпоинты
  // дают историю при перезаходе и зеркало для модерации.

  /** Доступ к занятию (чат/видео): участник сессии, её владелец, либо преподаватель/админ. */
  async function assertSessionAccess(sessionId: string, userId: string, role: string): Promise<boolean> {
    const session = await app.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return false;
    if (session.ownerId === userId || role === 'teacher' || role === 'admin') return true;
    const participant = await app.prisma.participant.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    return participant != null;
  }

  app.get(
    '/sessions/:id/chat',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'История чата занятия',
        description: 'Последние сообщения чата сессии (по возрастанию времени) для восстановления при перезаходе.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        querystring: {
          type: 'object',
          properties: { limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 } },
        },
        response: {
          200: { type: 'array', items: chatMessageSchema },
          401: simpleErrorSchema,
          403: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { limit } = req.query as { limit?: number };

      if (!(await assertSessionAccess(id, req.user.sub, req.user.role))) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Берём последние N (desc), затем разворачиваем в хронологический порядок.
      const rows = await app.prisma.chatMessage.findMany({
        where: { sessionId: id },
        orderBy: { createdAt: 'desc' },
        take: limit ?? 100,
        include: { user: { select: { name: true } } },
      });
      return rows.reverse().map(toChatDto);
    },
  );

  app.post(
    '/sessions/:id/chat',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'Отправить сообщение в чат',
        description:
          'Зеркалирует сообщение в постоянную историю. Идемпотентно по id (тот же id кладётся клиентом в Y.Array для живой доставки).',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: postChatBodySchema,
        response: {
          201: chatMessageSchema,
          400: validationErrorSchema,
          401: simpleErrorSchema,
          403: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const parsed = postChatSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
      }

      const session = await app.prisma.session.findUnique({ where: { id } });
      if (!session || !session.isActive) {
        return reply.code(404).send({ error: 'SessionNotFoundOrClosed' });
      }
      if (!(await assertSessionAccess(id, req.user.sub, req.user.role))) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      const messageId = parsed.data.id ?? randomUUID();
      // upsert по id → при повторной доставке (мульти-нода) дубля не возникнет.
      const message = await app.prisma.chatMessage.upsert({
        where: { id: messageId },
        update: {},
        create: { id: messageId, sessionId: id, userId: req.user.sub, body: parsed.data.body, kind: 'USER' },
        include: { user: { select: { name: true } } },
      });

      return reply.code(201).send(toChatDto(message));
    },
  );

  // ── Видеокомната SFU LiveKit: access-токен по роли (ADR video-livekit-sfu) ──
  // Медиа идёт через отдельный SFU (не через Realtime Sync). Gateway только
  // выпускает короткоживущий токен с правами публикации по роли участника.
  app.post(
    '/sessions/:id/livekit-token',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Sessions'],
        summary: 'Токен видеокомнаты (LiveKit)',
        description:
          'Короткоживущий access-токен LiveKit для подключения к групповому звонку занятия. ' +
          'HOST/EDITOR могут публиковать камеру и микрофон, VIEWER — только смотрит.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        response: {
          200: livekitTokenSchema,
          401: simpleErrorSchema,
          403: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = req.user.sub;

      const session = await app.prisma.session.findUnique({ where: { id } });
      if (!session || !session.isActive) {
        return reply.code(404).send({ error: 'SessionNotFoundOrClosed' });
      }
      if (!(await assertSessionAccess(id, userId, req.user.role))) {
        return reply.code(403).send({ error: 'Forbidden' });
      }

      // Право публикации: владелец/преподаватель/админ и EDITOR — да; VIEWER — нет.
      // Роль берём из participant (создаётся при join перед подключением видео).
      const participant = await app.prisma.participant.findUnique({
        where: { sessionId_userId: { sessionId: id, userId } },
      });
      const isHost = session.ownerId === userId || req.user.role === 'teacher' || req.user.role === 'admin';
      const canPublish = isHost || (participant ? participant.role !== 'VIEWER' : true);

      const user = await app.prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

      const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
        identity: userId,
        name: user?.name ?? undefined,
        ttl: '2h',
      });
      at.addGrant({ room: id, roomJoin: true, canPublish, canSubscribe: true, canPublishData: true });
      const token = await at.toJwt();

      return reply.send({ token, url: config.LIVEKIT_URL, room: id, canPublish });
    },
  );
}
