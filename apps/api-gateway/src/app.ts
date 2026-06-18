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
import { usersRoutes } from './routes/users.js';
import { sessionsRoutes } from './routes/sessions.js';
import { coursesRoutes } from './routes/courses.js';
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
      openapi: '3.0.3',
      info: {
        title: 'EdTech Collab — API Gateway',
        description:
          'BC-3 Learning Management. REST API: регистрация/логин (JWT), сессии совместного редактирования, прокси подсказок к Hint Service. Клиент ходит только сюда; `/api/hints` требует заголовок Authorization.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${config.GATEWAY_PORT}`, description: 'Локальная разработка' }],
      tags: [
        { name: 'Health', description: 'Проверки для Docker / Kubernetes' },
        { name: 'Auth', description: 'Регистрация, логин, текущий пользователь (ФТ-12)' },
        { name: 'Users', description: 'Профиль пользователя: имя, аватар' },
        { name: 'Sessions', description: 'Сессии редактора (ФТ-2, ФТ-13)' },
        { name: 'Courses', description: 'Курсы, модули, уроки (BC-3 LMS)' },
        { name: 'Hints', description: 'Педагогические подсказки через Hint Service (BC-2)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Токен из POST /api/auth/login (поле accessToken).',
          },
        },
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
    },
  });

  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(usersRoutes, { prefix: '/api' });
  await app.register(sessionsRoutes, { prefix: '/api' });
  await app.register(coursesRoutes, { prefix: '/api' });
  await app.register(hintsRoutes, { prefix: '/api' });

  return app;
}
