/**
 * Профиль пользователя (BC-3 LMS).
 * PUT /api/users/me — частичное обновление имени и аватара текущего пользователя.
 * Требует Authorization: Bearer <accessToken>.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { UserDto } from '@edtech/shared';
import { simpleErrorSchema, userDtoSchema, validationErrorSchema } from '../openapi/schemas.js';

// Аватар приходит как data URL уже ужатой картинки (≤256px). Ограничиваем размер,
// чтобы не положить в БД мегабайтные строки. ~700 КБ хватает с запасом.
const MAX_AVATAR_CHARS = 700_000;

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    avatarUrl: z.string().max(MAX_AVATAR_CHARS).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.avatarUrl !== undefined, {
    message: 'Nothing to update',
  });

const updateProfileBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 80 },
    avatarUrl: { type: ['string', 'null'], maxLength: MAX_AVATAR_CHARS },
  },
} as const;

function toDto(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  avatarUrl?: string | null;
}): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role.toLowerCase() as UserDto['role'],
    createdAt: u.createdAt.toISOString(),
    avatarUrl: u.avatarUrl ?? null,
  };
}

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.put(
    '/users/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Обновить профиль',
        description: 'Меняет имя и/или аватар текущего пользователя.',
        security: [{ bearerAuth: [] }],
        body: updateProfileBodySchema,
        response: {
          200: userDtoSchema,
          400: validationErrorSchema,
          401: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
      }
      const { name, avatarUrl } = parsed.data;

      try {
        const user = await app.prisma.user.update({
          where: { id: req.user.sub },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(avatarUrl !== undefined ? { avatarUrl } : {}),
          },
        });
        return toDto(user);
      } catch {
        // Prisma P2025 — запись не найдена (например, пользователь удалён).
        reply.code(404).send({ error: 'UserNotFound' });
        return;
      }
    },
  );
}
