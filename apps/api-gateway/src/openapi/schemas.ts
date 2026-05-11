/**
 * JSON Schema для @fastify/swagger (OpenAPI 3).
 * Отражает контракты из @edtech/shared и фактическое поведение хендлеров.
 */

/** Категории ошибок подсказок (TC-05/TC-06) */
const hintErrorTypeEnum = [
  'syntax/unmatched_paren',
  'syntax/unmatched_bracket',
  'syntax/unmatched_quote',
  'syntax/missing_colon',
  'syntax/invalid_indentation',
  'semantic/undefined_variable',
  'semantic/undefined_function',
  'unknown',
] as const;

export const userDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    role: { type: 'string', enum: ['student', 'teacher', 'admin'] },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'email', 'name', 'role', 'createdAt'],
} as const;

export const authTokensSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    expiresIn: { type: 'integer' },
    user: userDtoSchema,
  },
  required: ['accessToken', 'expiresIn', 'user'],
} as const;

export const sessionDtoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    ownerId: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    language: { type: 'string', enum: ['python', 'javascript'] },
    inviteCode: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'ownerId', 'title', 'language', 'inviteCode', 'isActive', 'createdAt'],
} as const;

export const hintRequestBodySchema = {
  type: 'object',
  required: ['code', 'language'],
  properties: {
    code: { type: 'string', description: 'Исходный код в редакторе' },
    language: { type: 'string', enum: ['python', 'javascript'] },
    userAge: { type: 'integer', minimum: 1, description: 'Возраст ученика (адаптация формулировок)' },
    errorType: {
      type: 'string',
      enum: [...hintErrorTypeEnum],
      description: 'Если не задано — сервис сам ищет ошибки в коде',
    },
  },
} as const;

export const hintResponseSchema = {
  type: 'object',
  properties: {
    hints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          errorType: { type: 'string', enum: [...hintErrorTypeEnum] },
          message: { type: 'string' },
          location: {
            type: 'object',
            properties: {
              line: { type: 'integer' },
              column: { type: 'integer' },
            },
            required: ['line', 'column'],
          },
          visualCue: { type: 'string', enum: ['highlight', 'inline', 'tooltip'] },
        },
        required: ['errorType', 'message', 'location', 'visualCue'],
      },
    },
    processingTimeMs: { type: 'integer' },
  },
  required: ['hints', 'processingTimeMs'],
} as const;

export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
    service: { type: 'string' },
    version: { type: 'string' },
    uptimeSec: { type: 'integer' },
    checks: {
      type: 'object',
      additionalProperties: { type: 'string', enum: ['ok', 'fail'] },
    },
  },
  required: ['status', 'service', 'version', 'uptimeSec'],
} as const;

export const validationErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'ValidationError' },
    details: { type: 'object', additionalProperties: true },
  },
  required: ['error'],
} as const;

export const simpleErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

/** Ответ шлюза при ошибке upstream Hint Service */
export const hintUpstreamErrorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'HintServiceError' },
    status: { type: 'integer', description: 'HTTP-статус ответа Hint Service' },
  },
  required: ['error', 'status'],
} as const;
