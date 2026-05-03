/**
 * Entry point — стартует Fastify-сервер на 0.0.0.0:GATEWAY_PORT.
 */
import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'Shutdown signal received');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: config.GATEWAY_PORT, host: '0.0.0.0' });
  app.log.info(`API Gateway started on :${config.GATEWAY_PORT} — Swagger at /docs`);
} catch (err) {
  app.log.fatal({ err }, 'Failed to start API Gateway');
  process.exit(1);
}
