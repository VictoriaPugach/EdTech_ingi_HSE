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
  inviteCode: string;
  createdAt: string;
  isActive: boolean;
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
