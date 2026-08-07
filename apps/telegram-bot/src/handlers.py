"""Хендлеры бота: /start, /joke и эхо."""

from __future__ import annotations

import asyncio
import logging

import httpx
from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

from .config import settings

logger = logging.getLogger(__name__)

router = Router(name="main")


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! Я бот EdTech Collab.\n"
        "Отправь мне любое сообщение — я повторю его.\n"
        "Команда /joke — пришлю случайную шутку."
    )


@router.message(Command("joke"))
async def cmd_joke(message: Message, http_client: httpx.AsyncClient) -> None:
    """Тянет шутку из Joke Delivery API и присылает setup/punchline отдельными сообщениями."""
    try:
        response = await http_client.get(settings.joke_api_url)
        response.raise_for_status()
        joke = response.json()
    except (httpx.HTTPError, ValueError):
        logger.exception("Не удалось получить шутку с %s", settings.joke_api_url)
        await message.answer(
            "Не получилось принести шутку — сервис шуток недоступен. Попробуй позже."
        )
        return

    await message.answer(joke["setup"])
    await asyncio.sleep(1.5)
    await message.answer(joke["punchline"])


@router.message()
async def echo(message: Message) -> None:
    if message.text:
        await message.answer(message.text)
