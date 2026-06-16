-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('GROUP', 'SINGLE');

-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('HOST', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ChatMessageKind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "last_seen_at" TIMESTAMP(3),
ADD COLUMN     "role" "SessionRole" NOT NULL DEFAULT 'EDITOR';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "mode" "SessionMode" NOT NULL DEFAULT 'GROUP';

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID,
    "kind" "ChatMessageKind" NOT NULL DEFAULT 'USER',
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

