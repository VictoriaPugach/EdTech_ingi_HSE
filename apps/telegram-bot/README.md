# Telegram Bot — уведомления и быстрый доступ

Отдельный сервис на Python (aiogram 3), по аналогии с `hint-service`: без веб-сервера,
работает через **long polling** (не требует публичного HTTPS-адреса — удобно для dev
и для простого деплоя). Токен бота читается из переменных окружения через
`pydantic-settings`, ничего не хранится в коде.

## Что делает (MVP)

- `/start` — приветствие.
- Любое другое текстовое сообщение — эхо (бот отвечает тем же текстом).

Это каркас для будущей интеграции с API Gateway (уведомления об оценках/подсказках,
быстрый доступ к сессии и т. п.) — сама интеграция вне текущего MVP.

## Как устроено

```
src/
├── config.py    # Settings (pydantic-settings): TELEGRAM_BOT_TOKEN и др. из env
├── handlers.py  # Router: cmd_start (/start), echo (остальные сообщения)
└── main.py      # Bot/Dispatcher, long polling (dp.start_polling)
```

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
