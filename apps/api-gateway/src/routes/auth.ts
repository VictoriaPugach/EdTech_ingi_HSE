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
}): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role.toLowerCase() as UserDto['role'],
    createdAt: u.createdAt.toISOString(),
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/register', async (req, reply) => {
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
  });

  app.post('/auth/login', async (req, reply): Promise<AuthTokensDto | undefined> => {
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
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      reply.code(404).send({ error: 'UserNotFound' });
      return;
    }
    return toDto(user);
  });
}
