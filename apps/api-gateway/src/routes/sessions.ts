/**
 * Сессии совместного редактирования / онлайн-занятия (ФТ-2, ФТ-13).
 * Создание, получение по invite-коду, список «мои сессии», подключение (join).
 *
 * При join API Gateway определяет роль участника (HOST/EDITOR/VIEWER) и выпускает
 * сессионный JWT для WebSocket Realtime Sync (НФТ-5). Роли — см. ADR/доку по БД.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import type { SessionDto } from '@edtech/shared';
import {
  joinSessionSchema,
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

function makeInviteCode(): string {
  return randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
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
}
