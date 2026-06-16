/**
 * Общие типы между фронтендом, API Gateway и Realtime Sync.
 *
 * Принципы (DDD, согласно System Design §1.2):
 *   - Это «Shared Kernel» только для контрактов взаимодействия (DTO).
 *   - Внутренние доменные модели каждого BC сюда НЕ выносятся.
 *   - Все поля сериализуемы в JSON.
 */

// ----------------------------------------------------------------------------
// Пользователи (BC-3 LMS)
// ----------------------------------------------------------------------------

export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

// ----------------------------------------------------------------------------
// Сессии совместного редактирования (BC-1 + BC-3)
// ----------------------------------------------------------------------------

export type SessionLanguage = 'python' | 'javascript';

export interface SessionDto {
  id: string;
  ownerId: string;
  title: string;
  language: SessionLanguage;
  mode: SessionMode;
  inviteCode: string;
  createdAt: string;
  isActive: boolean;
}

/** Режим онлайн-занятия. */
export type SessionMode = 'group' | 'single';

/** Роль участника на занятии. */
export type SessionRole = 'host' | 'editor' | 'viewer';

/** Ответ POST /api/sessions/:id/join — токен и роль для подключения к WS/видео. */
export interface JoinSessionDto {
  /** Сессионный JWT для WebSocket Realtime Sync (claim sessionRole). */
  token: string;
  sessionId: string;
  role: SessionRole;
  mode: SessionMode;
}

export interface ChatMessageDto {
  id: string;
  sessionId: string;
  userId: string | null;
  authorName: string | null;
  kind: 'user' | 'system';
  body: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Подсказки (BC-2 Hint Service)
// ----------------------------------------------------------------------------

/**
 * Типы ошибок из утверждённого справочника (System Design §2.6 TC-05/TC-06).
 * Формат: <category>/<specific_kind>
 */
export type HintErrorType =
  | 'syntax/unmatched_paren'
  | 'syntax/unmatched_bracket'
  | 'syntax/unmatched_quote'
  | 'syntax/missing_colon'
  | 'syntax/invalid_indentation'
  | 'semantic/undefined_variable'
  | 'semantic/undefined_function'
  | 'unknown';

export interface CodeLocation {
  line: number; // 1-based, как в редакторе
  column: number; // 1-based
}

export interface HintRequestDto {
  code: string;
  language: SessionLanguage;
  /** Возраст ученика (для адаптации языка подсказки) */
  userAge?: number;
  /** Если null — анализатор сам ищет ошибки; если задано — генерируется подсказка по конкретной */
  errorType?: HintErrorType;
}

export interface HintDto {
  errorType: HintErrorType;
  /** Дружелюбный текст для ребёнка, без техжаргона. ≤150 символов (TC-07). */
  message: string;
  location: CodeLocation;
  /** Подсказка для UI: как визуально привязать (highlight / arrow / inline) */
  visualCue: 'highlight' | 'inline' | 'tooltip';
}

export interface HintResponseDto {
  hints: HintDto[];
  /** Время обработки в ms (для метрик НФТ KPI <2с) */
  processingTimeMs: number;
}

// ----------------------------------------------------------------------------
// Healthcheck (общий контракт для всех сервисов)
// ----------------------------------------------------------------------------

export interface HealthDto {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  uptimeSec: number;
  checks?: Record<string, 'ok' | 'fail'>;
}

// ----------------------------------------------------------------------------
// Учебный контент: курсы / модули / уроки (BC-3 LMS)
// Доменная модель и причины решений: docs/database-architecture.md
// ----------------------------------------------------------------------------

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type LessonType = 'reading' | 'video' | 'practice' | 'quiz' | 'live_coding';

export interface CourseSummaryDto {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  language: SessionLanguage;
  coverUrl: string | null;
  status: CourseStatus;
  authorId: string | null;
  estimatedHours: number | null;
  /** Кол-во уроков во всех модулях (для карточки каталога). */
  lessonsCount: number;
  createdAt: string;
}

export interface LessonSummaryDto {
  id: string;
  title: string;
  summary: string | null;
  order: number;
  type: LessonType;
  durationMin: number | null;
}

export interface CourseModuleDto {
  id: string;
  title: string;
  order: number;
  lessons: LessonSummaryDto[];
}

export interface MaterialDto {
  id: string;
  title: string;
  format: string;
  sizeBytes: number | null;
  url: string;
}

export interface CourseDetailDto extends CourseSummaryDto {
  description: string | null;
  modules: CourseModuleDto[];
  materials: MaterialDto[];
}

/** Урок в payload создания курса. */
export interface CreateLessonInput {
  title: string;
  summary?: string;
  type?: LessonType;
  durationMin?: number;
}

/** Модуль в payload создания курса. */
export interface CreateCourseModuleInput {
  title: string;
  lessons?: CreateLessonInput[];
}

/** Тело запроса POST /api/courses (создаёт преподаватель/админ). */
export interface CreateCourseInput {
  title: string;
  slug?: string;
  summary?: string;
  description?: string;
  level?: CourseLevel;
  language?: SessionLanguage;
  coverUrl?: string;
  status?: CourseStatus;
  estimatedHours?: number;
  modules?: CreateCourseModuleInput[];
}

export type ContentBlockKind = 'text' | 'code' | 'video' | 'image' | 'quiz' | 'callout';

/** Блок наполнения урока. Форма `data` зависит от `kind` (docs/database-architecture.md §2.5). */
export interface LessonContentBlockDto {
  id: string;
  order: number;
  kind: ContentBlockKind;
  data: Record<string, unknown>;
}

/** Соседний урок курса (для навигации по программе). */
export interface LessonNavItemDto {
  id: string;
  title: string;
  order: number;
}

export interface LessonDetailDto {
  id: string;
  title: string;
  summary: string | null;
  order: number;
  type: LessonType;
  durationMin: number | null;
  course: {
    id: string;
    slug: string;
    title: string;
    level: CourseLevel;
    language: SessionLanguage;
    teacherName: string | null;
  };
  blocks: LessonContentBlockDto[];
  materials: MaterialDto[];
  /** Все уроки курса в порядке программы (для боковой навигации). */
  siblings: LessonNavItemDto[];
}
