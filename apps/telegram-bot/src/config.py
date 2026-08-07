"""Конфигурация сервиса (env-vars через pydantic-settings)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Все настройки читаются из переменных окружения."""

    env: str = "development"
    log_level: str = "info"
    telegram_bot_token: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
