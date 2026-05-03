/**
 * Сессии совместного редактирования (ФТ-2, ФТ-13).
 * MVP: создать сессию, получить по invite-коду, список «мои сессии».
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import type { SessionDto } from '@edtech/shared';

const createSchema = z.object({
  title: z.string().min(1).max(120),
  language: z.enum(['python', 'javascript']).default('python'),
});

function makeInviteCode(): string {
  // 6-байт base32-ish, читабельный человеку (без 0/O/1/l).
  return randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
}

function toDto(s: {
  id: string;
  ownerId: string;
  title: string;
  language: string;
  inviteCode: string;
  isActive: boolean;
  createdAt: Date;
}): SessionDto {
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    language: s.language.toLowerCase() as SessionDto['language'],
    inviteCode: s.inviteCode,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
  };
}

export async function sessionsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sessions', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
    }

    const session = await app.prisma.session.create({
      data: {
        ownerId: req.user.sub,
        title: parsed.data.title,
        language: parsed.data.language.toUpperCase() as 'PYTHON' | 'JAVASCRIPT',
        inviteCode: makeInviteCode(),
      },
    });

    return reply.code(201).send(toDto(session));
  });

  app.get('/sessions', { preHandler: [app.authenticate] }, async (req) => {
    const list = await app.prisma.session.findMany({
      where: { ownerId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return list.map(toDto);
  });

  app.get('/sessions/by-invite/:code', async (req, reply) => {
    const { code } = req.params as { code: string };
    const session = await app.prisma.session.findUnique({ where: { inviteCode: code } });
    if (!session || !session.isActive) {
      return reply.code(404).send({ error: 'SessionNotFoundOrClosed' });
    }
    return toDto(session);
  });
}
