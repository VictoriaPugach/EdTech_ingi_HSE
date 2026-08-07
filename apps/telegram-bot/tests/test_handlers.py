"""Тесты хендлеров: /start и эхо."""

from unittest.mock import AsyncMock

from src.handlers import cmd_start, echo


async def test_start_sends_greeting():
    message = AsyncMock()

    await cmd_start(message)

    message.answer.assert_awaited_once()
    assert "Привет" in message.answer.call_args.args[0]


async def test_echo_repeats_text():
    message = AsyncMock()
    message.text = "hello"

    await echo(message)

    message.answer.assert_awaited_once_with("hello")


async def test_echo_ignores_empty_text():
    message = AsyncMock()
    message.text = None

    await echo(message)

    message.answer.assert_not_awaited()
