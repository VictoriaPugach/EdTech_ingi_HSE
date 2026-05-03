/**
 * Прокси к Hint Service (BC-2).
 *
 * Согласно DDD-принципу из System Design §1.2 (Anti-Corruption Layer):
 * клиент НЕ ходит в Hint Service напрямую. Вместо этого API Gateway:
 *   - проверяет JWT (НФТ-5)
 *   - логирует запрос для аналитики
 *   - проксирует тело в Hint Service
 *   - возвращает ответ как есть
 *
 * Это позволяет потом подменить реализацию подсказок без изменения клиента.
 */
import type { FastifyInstance } from 'fastify';
import type { HintRequestDto, HintResponseDto } from '@edtech/shared';
import { config } from '../config.js';

export async function hintsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/hints',
    { preHandler: [app.authenticate] },
    async (req, reply): Promise<HintResponseDto | undefined> => {
      const body = req.body as HintRequestDto;

      try {
        const upstream = await fetch(`${config.HINT_SERVICE_URL}/api/hints`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          // 5 секунд — KPI <2 сек + запас на сетевые задержки между контейнерами
          signal: AbortSignal.timeout(5000),
        });

        if (!upstream.ok) {
          reply.code(502).send({ error: 'HintServiceError', status: upstream.status });
          return;
        }

        return (await upstream.json()) as HintResponseDto;
      } catch (err) {
        req.log.error({ err }, 'Hint service request failed');
        reply.code(503).send({ error: 'HintServiceUnavailable' });
        return;
      }
    },
  );
}
