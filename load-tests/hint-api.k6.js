// =============================================================================
//  TC-08 (AC-03): нагрузочный тест Hint Service.
//  Цель: p95 времени ответа < 2000 мс при 20 одновременных пользователях.
//
//  Запуск (нужен установленный k6 — https://k6.io/docs/get-started/installation/):
//    k6 run load-tests/hint-api.k6.js
//    HINT_URL=http://SERVER:4002/api/hints k6 run load-tests/hint-api.k6.js
//
//  Hint Service должен быть запущен (локально: docker compose up hint-service,
//  слушает :4002). Тест бьёт напрямую в сервис, без авторизации.
// =============================================================================
import http from 'k6/http';
import { check } from 'k6';

const HINT_URL = __ENV.HINT_URL || 'http://localhost:4002/api/hints';

export const options = {
  scenarios: {
    hints: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 20),
      iterations: Number(__ENV.ITER || 30), // 20 VU × 30 = 600 запросов
      maxDuration: '2m',
    },
  },
  thresholds: {
    // Критерий приёмки AC-03: 95-й перцентиль < 2 секунд.
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

// Код с типовыми ошибками (незакрытая скобка + пропущенное двоеточие) — TC-05.
const PAYLOAD = JSON.stringify({
  code: 'print("Hello"\nfor i in range(3)\n  print(i)',
  language: 'python',
  userAge: 12,
});

export default function () {
  const res = http.post(HINT_URL, PAYLOAD, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'есть подсказки': (r) => {
      try {
        return Array.isArray(r.json('hints'));
      } catch {
        return false;
      }
    },
  });
}
