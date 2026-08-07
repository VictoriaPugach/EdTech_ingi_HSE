"""Тесты хендлеров: /start, /joke и эхо."""

from unittest.mock import AsyncMock, MagicMock

import httpx

from src.handlers import cmd_joke, cmd_start, echo


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


async def test_joke_sends_setup_then_punchline(monkeypatch):
    monkeypatch.setattr("src.handlers.asyncio.sleep", AsyncMock())

    message = AsyncMock()
    http_client = AsyncMock()
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json.return_value = {
        "type": "general",
        "setup": "Почему?",
        "punchline": "Потому!",
        "id": 1,
    }
    http_client.get = AsyncMock(return_value=response)

    await cmd_joke(message, http_client)

    assert message.answer.await_count == 2
    message.answer.assert_any_await("Почему?")
    message.answer.assert_any_await("Потому!")


async def test_joke_handles_api_error():
    message = AsyncMock()
    http_client = AsyncMock()
    http_client.get = AsyncMock(side_effect=httpx.ConnectError("boom"))

    await cmd_joke(message, http_client)

    message.answer.assert_awaited_once()
    assert "не получилось" in message.answer.call_args.args[0].lower()
