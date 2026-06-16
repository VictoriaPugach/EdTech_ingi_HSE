/**
 * Entry point — HTTP-сервер с healthcheck + WebSocket Upgrade на /ws/:sessionId.
 *
 * URL клиента: ws://host:4001/ws?session=<sessionId>
 *           или ws://host:4001/ws/<sessionId>  (оба варианта поддерживаются)
 */
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { config } from './config.js';
import { logger } from './logger.js';
import { connectRedis, disconnectRedis } from './redis.js';
import { getOrCreateRoom, getActiveRoomCount, destroyAllRooms } from './crdt/room.js';
import { verifyToken, type ConnectionIdentity } from './auth.js';

const startedAt = Date.now();

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'realtime-sync',
        version: '0.1.0',
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        activeRooms: getActiveRoomCount(),
      }),
    );
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'NotFound' }));
});

const wss = new WebSocketServer({ noServer: true });

function extractSessionId(url: string | undefined): string | null {
  if (!url) return null;
  const u = new URL(url, 'http://placeholder');
  if (!u.pathname.startsWith(config.REALTIME_WS_PATH)) return null;

  // Приоритет: ?session= → последний сегмент пути
  const fromQuery = u.searchParams.get('session');
  if (fromQuery) return fromQuery;

  const tail = u.pathname.slice(config.REALTIME_WS_PATH.length).replace(/^\/+/, '');
  return tail || null;
}

function extractToken(url: string | undefined): string | null {
  if (!url) return null;
  return new URL(url, 'http://placeholder').searchParams.get('token');
}

/**
 * Аутентификация WS-подключения (НФТ-5). Возвращает identity участника либо
 * строку с причиной отказа. В dev (REQUIRE_AUTH=false) подключение без токена
 * разрешено как анонимный редактор (см. NIR).
 */
function authenticate(sessionId: string, token: string | null): ConnectionIdentity | { reject: string } {
  if (!token) {
    if (config.REQUIRE_AUTH) return { reject: 'missing token' };
    return { userId: 'anonymous', role: 'EDITOR' };
  }
  const claims = verifyToken(token);
  if (!claims) return { reject: 'invalid token' };
  if (claims.sessionId && claims.sessionId !== sessionId) return { reject: 'token/session mismatch' };
  return { userId: claims.sub, name: claims.name, role: claims.sessionRole ?? 'EDITOR' };
}

httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
  const sessionId = extractSessionId(req.url);
  if (!sessionId) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  // JWT-валидация сессионного токена (НФТ-5). Токен выпускает API Gateway
  // (POST /api/sessions/:id/join) и кладёт роль участника в claims.
  const auth = authenticate(sessionId, extractToken(req.url));
  if ('reject' in auth) {
    logger.warn({ sessionId, reason: auth.reject }, 'WS auth rejected');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    const room = getOrCreateRoom(sessionId, {
      onUpdate: (sid, _update, _doc) => {
        // TODO: дёрнуть Hint Service для AST-анализа (debounce 500-700мс).
        // Также сохранить снапшот раз в N операций (ФТ-5).
        logger.debug({ sessionId: sid }, 'Y.Doc updated');
      },
    });
    room.addConnection(ws, auth);
    logger.info(
      { sessionId, userId: auth.userId, role: auth.role, totalConns: room.conns.size, totalRooms: getActiveRoomCount() },
      'Client connected',
    );
  });
});

const shutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Shutdown signal received');
  destroyAllRooms();
  wss.close();
  httpServer.close();
  await disconnectRedis();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

await connectRedis();
httpServer.listen(config.REALTIME_PORT, '0.0.0.0', () => {
  logger.info(
    `Realtime Sync started on :${config.REALTIME_PORT}${config.REALTIME_WS_PATH}`,
  );
});
