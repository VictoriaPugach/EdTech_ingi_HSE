/**
 * Healthcheck endpoint — для Docker / Kubernetes liveness/readiness probes.
 */
import type { FastifyInstance } from 'fastify';
import type { HealthDto } from '@edtech/shared';
import { healthResponseSchema } from '../openapi/schemas.js';

const startedAt = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Healthcheck',
        description: 'Liveness/readiness: статус сервиса и проверка подключения к БД.',
        response: { 200: healthResponseSchema },
      },
    },
    async (): Promise<HealthDto> => {
      const checks: Record<string, 'ok' | 'fail'> = {};
      try {
        await app.prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
      } catch {
        checks.database = 'fail';
      }

      const allOk = Object.values(checks).every((v) => v === 'ok');

      return {
        status: allOk ? 'ok' : 'degraded',
        service: 'api-gateway',
        version: '0.1.0',
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        checks,
      };
    },
  );
}
