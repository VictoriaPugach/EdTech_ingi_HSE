/**
 * Подключение JWT-плагина и декоратор `app.authenticate`,
 * который можно вешать на любой route как `preHandler` (ФТ-12, НФТ-5).
 */
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      req: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    // Базовый пользовательский токен + опциональные session-claims, которые
    // добавляются в сессионный токен при POST /api/sessions/:id/join (НФТ-5).
    payload: {
      sub: string;
      role: 'student' | 'teacher' | 'admin';
      name?: string;
      sessionId?: string;
      sessionRole?: 'HOST' | 'EDITOR' | 'VIEWER';
      mode?: 'GROUP' | 'SINGLE';
    };
    user: { sub: string; role: 'student' | 'teacher' | 'admin' };
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
  });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
