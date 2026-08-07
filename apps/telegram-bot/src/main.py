"""Точка входа Telegram-бота. Long polling (aiogram 3)."""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from .config import settings
from .handlers import router

logger = logging.getLogger(__name__)


async def main() -> None:
    logging.basicConfig(level=settings.log_level.upper())

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()
    dp.include_router(router)

    # Сбрасываем возможный webhook и накопившиеся апдейты перед стартом polling.
    await bot.delete_webhook(drop_pending_updates=True)

    logger.info("Запуск long polling…")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
