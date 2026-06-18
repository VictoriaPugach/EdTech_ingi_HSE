// =============================================================================
//  TC-04 (AC-02) — задержка доставки правок в совместном редактировании.
//  Цель: p95 задержки распространения правки между участниками < 100 мс.
//
//  Как мерим: в каждой «комнате» два клиента (как в реальном редакторе) —
//  писатель раз в INTERVAL мс добавляет в общий Y.Array метку времени, читатель
//  ловит её через CRDT-синхронизацию и считает (now - метка). Это и есть сквозная
//  задержка клиент→сервер→клиент (Yjs over WebSocket + Redis fan-out).
//
//  Запуск (Node 20+, из корня репозитория — использует зависимости проекта):
//    node load-tests/ws-latency.mjs
//    PAIRS=5 DURATION=180 WS_URL=ws://localhost:4001/ws node load-tests/ws-latency.mjs
//
//  realtime-sync должен быть запущен (локально :4001) и в dev-режиме без
//  обязательного токена (REQUIRE_AUTH не выставлен/false). PAIRS=5 → 10 соединений.
// =============================================================================
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WS from 'ws';

const WS_URL = process.env.WS_URL ?? 'ws://localhost:4001/ws';
const PAIRS = Number(process.env.PAIRS ?? 5); // комнат по 2 клиента = 10 соединений
const DURATION_S = Number(process.env.DURATION ?? 180);
const INTERVAL_MS = Number(process.env.INTERVAL ?? 200);
const P95_MS = Number(process.env.P95_MS ?? 100);

const latencies = [];

function waitConnected(provider) {
  return new Promise((resolve) => {
    if (provider.wsconnected) return resolve();
    const onStatus = ({ status }) => {
      if (status === 'connected') {
        provider.off('status', onStatus);
        resolve();
      }
    };
    provider.on('status', onStatus);
  });
}

async function makePair(room) {
  const writerDoc = new Y.Doc();
  const readerDoc = new Y.Doc();
  const writerProvider = new WebsocketProvider(WS_URL, room, writerDoc, { WebSocketPolyfill: WS });
  const readerProvider = new WebsocketProvider(WS_URL, room, readerDoc, { WebSocketPolyfill: WS });

  await Promise.all([waitConnected(writerProvider), waitConnected(readerProvider)]);

  const readerArr = readerDoc.getArray('ping');
  let seen = readerArr.length; // игнорируем то, что пришло при первичной синхронизации
  readerArr.observe(() => {
    const now = Date.now();
    const items = readerArr.toArray();
    for (let i = seen; i < items.length; i++) latencies.push(now - items[i]);
    seen = items.length;
  });

  const writerArr = writerDoc.getArray('ping');
  const timer = setInterval(() => writerArr.push([Date.now()]), INTERVAL_MS);

  return () => {
    clearInterval(timer);
    writerProvider.destroy();
    readerProvider.destroy();
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

console.log(`WS latency test → ${WS_URL}`);
console.log(`Комнат: ${PAIRS} (по 2 клиента = ${PAIRS * 2} соединений), длительность: ${DURATION_S} c\n`);

const stops = [];
for (let i = 0; i < PAIRS; i++) {
  stops.push(await makePair(`loadtest-${i}-${Date.now()}`));
}
console.log('Все клиенты подключены, измеряю…');

await new Promise((r) => setTimeout(r, DURATION_S * 1000));
stops.forEach((stop) => stop());

const sorted = [...latencies].sort((a, b) => a - b);
const p50 = percentile(sorted, 50);
const p95 = percentile(sorted, 95);
const p99 = percentile(sorted, 99);
const max = sorted[sorted.length - 1] ?? NaN;

console.log(`\nИзмерений задержки: ${sorted.length}`);
console.log(`  p50: ${p50?.toFixed(0)} мс`);
console.log(`  p95: ${p95?.toFixed(0)} мс   (порог ${P95_MS} мс)`);
console.log(`  p99: ${p99?.toFixed(0)} мс`);
console.log(`  max: ${max?.toFixed(0)} мс\n`);

const pass = sorted.length > 0 && p95 < P95_MS;
console.log(pass ? '✅ PASS: p95 задержки в пределах порога' : '❌ FAIL: p95 превышает порог или нет измерений');
process.exit(pass ? 0 : 1);
