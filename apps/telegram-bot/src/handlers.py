"""Хендлеры бота: /start и эхо."""

from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

router = Router(name="main")


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "Привет! Я бот EdTech Collab. Отправь мне любое сообщение — я повторю его."
    )


@router.message()
async def echo(message: Message) -> None:
    if message.text:
        await message.answer(message.text)
