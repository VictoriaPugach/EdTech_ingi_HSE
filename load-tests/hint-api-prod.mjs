// =============================================================================
//  Нагрузочный тест Hint Service ЧЕРЕЗ ПРОД (полный путь Caddy → gateway → hint).
//  В отличие от hint-api.mjs (бьёт в hint-service напрямую), здесь запрос идёт на
//  публичный https://kidcoded.ru/api/hints и требует JWT — поэтому сначала логин.
//
//  Запуск (Node 20+):
//    node load-tests/hint-api-prod.mjs
//    BASE=https://kidcoded.ru VUS=20 ITER=30 node load-tests/hint-api-prod.mjs
//
//  Заводит один служебный аккаунт loadtest@kidcoded.ru (если ещё нет) и им логинится.
// =============================================================================
import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE ?? 'https://kidcoded.ru';
const VUS = Number(process.env.VUS ?? 20);
const ITER = Number(process.env.ITER ?? 30);
const P95_MS = Number(process.env.P95_MS ?? 2000);

const CREDS = { email: 'loadtest@kidcoded.ru', password: 'loadtest12345', name: 'Load Test', role: 'student' };
const PAYLOAD = JSON.stringify({
  code: 'print("Hello"\nfor i in range(3)\n  print(i)',
  language: 'python',
  userAge: 12,
});

async function jsonPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function getToken() {
  // Регистрируем служебного пользователя (409 = уже есть — это нормально), затем логинимся.
  await jsonPost('/api/auth/register', CREDS).catch(() => {});
  const res = await jsonPost('/api/auth/login', { email: CREDS.email, password: CREDS.password });
  if (!res.ok) throw new Error(`login HTTP ${res.status}`);
  return (await res.json()).accessToken;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function oneRequest(token) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/hints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: PAYLOAD,
  });
  await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return performance.now() - t0;
}

async function vu(token, samples, errors) {
  for (let i = 0; i < ITER; i++) {
    try {
      samples.push(await oneRequest(token));
    } catch (e) {
      errors.push(String(e));
    }
  }
}

console.log(`Hint API (через прод) → ${BASE}/api/hints`);
const token = await getToken();
console.log(`Аутентифицирован. Параллельных пользователей: ${VUS}, запросов каждому: ${ITER}\n`);

const samples = [];
const errors = [];
const wall0 = performance.now();
await Promise.all(Array.from({ length: VUS }, () => vu(token, samples, errors)));
const wallSec = (performance.now() - wall0) / 1000;

const sorted = [...samples].sort((a, b) => a - b);
const p95 = percentile(sorted, 95);
console.log(`Успешных: ${samples.length}, ошибок: ${errors.length}, ${(samples.length / wallSec).toFixed(1)} req/s`);
console.log(`  p50: ${percentile(sorted, 50).toFixed(0)} мс`);
console.log(`  p95: ${p95.toFixed(0)} мс   (порог ${P95_MS} мс)`);
console.log(`  p99: ${percentile(sorted, 99).toFixed(0)} мс`);
console.log(`  max: ${(sorted[sorted.length - 1] ?? NaN).toFixed(0)} мс\n`);

const pass = errors.length === 0 && p95 < P95_MS;
console.log(pass ? '✅ PASS' : '❌ FAIL');
process.exit(pass ? 0 : 1);
