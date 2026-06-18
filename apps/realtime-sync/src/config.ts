import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  REALTIME_PORT: z.coerce.number().int().positive().default(4001),
  REALTIME_WS_PATH: z.string().default('/ws'),
  REDIS_URL: z.string().url().default('redis://redis:6379'),
  DATABASE_URL: z.string().url().optional(),
  // Общий с API Gateway секрет для верификации сессионного JWT (НФТ-5).
  JWT_SECRET: z.string().default('change-me-in-production-use-32-bytes-of-randomness'),
  // Требовать валидный токен на WS-подключении. В dev — false (открытый доступ,
  // см. NIR), в prod — true.
  REQUIRE_AUTH: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[realtime-sync] Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
