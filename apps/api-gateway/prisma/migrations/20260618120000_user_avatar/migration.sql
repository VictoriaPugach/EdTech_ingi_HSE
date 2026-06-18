-- Аватар пользователя: data URL (картинка ужата на клиенте до ≤256px), хранится в TEXT.
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
