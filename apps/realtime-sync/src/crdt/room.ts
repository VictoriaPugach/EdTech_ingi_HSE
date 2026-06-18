/**
 * Y.Doc per-room manager + WebSocket-протокол Yjs (sync + awareness).
 *
 * Реализация повторяет официальный y-websocket server,
 * но специально написана вручную (а не через `y-websocket/bin/utils`),
 * чтобы:
 *   - был полный контроль над auth/lifecycle (для НФТ-5);
 *   - можно было встроить Redis Pub/Sub broadcast (НФТ-2);
 *   - можно было вешать хуки `onUpdate` для триггера Hint Service (BC-2).
 *
 * Yjs протокол (см. https://github.com/yjs/y-protocols):
 *   messageType byte:
 *     0 → SYNC      (sync step 1/2/update)
 *     1 → AWARENESS (cursor / selection / user info)
 */

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { WebSocket } from 'ws';
import { logger } from '../logger.js';
import { pub, sub, channelForSession } from '../redis.js';
import type { ConnectionIdentity } from '../auth.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

export interface RoomOptions {
  /**
   * Хук, вызываемый при каждом обновлении Y.Doc (после применения).
   * Можно использовать для триггера AST-анализа в Hint Service (BC-2),
   * сохранения снапшотов и т. п.
   */
  onUpdate?: (sessionId: string, update: Uint8Array, doc: Y.Doc) => void;
}

export class Room {
  readonly sessionId: string;
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  readonly conns = new Set<WebSocket>();
  private readonly identities = new Map<WebSocket, ConnectionIdentity>();
  private readonly options: RoomOptions;
  private readonly redisChannel: string;
  private readonly onRedisMessage: (channel: string, message: Buffer) => void;

  constructor(sessionId: string, options: RoomOptions = {}) {
    this.sessionId = sessionId;
    this.options = options;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.redisChannel = channelForSession(sessionId);

    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.broadcastSyncUpdate(update, origin);
      this.options.onUpdate?.(this.sessionId, update, this.doc);

      if (origin !== 'redis') {
        // Публикуем для других нод (НФТ-2). origin=redis означает,
        // что апдейт уже пришёл из шины — повторно не публикуем.
        // ioredis принимает Buffer как payload в publish().
        pub.publish(this.redisChannel, Buffer.from(update) as unknown as string).catch((err: unknown) => {
          logger.error({ err, sessionId: this.sessionId }, 'Failed to publish update to Redis');
        });
      }
    });

    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        this.broadcastAwareness([...added, ...updated, ...removed], origin);
      },
    );

    this.onRedisMessage = (channel: string, message: Buffer) => {
      if (channel !== this.redisChannel) return;
      // Применяем апдейт от другой ноды как локальный, помечая origin='redis'
      Y.applyUpdate(this.doc, message, 'redis');
    };
    sub.subscribe(this.redisChannel).catch((err) => {
      logger.error({ err, sessionId }, 'Failed to subscribe to Redis channel');
    });
    sub.on('messageBuffer', this.onRedisMessage);
  }

  // -----------------------------------------------------------------
  // Подключение клиента
  // -----------------------------------------------------------------

  addConnection(ws: WebSocket, identity?: ConnectionIdentity): void {
    this.conns.add(ws);
    if (identity) this.identities.set(ws, identity);

    // Sync step 1 — отправляем клиенту state vector, чтобы он догнался
    {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, this.doc);
      ws.send(encoding.toUint8Array(encoder));
    }
    // Отправляем текущее awareness-состояние всех уже подключённых
    if (this.awareness.getStates().size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, [...this.awareness.getStates().keys()]),
      );
      ws.send(encoding.toUint8Array(encoder));
    }

    ws.on('message', (data: Buffer) => this.handleMessage(ws, data));
    ws.on('close', () => this.removeConnection(ws));
    ws.on('error', (err) => {
      logger.warn({ err, sessionId: this.sessionId }, 'WebSocket error');
      this.removeConnection(ws);
    });
  }

  removeConnection(ws: WebSocket): void {
    if (this.conns.has(ws)) {
      this.conns.delete(ws);
      this.identities.delete(ws);
      // Чистим awareness-состояние клиента
      const controlledIds = (ws as WebSocket & { __awarenessId?: number }).__awarenessId;
      if (controlledIds !== undefined) {
        awarenessProtocol.removeAwarenessStates(this.awareness, [controlledIds], null);
      }
    }
  }

  // -----------------------------------------------------------------
  // Входящее сообщение от клиента
  // -----------------------------------------------------------------

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          const syncType = decoding.readVarUint(decoder);
          const role = this.identities.get(ws)?.role ?? 'EDITOR';

          if (syncType === syncProtocol.messageYjsSyncStep1) {
            // Запрос состояния — безопасен для чтения, отвечаем даже VIEWER'у.
            syncProtocol.readSyncStep1(decoder, encoder, this.doc);
          } else if (role !== 'VIEWER') {
            // Применяем правки только тем, у кого есть право редактирования.
            if (syncType === syncProtocol.messageYjsSyncStep2) {
              syncProtocol.readSyncStep2(decoder, this.doc, ws);
            } else if (syncType === syncProtocol.messageYjsUpdate) {
              syncProtocol.readUpdate(decoder, this.doc, ws);
            }
          }
          // syncProtocol запишет ответ в encoder; шлём, только если есть полезная нагрузка
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        }
        case MESSAGE_AWARENESS: {
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            ws,
          );
          break;
        }
        default:
          logger.warn({ messageType, sessionId: this.sessionId }, 'Unknown message type');
      }
    } catch (err) {
      logger.error({ err, sessionId: this.sessionId }, 'Failed to handle WS message');
    }
  }

  // -----------------------------------------------------------------
  // Broadcast
  // -----------------------------------------------------------------

  private broadcastSyncUpdate(update: Uint8Array, origin: unknown): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    for (const conn of this.conns) {
      // Не отправляем обратно тому, кто прислал апдейт (избегаем эха)
      if (conn !== origin) this.safeSend(conn, message);
    }
  }

  private broadcastAwareness(changedClients: number[], origin: unknown): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
    );
    const message = encoding.toUint8Array(encoder);
    for (const conn of this.conns) {
      if (conn !== origin) this.safeSend(conn, message);
    }
  }

  private safeSend(ws: WebSocket, data: Uint8Array): void {
    if (ws.readyState !== ws.OPEN) return;
    try {
      ws.send(data);
    } catch (err) {
      logger.warn({ err, sessionId: this.sessionId }, 'Failed to send to client');
    }
  }

  // -----------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------

  destroy(): void {
    sub.off('messageBuffer', this.onRedisMessage);
    sub.unsubscribe(this.redisChannel).catch(() => undefined);
    for (const conn of this.conns) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.conns.clear();
    this.doc.destroy();
  }
}

// ----------------------------------------------------------------------------
// Реестр всех активных комнат
// ----------------------------------------------------------------------------

const rooms = new Map<string, Room>();

export function getOrCreateRoom(sessionId: string, options?: RoomOptions): Room {
  let room = rooms.get(sessionId);
  if (!room) {
    room = new Room(sessionId, options);
    rooms.set(sessionId, room);
    logger.info({ sessionId }, 'Room created');
  }
  return room;
}

export function getActiveRoomCount(): number {
  return rooms.size;
}

export function destroyAllRooms(): void {
  for (const [, room] of rooms) room.destroy();
  rooms.clear();
}
