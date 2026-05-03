/**
 * Fastify-плагин: единый PrismaClient на весь процесс, доступен как `app.prisma`.
 * Корректно закрывает соединение при graceful shutdown.
 */
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient({
    log: app.log.level === 'debug' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

  await prisma.$connect();
  app.decorate('prisma', prisma);

  app.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
});
