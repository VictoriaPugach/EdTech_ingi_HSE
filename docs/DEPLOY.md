# Деплой на тестовый сервер

Пошаговая инструкция, как выложить платформу на реальный сервер, чтобы её можно
было открыть по ссылке (с рабочими камерой/микрофоном) и потом перезапускать.

> **Почему нельзя «просто по IP»:** камера и микрофон в браузере работают только
> на **HTTPS** (secure context). Поэтому нужен домен и TLS-сертификат. Ниже это
> делает Caddy автоматически (Let's Encrypt).

Архитектура тестового деплоя — один VPS + Docker. Наружу открыт только Caddy,
он раздаёт HTTPS и проксирует на сервисы. Видео — через LiveKit (рекомендуется
LiveKit Cloud, чтобы не возиться с UDP/TURN).

---

## 0. Что понадобится

- **Домен** (или поддомен), например `edtech.example.ru`.
- **VPS**: Ubuntu 22.04+, минимум 2 vCPU / 4 ГБ RAM / 20 ГБ диск (Yandex Cloud,
  Selectel, Timeweb, любой облачный провайдер).
- Аккаунт **LiveKit Cloud** (бесплатный тариф) — для видео. Альтернатива
  (self-host) — в приложении в конце.

---

## 1. DNS: направить домен на сервер

В панели вашего домена создайте **A-запись**:

```
edtech.example.ru   →   <публичный IP вашего VPS>
```

Подождите, пока запись разойдётся (обычно несколько минут):
`ping edtech.example.ru` должен показывать IP сервера.

---

## 2. LiveKit Cloud (видео)

1. Зарегистрируйтесь на https://cloud.livekit.io и создайте проект.
2. В разделе **Settings → Keys** возьмите три значения:
   - URL проекта вида `wss://<project>.livekit.cloud`
   - **API Key**
   - **API Secret**

Эти три значения позже впишете в `deploy/.env.prod` (`LIVEKIT_URL/KEY/SECRET`).
Больше для видео ничего настраивать не нужно — медиатрафик идёт в LiveKit Cloud.

---

## 3. Подготовить сервер

Зайдите на сервер по SSH и установите Docker:

```bash
ssh root@<IP-сервера>

# Docker + compose-плагин (официальный скрипт)
curl -fsSL https://get.docker.com | sh

# Открыть порты для веба (если включён ufw)
ufw allow 80
ufw allow 443
ufw allow OpenSSH
ufw --force enable

docker --version   # проверка
```

---

## 4. Забрать код на сервер

```bash
git clone <URL-вашего-репозитория> edtech
cd edtech
```

(или скопируйте проект на сервер через `scp` / `rsync`).

---

## 5. Заполнить секреты

```bash
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod
```

Заполните:

| Переменная | Значение |
|------------|----------|
| `DOMAIN` | `edtech.example.ru` |
| `ACME_EMAIL` | ваш email (для Let's Encrypt) |
| `PUBLIC_URL` | `https://edtech.example.ru` |
| `PUBLIC_WS_URL` | `wss://edtech.example.ru/ws` |
| `JWT_SECRET` | результат `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | надёжный пароль |
| `LIVEKIT_URL/KEY/SECRET` | из шага 2 |

> ⚠️ `deploy/.env.prod` содержит секреты — он в `.gitignore`, не коммитьте его.

---

## 6. Запустить

Из корня репозитория:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

Первая сборка занимает несколько минут (собираются образы, ставятся зависимости).
Caddy сам выпустит HTTPS-сертификат для домена при первом обращении.

Проверьте, что всё поднялось:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod ps
```

---

## 7. Применить миграции БД

При первом запуске создайте таблицы:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
  run --rm api-gateway npx prisma migrate deploy
```

---

## 8. Создать тестовые аккаунты

Откройте `https://edtech.example.ru` — должна открыться страница входа.
Зарегистрируйте преподавателя через вкладку **«Регистрация»** (роль «Я —
преподаватель»). Ученики регистрируются так же или заходят по ссылке-приглашению.

Готово. Преподаватель жмёт **«Создать занятие»**, копирует ссылку, ученики
открывают её — общий код, чат и видео работают.

---

## 9. Проверка

- `https://edtech.example.ru` открывается с зелёным замком (HTTPS).
- Вход/регистрация работают.
- На занятии: код синхронизируется, чат доставляет сообщения.
- Кнопка «Подключиться к видео» → браузер просит доступ к камере → видно участников.
- «Запустить» выполняет Python и показывает вывод.

---

## 10. Обновление и обслуживание

Выложить новую версию:

```bash
cd edtech
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
# если менялась схема БД:
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
  run --rm api-gateway npx prisma migrate deploy
```

Полезные команды (добавьте `--env-file deploy/.env.prod`):

```bash
# логи всех сервисов
docker compose -f deploy/docker-compose.prod.yml logs -f
# логи одного сервиса
docker compose -f deploy/docker-compose.prod.yml logs -f api-gateway
# остановить
docker compose -f deploy/docker-compose.prod.yml down
# остановить и удалить данные (БД!)
docker compose -f deploy/docker-compose.prod.yml down -v
```

> При смене `DOMAIN`/`PUBLIC_URL` обязательно пересоберите web (`up -d --build`):
> адрес API вшивается в бандл на этапе сборки.

---

## 11. Автодеплой по push в `main` (CI/CD)

Чтобы не заходить на сервер руками, настроен пайплайн в `.github/workflows/ci.yml`:
на каждый push в `main` GitHub Actions прогоняет линт/типы/тесты, **собирает Docker-образы
и пушит их в ghcr.io**, после чего заходит на VPS по SSH, тянет свежие образы и
перезапускает стек **без сборки на сервере** (`pull` → `up -d --no-build` → миграции).

Так слабый VPS не тратит ресурсы на сборку тяжёлого web-бандла — этим занимается CI.

### 11.1. Разовая подготовка сервера

```bash
ssh root@<IP-сервера>
git clone <URL-репозитория> ~/edtech     # путь по умолчанию, который ждёт пайплайн
cd ~/edtech
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod                     # заполнить как в шаге 5
```

`deploy/.env.prod` остаётся **только на сервере** (он в `.gitignore`). `git pull` в
пайплайне обновляет лишь конфиги стека (compose/Caddyfile), секреты не трогает.

Первый запуск сделайте вручную (чтобы Caddy выпустил сертификат и поднялась БД):

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
  run --rm api-gateway npx prisma migrate deploy
```

Дальше обновления будут прилетать автоматически по push в `main`.

### 11.2. SSH-ключ для деплоя

На своей машине сгенерируйте отдельный ключ для CI и положите публичную часть на сервер:

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key   # без пароля
ssh-copy-id -i deploy_key.pub root@<IP-сервера>          # или вручную в ~/.ssh/authorized_keys
```

Приватный ключ (`deploy_key`) целиком пойдёт в секрет `DEPLOY_SSH_KEY`.

### 11.3. Настройки в GitHub (репозиторий → Settings)

**Secrets** (Settings → Secrets and variables → Actions → *Secrets*):

| Секрет | Значение |
|--------|----------|
| `DEPLOY_SSH_HOST` | публичный IP VPS |
| `DEPLOY_SSH_USER` | пользователь SSH (например `root`) |
| `DEPLOY_SSH_KEY` | **приватный** ключ `deploy_key` целиком |
| `DEPLOY_SSH_PORT` | порт SSH, если не 22 (иначе можно не заводить) |

**Variables** (та же страница → *Variables*) — публичные адреса для сборки web-бандла:

| Переменная | Значение |
|------------|----------|
| `PUBLIC_URL` | `https://edtech.example.ru` |
| `PUBLIC_WS_URL` | `wss://edtech.example.ru/ws` |

> `GITHUB_TOKEN` заводить не нужно — он выдаётся пайплайну автоматически и
> используется и для пуша образов в ghcr.io, и для `docker login` на сервере.

### 11.4. Как это работает

1. Push в `main` → job'ы `typescript` и `python` проверяют код.
2. `docker-build` собирает 4 образа и пушит в `ghcr.io/<owner>/<repo>/<service>`
   с тегами `:<git-sha>` и `:latest`.
3. `deploy` заходит по SSH, делает `git pull` (конфиги), `docker login ghcr.io`,
   `docker compose pull` (тянет образы с тегом текущего sha) и
   `up -d --no-build`, затем `prisma migrate deploy`.

Откат: задеплоить старый коммит можно через **Actions → нужный запуск → Re-run jobs**,
либо вручную на сервере `IMAGE_TAG=<старый-sha> docker compose ... up -d --no-build`.

> Образы в ghcr.io по умолчанию приватные — сервер тянет их по `GITHUB_TOKEN`.
> Менять видимость на public не требуется.

---

## Типичные проблемы

| Симптом | Причина / решение |
|---------|-------------------|
| Сертификат не выпускается | DNS ещё не указывает на сервер, или закрыты порты 80/443. Проверьте A-запись и `ufw`. |
| Камера не включается | Страница не по HTTPS, либо браузер заблокировал доступ. Откройте именно `https://домен`. |
| `/s/<id>` даёт 404 при F5 | Обновите образ web — SPA-fallback в `apps/web/nginx.conf` уже включён. |
| Видео не подключается | Проверьте `LIVEKIT_URL/KEY/SECRET` в `.env.prod` и логи `api-gateway`. |
| Студент «неверный пароль» | Лишний пробел при автозаполнении (форма теперь обрезает пробелы — обновите образ). |

---

## Приложение: self-host LiveKit (без LiveKit Cloud)

Если нужно держать видео полностью у себя (как в ADR `video-livekit-sfu`):

1. Поднимите контейнер `livekit/livekit-server` на отдельном поддомене
   `livekit.edtech.example.ru` (A-запись на тот же сервер).
2. В конфиге LiveKit:
   - уберите `node_ip: 127.0.0.1`, поставьте `rtc.use_external_ip: true`;
   - откройте в firewall UDP-диапазон (например `50000–50100/udp`) и TCP `7881`.
3. Для школьных сетей, где UDP блокируется, поднимите **TURN over TLS на 443**
   (LiveKit это поддерживает) — иначе у части учеников видео не подключится.
4. Caddy выдаёт TLS для `livekit.edtech.example.ru` (signaling по WSS).
5. В `.env.prod`: `LIVEKIT_URL=wss://livekit.edtech.example.ru`, ключ/секрет — те же,
   что в конфиге сервера LiveKit.

Это заметно сложнее из-за media-сети (UDP/TURN), поэтому для теста рекомендуется
LiveKit Cloud.
