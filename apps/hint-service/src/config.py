"""Конфигурация сервиса (env-vars через pydantic-settings)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Все настройки читаются из переменных окружения."""

    env: str = "development"
    log_level: str = "info"
    hint_service_port: int = 4002

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
