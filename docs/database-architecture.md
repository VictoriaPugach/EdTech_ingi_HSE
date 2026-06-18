# Архитектура БД — учебный контент (курсы, уроки, прогресс)

> Живой документ. При изменении схемы (`apps/api-gateway/prisma/schema.prisma`)
> обновляйте этот файл в том же коммите. Источник истины для структуры —
> Prisma-схема; здесь — её человекочитаемое описание, инварианты и причины решений.

- **СУБД:** PostgreSQL 16 (см. ADR `architecture-decision-records/postgresql-redis`).
- **ORM / миграции:** Prisma (`npx prisma migrate dev --name <name>` внутри контейнера `api-gateway`).
- **Bounded Context:** BC-3 Learning Management.
- **Связь с другими BC:** живое совместное редактирование (BC-1) подключается к уроку
  через `Session.lessonId` (nullable) — урок не обязан иметь сессию, сессия не обязана
  быть привязанной к уроку.

---

## 1. Доменная модель (обзор)

```
User (TEACHER) ──< Course ──< CourseModule ──< Lesson ──< LessonContentBlock
                     │                            │
                     │                            ├──< Material        (≥0 файлов на урок)
                     │                            └──< Session (BC-1)   (0..* живых сессий)
                     ├──< Material                 (материалы уровня курса)
                     ├──< TagsOnCourses >── Tag
                     └──< Enrollment ──< LessonProgress
                            │
                          User (STUDENT)
```

Иерархия контента: **Курс → Модуль → Урок → Блок контента**. Модуль — обязательная
группирующая единица (у курса всегда ≥1 модуль, минимум «Основной»); это позволяет
расширять программу разделами без миграции структуры.

Прогресс ученика отделён от контента: `Enrollment` (запись на курс) агрегирует
`LessonProgress` (статус по каждому уроку). Контент можно править, не затрагивая
прогресс, и наоборот.

---

## 2. Таблицы и поля

### 2.1. `courses` — курс
Метаданные курса для каталога «Мои курсы» и страницы курса.

| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | человекочитаемый ид для URL (`/courses/python-basics`) |
| `title` | text | название |
| `summary` | text? | короткое описание (на карточке) |
| `description` | text? | полное описание (Markdown) |
| `level` | enum `CourseLevel` | сложность: BEGINNER / INTERMEDIATE / ADVANCED |
| `language` | enum `SessionLanguage` | язык программирования курса |
| `cover_url` | text? | обложка |
| `status` | enum `CourseStatus` | DRAFT / PUBLISHED / ARCHIVED |
| `author_id` | uuid? FK→users | преподаватель-автор (SetNull при удалении) |
| `estimated_hours` | int? | ориентировочная длительность |
| `created_at` / `updated_at` | timestamptz | |

Индексы: `status`, `author_id`.

### 2.2. `tags` + `tags_on_courses` — теги (M:N)
Тематические теги курса («Python», «Игры», «Веб»). Уровень сложности — это
`courses.level`, теги для него не используются.

`tags`: `id`, `slug` unique, `name`.
`tags_on_courses`: PK(`course_id`, `tag_id`), оба FK с каскадным удалением.

### 2.3. `course_modules` — раздел курса
| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK→courses (Cascade) | |
| `title` | text | название раздела |
| `order` | int | порядок в курсе (сортировка на клиенте) |
| `created_at` | timestamptz | |

Индекс: `course_id`.

### 2.4. `lessons` — урок
| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `module_id` | uuid FK→course_modules (Cascade) | |
| `title` | text | |
| `summary` | text? | краткое описание/тема урока |
| `order` | int | порядок внутри модуля |
| `type` | enum `LessonType` | READING / VIDEO / PRACTICE / QUIZ / LIVE_CODING |
| `duration_min` | int? | длительность |
| `is_published` | bool | виден ли ученикам |
| `created_at` / `updated_at` | timestamptz | |

Индекс: `module_id`.

### 2.5. `lesson_content_blocks` — данные внутри урока
Гибкое наполнение урока упорядоченными блоками. Структура `data` зависит от `kind`
и потому хранится в JSONB — это «данные внутри курсов».

| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `lesson_id` | uuid FK→lessons (Cascade) | |
| `order` | int | порядок блока в уроке |
| `kind` | enum `ContentBlockKind` | TEXT / CODE / VIDEO / IMAGE / QUIZ / CALLOUT |
| `data` | jsonb | полезная нагрузка блока (см. ниже) |
| `created_at` | timestamptz | |

Формы `data` по `kind` (контракт приложения, не БД):
- `TEXT` → `{ "markdown": "..." }`
- `CODE` → `{ "language": "python", "code": "...", "runnable": true }`
- `VIDEO` → `{ "url": "...", "provider": "youtube|file", "durationSec": 0 }`
- `IMAGE` → `{ "url": "...", "alt": "..." }`
- `QUIZ` → `{ "question": "...", "options": ["..."], "answerIndex": 0 }`
- `CALLOUT` → `{ "tone": "info|warning", "markdown": "..." }`

Индекс: `lesson_id`.

### 2.6. `materials` — прикреплённые файлы (Figma «Materials»)
Файл-материал уровня курса **или** урока (одно из двух заполнено).

| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid? FK→courses (Cascade) | материал курса |
| `lesson_id` | uuid? FK→lessons (Cascade) | материал урока |
| `title` | text | имя файла |
| `format` | text | PDF / DOCX / … |
| `size_bytes` | int? | размер |
| `url` | text | ссылка на файл |
| `created_at` | timestamptz | |

Индексы: `course_id`, `lesson_id`. Инвариант: ровно одно из (`course_id`,`lesson_id`)
не NULL (проверяется на уровне приложения).

### 2.7. `enrollments` — запись ученика на курс + агрегированный прогресс
| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK→courses (Cascade) | |
| `user_id` | uuid FK→users (Cascade) | ученик |
| `status` | enum `EnrollmentStatus` | ACTIVE / COMPLETED / ARCHIVED (фильтр в «Мои курсы») |
| `progress_percent` | int (0..100) | денормализованный прогресс для карточки |
| `enrolled_at` | timestamptz | |
| `completed_at` | timestamptz? | |

Уникальность: (`course_id`, `user_id`). Индекс: `user_id`.

### 2.8. `lesson_progress` — прогресс по урокам
| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | |
| `enrollment_id` | uuid FK→enrollments (Cascade) | |
| `lesson_id` | uuid FK→lessons (Cascade) | |
| `status` | enum `LessonProgressStatus` | NOT_STARTED / IN_PROGRESS / COMPLETED |
| `score` | int? | результат (для QUIZ/PRACTICE) |
| `completed_at` | timestamptz? | |
| `updated_at` | timestamptz | |

Уникальность: (`enrollment_id`, `lesson_id`). Индекс: `lesson_id`.
`enrollments.progress_percent` пересчитывается из агрегата `lesson_progress`.

### 2.9. Изменение `sessions` (BC-1)
Добавлено поле `lesson_id uuid?` (FK→lessons, SetNull) — привязка живой сессии
совместного редактирования к уроку (экраны Online_class). Nullable: сохраняются
ad-hoc сессии без курса.

---

## 3. Перечисления (enums)

| Enum | Значения |
|---|---|
| `CourseLevel` | BEGINNER, INTERMEDIATE, ADVANCED |
| `CourseStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `LessonType` | READING, VIDEO, PRACTICE, QUIZ, LIVE_CODING |
| `ContentBlockKind` | TEXT, CODE, VIDEO, IMAGE, QUIZ, CALLOUT |
| `EnrollmentStatus` | ACTIVE, COMPLETED, ARCHIVED |
| `LessonProgressStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED |
| `SessionLanguage` (сущ.) | PYTHON, JAVASCRIPT |

---

## 4. Решения и их причины

- **Модуль обязателен.** Программа курса (Figma «Программа курса») сейчас плоская, но
  модуль введён сразу, чтобы добавление разделов не требовало миграции связей.
- **Контент в JSONB (`lesson_content_blocks.data`).** Типы блоков и их поля будут
  расти (интерактив, тесты). Отдельная таблица на каждый тип преждевременна; JSONB
  даёт гибкость и индексируемость без раздувания схемы. Контракт форм — в §2.5.
- **Прогресс отделён от контента.** Правки уроков не трогают записи учеников; `Enrollment`
  и `LessonProgress` живут независимо.
- **`progress_percent` денормализован** в `enrollments` ради быстрого рендера карточек
  каталога без агрегирующего запроса по `lesson_progress`.
- **`slug` у курса** — стабильные читаемые URL и идемпотентный сидинг.
- **Каскады:** удаление курса удаляет его модули/уроки/контент/материалы/записи;
  удаление пользователя-автора не удаляет курс (`author_id` → SetNull).

---

## 5. Как вносить изменения

1. Правим `apps/api-gateway/prisma/schema.prisma`.
2. `docker compose exec api-gateway npx prisma migrate dev --name <краткое-имя>`.
3. Обновляем соответствующий раздел этого файла (поля/enum/инвариант/причину).
4. При изменении DTO — синхронизируем `packages/shared/src/index.ts`.
5. Один коммит = схема + миграция + правка этого документа.

## 6. Онлайн-занятие: режимы, роли, чат (BC-1 ↔ BC-3)

Экран «Онлайн-занятие» переиспользует существующие `sessions`, `participants`,
`snapshots`. Видео идёт через SFU (LiveKit) и **таблиц не требует** — медиа P2P-к-SFU,
сигналинг и состояние камеры/микрофона эфемерны (см. ADR `video-livekit-sfu`).
Чат — поверх Yjs с зеркалом в БД (ADR `in-session-chat`).

### 6.1. Изменения существующих таблиц
- `sessions.mode` (enum `SessionMode` GROUP/SINGLE) — режим занятия: совместное
  редактирование всеми (GROUP) либо один кодит, остальные наблюдают (SINGLE).
- `participants.role` (enum `SessionRole` HOST/EDITOR/VIEWER) — права на занятии:
  преподаватель = HOST, ученик-редактор = EDITOR, наблюдатель = VIEWER.
- `participants.last_seen_at` — presence/таймауты.

### 6.2. `chat_messages` — история чата занятия
| Поле | Тип | Назначение |
|---|---|---|
| `id` | uuid PK | совпадает с id сообщения в `Y.Array('chat')` (идемпотентность зеркала) |
| `session_id` | uuid FK→sessions (Cascade) | |
| `user_id` | uuid? FK→users (SetNull) | NULL для системных сообщений |
| `kind` | enum `ChatMessageKind` | USER / SYSTEM |
| `body` | text | текст сообщения |
| `created_at` | timestamptz | |

Индекс: `(session_id, created_at)`. Горячий путь доставки — `Y.Array('chat')` в Y.Doc
сессии; Realtime Sync зеркалит сюда в хуке `onUpdate`. История — `GET /api/sessions/:id/chat`.

## 7. Открытые вопросы (backlog)

- Версионирование контента уроков (история правок) — пока нет.
- Платный доступ / когорты / расписание занятий (`startsAt` у урока/сессии) — вне текущей модели.
- Запись онлайн-занятий — вне MVP (видео не пишется в БД).
- Полнотекстовый поиск по курсам (pg_trgm / tsvector) — при необходимости каталога.
