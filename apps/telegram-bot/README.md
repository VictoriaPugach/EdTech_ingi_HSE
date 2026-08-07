# Telegram Bot — уведомления и быстрый доступ

Отдельный сервис на Python (aiogram 3), по аналогии с `hint-service`: без веб-сервера,
работает через **long polling** (не требует публичного HTTPS-адреса — удобно для dev
и для простого деплоя). Токен бота читается из переменных окружения через
`pydantic-settings`, ничего не хранится в коде.

## Что делает (MVP)

- `/start` — приветствие.
- `/joke` — тянет случайную шутку из внешнего
  [Joke Delivery API](https://www.freepublicapis.com/joke-delivery-api)
  (`official-joke-api.appspot.com/random_joke`) и присылает её setup/punchline
  отдельными сообщениями. Если API недоступен — бот отвечает понятной ошибкой,
  а не падает.
- Любое другое текстовое сообщение — эхо (бот отвечает тем же текстом).

Это каркас для будущей интеграции с API Gateway (уведомления об оценках/подсказках,
быстрый доступ к сессии и т. п.) — сама интеграция вне текущего MVP.

## Как устроено

```
src/
├── config.py    # Settings (pydantic-settings): TELEGRAM_BOT_TOKEN, JOKE_API_URL и др. из env
├── handlers.py  # Router: cmd_start (/start), cmd_joke (/joke), echo (остальные сообщения)
└── main.py      # Bot/Dispatcher, httpx.AsyncClient, long polling (dp.start_polling)
```

HTTP-клиент (`httpx.AsyncClient`) создаётся один раз в `main.py` и прокидывается
в хендлеры через встроенный DI aiogram (параметр `http_client` в сигнатуре хендлера).

## Запуск и проверка

```bash
# в составе стенда (нужен TELEGRAM_BOT_TOKEN в .env)
docker compose up -d telegram-bot

# тесты и линт
cd apps/telegram-bot
pytest -q
ruff check src tests && black --check src tests
```

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | да | Токен бота от [@BotFather](https://t.me/BotFather) |
| `LOG_LEVEL` | нет (default `info`) | Уровень логирования |
| `JOKE_API_URL` | нет (default `https://official-joke-api.appspot.com/random_joke`) | Эндпоинт Joke Delivery API для `/joke` |
