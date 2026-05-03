# EdTech Collab — Educational Platform for Collaborative Programming

> Образовательная веб-платформа для совместного программирования детей (6–17 лет) с
> бесконфликтным редактированием на основе **CRDT** и адаптивными **педагогическими подсказками**.
>
> Курсовой проект магистратуры СПИ (НИУ ВШЭ, департамент программной инженерии),
> заказчик — образовательная организация **«Инжиниум»**.

## Содержание

- [Архитектура](#архитектура)
- [Технологический стек](#технологический-стек)
- [Структура репозитория](#структура-репозитория)
- [Быстрый старт (dev)](#быстрый-старт-dev)
- [Сервисы и порты](#сервисы-и-порты)
- [Команды разработки](#команды-разработки)

---

## Архитектура

Модульный монолит с тремя изолированными сервисами (Modular Monolith / Service-Oriented),
готовый к эволюции в микросервисы. Декомпозиция выполнена по принципам **DDD**:

| Bounded Context | Сервис | Ответственность |
|---|---|---|
| **BC-1 Collaborative Editing** | `realtime-sync` (Node.js) | CRDT-синхронизация на Yjs, WebSocket, awareness, snapshots |
| **BC-2 Pedagogical Analysis** | `hint-service` (Python)   | AST-анализ (Tree-sitter), детекция типовых ошибок, генерация подсказок |
| **BC-3 Learning Management**   | `api-gateway` (Node.js)   | Auth (JWT), сессии, проекты, геймификация, маршрутизация |
|                                | `web` (React SPA)         | Клиент: редактор кода (CodeMirror 6), UI, геймификация |

Контексты общаются **только** через API Gateway или события (Redis Pub/Sub) —
никаких прямых импортов моделей между сервисами.

```
                ┌─────────────┐
                │   Browser   │  React + CodeMirror 6 + Yjs
                └──────┬──────┘
                       │ HTTPS / WSS
        ┌──────────────┼─────────────┐
        ▼              ▼             ▼
   API Gateway    Realtime Sync   (опц.) static
   (Fastify)      (ws + Yjs)      (Vite preview)
        │              │
        │              ├─→ Redis (Pub/Sub, awareness)
        │              ▼
        │          Snapshots → PostgreSQL
        │
        ├─→ PostgreSQL (users, sessions, gamification)
        │
        └─→ Hint Service (FastAPI + Tree-sitter)
```

## Технологический стек

| Слой | Технология | Назначение |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS 3, CodeMirror 6, Yjs 13, y-websocket | SPA, редактор, CRDT-клиент |
| **Realtime Sync (BC-1)** | Node.js 20, `ws`, Yjs 13, `y-protocols` | WebSocket-сервер, broadcast |
| **API Gateway / LMS (BC-3)** | Node.js 20, Fastify 4, Prisma 5, JWT | REST API, аутентификация, проксирование |
| **Hint Service (BC-2)** | Python 3.12, FastAPI, Tree-sitter, uvicorn | AST-анализ, подсказки |
| **Базы данных** | PostgreSQL 16, Redis 7 | Хранение данных, Pub/Sub |
| **Инфраструктура** | Docker Compose (dev), Kubernetes (prod, planned) | Контейнеризация, оркестрация |
| **CI/CD** | GitHub Actions | Линт, тесты, сборка образов |
| **Тестирование** | Vitest (TS), Pytest (Py), Playwright (E2E), k6 (load) | Все уровни |


## Структура репозитория

```
edtech-collab/
├── apps/
│   ├── web/                  # BC-3 Client (React + Vite + CodeMirror 6 + Yjs)
│   ├── realtime-sync/        # BC-1 (Node.js + ws + Yjs)
│   ├── api-gateway/          # BC-3 (Node.js + Fastify + Prisma + JWT)
│   └── hint-service/         # BC-2 (Python + FastAPI + Tree-sitter)
├── packages/
│   └── shared/               # Общие TypeScript-типы
├── infra/
│   └── postgres/init.sql     # Bootstrap для PostgreSQL
├── .github/workflows/        # CI
├── docker-compose.yml        # Dev-окружение (все сервисы + БД)
├── .env.example              # Шаблон переменных окружения
├── package.json              # npm workspaces root
└── tsconfig.base.json        # Общий TS-конфиг
```

## Быстрый старт (dev)

### Требования

- **Docker** 24+ и **Docker Compose** v2
- **Node.js** 20+ и **npm** 10+ — _только для редактирования и линтинга вне контейнеров_
- **Python** 3.11+ — _аналогично, опционально_

### Запуск

```bash
# 1) Скопировать переменные окружения
cp .env.example .env

# 2) Поднять весь стек (web + 3 сервиса + Postgres + Redis)
docker compose up --build

# 3) В новом терминале — применить миграции БД
docker compose exec api-gateway npx prisma migrate dev --name init
```

После запуска:

- Web SPA  → http://localhost:5173
- API Gateway (Swagger UI) → http://localhost:4000/docs
- Realtime Sync (healthcheck) → http://localhost:4001/health
- Hint Service (Swagger UI) → http://localhost:4002/docs

### Локальная установка для редактирования (опционально)

```bash
npm install                 # установит зависимости всех TS-пакетов
npm run typecheck           # проверка типов
npm run lint                # ESLint
npm run format              # Prettier
```

## Сервисы и порты

| Сервис | Порт (host) | Endpoint | Назначение |
|---|---|---|---|
| `web` | 5173 | http://localhost:5173 | React SPA (Vite dev server, HMR) |
| `api-gateway` | 4000 | http://localhost:4000 | REST API + Swagger UI на `/docs` |
| `realtime-sync` | 4001 | ws://localhost:4001/ws | WebSocket для Yjs-синхронизации |
| `hint-service` | 4002 | http://localhost:4002 | REST API подсказок + Swagger на `/docs` |
| `postgres` | 5432 | postgresql://… | Основная БД |
| `redis` | 6379 | redis://… | Pub/Sub для CRDT, кэш |

## Команды разработки

```bash
# Запуск всего dev-стека
npm run dev

# Полная остановка
npm run dev:down

# Остановка с удалением volumes (чистый старт)
npm run dev:clean

# Логи всех сервисов
npm run dev:logs

# Сборка production-образов
npm run build

# Тесты
npm run test
```

### Работа с конкретным сервисом

```bash
# Перезапустить только realtime
docker compose restart realtime-sync

# Открыть shell внутри API Gateway
docker compose exec api-gateway sh

# Запустить миграции Prisma
docker compose exec api-gateway npx prisma migrate dev
```

---

**Автор:** Пугач Виктория Павловна, МСПИН251
**Научный руководитель:** Брейман А. Д., доцент департамента ПИ
