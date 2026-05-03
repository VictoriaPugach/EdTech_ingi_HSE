/**
 * Конфигурация сервиса. Читает .env, валидирует через zod, возвращает
 * типизированный объект. При отсутствии обязательных переменных — падает на старте
 * (fail-fast, не позволяет выкатить сервис в полусломанном состоянии).
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  GATEWAY_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://redis:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('24h'),
  HINT_SERVICE_URL: z.string().url().default('http://hint-service:4002'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[api-gateway] Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
