/**
 * Аутентификация (ФТ-12).
 * MVP: регистрация + логин с bcryptjs-хэшем пароля и выдача JWT.
 * (bcryptjs — чистый JS, Docker/Alpine собирается без node-gyp и GitHub prebuilds.)
 * Полный flow (refresh-токены, восстановление пароля) — следующая итерация.
 */
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthTokensDto, UserDto } from '@edtech/shared';
import { authTokensSchema, simpleErrorSchema, userDtoSchema, validationErrorSchema } from '../openapi/schemas.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80),
  role: z.enum(['student', 'teacher']).default('student'),
  ageYears: z.number().int().min(5).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

const registerBodySchema = {
  type: 'object',
  required: ['email', 'password', 'name'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8, maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 80 },
    role: { type: 'string', enum: ['student', 'teacher'] },
    ageYears: { type: 'integer', minimum: 5, maximum: 100 },
  },
} as const;

const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
} as const;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/auth/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Регистрация',
        description: 'Создаёт пользователя и возвращает профиль (без автоматического логина в теле — только данные пользователя).',
        body: registerBodySchema,
        response: {
          201: userDtoSchema,
          400: validationErrorSchema,
          409: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
      }
      const { email, password, name, role, ageYears } = parsed.data;

      const existing = await app.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: 'EmailAlreadyExists' });
      }

      const passwordHash = bcrypt.hashSync(password, 12);
      const user = await app.prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: role.toUpperCase() as 'STUDENT' | 'TEACHER',
          ageYears,
        },
      });

      return reply.code(201).send(toDto(user));
    },
  );

  app.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Логин',
        description: 'Возвращает JWT (accessToken) и профиль пользователя.',
        body: loginBodySchema,
        response: {
          200: authTokensSchema,
          400: validationErrorSchema,
          401: simpleErrorSchema,
        },
      },
    },
    async (req, reply): Promise<AuthTokensDto | undefined> => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError' });
      }
      const { email, password } = parsed.data;

      const user = await app.prisma.user.findUnique({ where: { email } });
      if (!user) {
        reply.code(401).send({ error: 'InvalidCredentials' });
        return;
      }
      const ok = bcrypt.compareSync(password, user.passwordHash);
      if (!ok) {
        reply.code(401).send({ error: 'InvalidCredentials' });
        return;
      }

      const accessToken = app.jwt.sign({
        sub: user.id,
        role: user.role.toLowerCase() as 'student' | 'teacher' | 'admin',
      });

      return {
        accessToken,
        // 24h в секундах. В реальности нужно парсить JWT_ACCESS_TTL — оставлено как TODO.
        expiresIn: 24 * 60 * 60,
        user: toDto(user),
      };
    },
  );

  app.get(
    '/auth/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Текущий пользователь',
        description: 'Требует заголовок Authorization: Bearer <accessToken>.',
        security: [{ bearerAuth: [] }],
        response: {
          200: userDtoSchema,
          401: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user) {
        reply.code(404).send({ error: 'UserNotFound' });
        return;
      }
      return toDto(user);
    },
  );
}
