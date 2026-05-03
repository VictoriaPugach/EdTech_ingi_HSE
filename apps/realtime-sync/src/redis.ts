/**
 * Два Redis-клиента: pub (для публикации) и sub (для подписки).
 * Это требование ioredis — одно соединение либо публикует, либо подписано.
 *
 * Используется для НФТ-2 (горизонтальное масштабирование):
 * каждая нода Realtime Sync публикует CRDT-обновления в канал session:{id},
 * остальные ноды подписаны и рассылают своим клиентам.
 */
import IORedis from 'ioredis';
import { config } from './config.js';

export const pub = new IORedis(config.REDIS_URL, { lazyConnect: true });
export const sub = new IORedis(config.REDIS_URL, { lazyConnect: true });

export async function connectRedis(): Promise<void> {
  await Promise.all([pub.connect(), sub.connect()]);
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([pub.quit(), sub.quit()]);
}

export function channelForSession(sessionId: string): string {
  return `session:${sessionId}`;
}
