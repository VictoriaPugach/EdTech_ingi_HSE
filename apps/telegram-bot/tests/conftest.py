"""Обеспечивает TELEGRAM_BOT_TOKEN до импорта src.config в тестах (нет .env в CI)."""

import os

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-token")
