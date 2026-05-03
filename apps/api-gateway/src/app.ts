/**
 * Сборка Fastify-инстанса. Вынесено в отдельный модуль, чтобы можно было
 * импортировать в тестах без запуска listen().
 */
import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { sessionsRoutes } from './routes/sessions.js';
import { hintsRoutes } from './routes/hints.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    trustProxy: true,
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: config.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'EdTech Collab — API Gateway',
        description: 'BC-3 Learning Management. REST API для авторизации, сессий, подсказок.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${config.GATEWAY_PORT}` }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(sessionsRoutes, { prefix: '/api' });
  await app.register(hintsRoutes, { prefix: '/api' });

  return app;
}
