-- ============================================================================
--  EdTech Collab — bootstrap-скрипт PostgreSQL
--  Запускается автоматически Docker-образом при первом старте контейнера
--  (см. docker-compose.yml: монтирование в /docker-entrypoint-initdb.d/).
--
--  Сами таблицы создаются миграциями Prisma (см. apps/api-gateway/prisma).
--  Здесь — только расширения и базовые настройки.
-- ============================================================================

-- UUID-ы для первичных ключей
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgcrypto — пригодится для хэширования / случайных токенов
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- citext — case-insensitive email
CREATE EXTENSION IF NOT EXISTS "citext";
