// =============================================================================
//  TC-08 (AC-03) — Node-вариант нагрузочного теста Hint Service (без k6).
//  Запуск (Node 20+, ничего ставить не нужно):
//    node load-tests/hint-api.mjs
//    VUS=20 ITER=30 HINT_URL=http://localhost:4002/api/hints node load-tests/hint-api.mjs
//
//  Считает p50/p95/p99 времени ответа и сверяет p95 с порогом 2000 мс.
//  Hint Service должен быть запущен (локально слушает :4002).
// =============================================================================
import { performance } from 'node:perf_hooks';

const HINT_URL = process.env.HINT_URL ?? 'http://localhost:4002/api/hints';
const VUS = Number(process.env.VUS ?? 20);
const ITER = Number(process.env.ITER ?? 30);
const P95_MS = Number(process.env.P95_MS ?? 2000);

const PAYLOAD = JSON.stringify({
  code: 'print("Hello"\nfor i in range(3)\n  print(i)',
  language: 'python',
  userAge: 12,
});

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function oneRequest() {
  const t0 = performance.now();
  const res = await fetch(HINT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: PAYLOAD,
  });
  await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return performance.now() - t0;
}

async function vu(samples, errors) {
  for (let i = 0; i < ITER; i++) {
    try {
      samples.push(await oneRequest());
    } catch (e) {
      errors.push(String(e));
    }
  }
}

console.log(`Hint API load test → ${HINT_URL}`);
console.log(`Параллельных «пользователей»: ${VUS}, запросов на каждого: ${ITER} (всего ${VUS * ITER})\n`);

const samples = [];
const errors = [];
const wall0 = performance.now();
await Promise.all(Array.from({ length: VUS }, () => vu(samples, errors)));
const wallSec = (performance.now() - wall0) / 1000;

const sorted = [...samples].sort((a, b) => a - b);
const p50 = percentile(sorted, 50);
const p95 = percentile(sorted, 95);
const p99 = percentile(sorted, 99);
const max = sorted[sorted.length - 1] ?? NaN;
const rps = samples.length / wallSec;

console.log(`Успешных запросов: ${samples.length}, ошибок: ${errors.length}`);
console.log(`Длительность: ${wallSec.toFixed(1)} c, пропускная способность: ${rps.toFixed(1)} req/s\n`);
console.log(`  p50: ${p50.toFixed(0)} мс`);
console.log(`  p95: ${p95.toFixed(0)} мс   (порог ${P95_MS} мс)`);
console.log(`  p99: ${p99.toFixed(0)} мс`);
console.log(`  max: ${max.toFixed(0)} мс\n`);

const pass = errors.length === 0 && p95 < P95_MS;
console.log(pass ? '✅ PASS: p95 в пределах порога' : '❌ FAIL: p95 превышает порог или были ошибки');
process.exit(pass ? 0 : 1);
