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
    mode: { type: 'string', enum: ['group', 'single'] },
    inviteCode: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'ownerId', 'title', 'language', 'mode', 'inviteCode', 'isActive', 'createdAt'],
} as const;

export const joinSessionSchema = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    sessionId: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['host', 'editor', 'viewer'] },
    mode: { type: 'string', enum: ['group', 'single'] },
  },
  required: ['token', 'sessionId', 'role', 'mode'],
} as const;

// --- Чат онлайн-занятия (ADR in-session-chat) --------------------------------
// Живая доставка — Y.Array('chat') в Y.Doc сессии; здесь — постоянная история.

export const chatMessageSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    sessionId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid', nullable: true },
    authorName: { type: 'string', nullable: true },
    kind: { type: 'string', enum: ['user', 'system'] },
    body: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'sessionId', 'userId', 'authorName', 'kind', 'body', 'createdAt'],
} as const;

export const postChatBodySchema = {
  type: 'object',
  required: ['body'],
  properties: {
    // id генерирует клиент (тот же, что кладётся в Y.Array) — для идемпотентного
    // зеркалирования без дублей при репликации между нодами (ADR in-session-chat).
    id: { type: 'string', format: 'uuid' },
    body: { type: 'string', minLength: 1, maxLength: 2000 },
  },
} as const;

// --- Видеокомната LiveKit (ADR video-livekit-sfu) ----------------------------

export const livekitTokenSchema = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    url: { type: 'string' },
    room: { type: 'string', format: 'uuid' },
    canPublish: { type: 'boolean' },
  },
  required: ['token', 'url', 'room', 'canPublish'],
} as const;

// --- Курсы (BC-3 LMS) --------------------------------------------------------

const courseLevelEnum = ['beginner', 'intermediate', 'advanced'] as const;
const courseStatusEnum = ['draft', 'published', 'archived'] as const;
const lessonTypeEnum = ['reading', 'video', 'practice', 'quiz', 'live_coding'] as const;

export const courseSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    slug: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string', nullable: true },
    level: { type: 'string', enum: [...courseLevelEnum] },
    language: { type: 'string', enum: ['python', 'javascript'] },
    coverUrl: { type: 'string', nullable: true },
    status: { type: 'string', enum: [...courseStatusEnum] },
    authorId: { type: 'string', format: 'uuid', nullable: true },
    estimatedHours: { type: 'integer', nullable: true },
    lessonsCount: { type: 'integer' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'slug', 'title', 'level', 'language', 'status', 'lessonsCount', 'createdAt'],
} as const;

const lessonSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    summary: { type: 'string', nullable: true },
    order: { type: 'integer' },
    type: { type: 'string', enum: [...lessonTypeEnum] },
    durationMin: { type: 'integer', nullable: true },
  },
  required: ['id', 'title', 'order', 'type'],
} as const;

export const courseDetailSchema = {
  type: 'object',
  properties: {
    ...courseSummarySchema.properties,
    description: { type: 'string', nullable: true },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          order: { type: 'integer' },
          lessons: { type: 'array', items: lessonSummarySchema },
        },
        required: ['id', 'title', 'order', 'lessons'],
      },
    },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          format: { type: 'string' },
          sizeBytes: { type: 'integer', nullable: true },
          url: { type: 'string' },
        },
        required: ['id', 'title', 'format', 'url'],
      },
    },
  },
  required: [...courseSummarySchema.required, 'modules', 'materials'],
} as const;

export const createCourseBodySchema = {
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 160 },
    slug: { type: 'string', minLength: 1, maxLength: 160, pattern: '^[a-z0-9-]+$' },
    summary: { type: 'string', maxLength: 280 },
    description: { type: 'string' },
    level: { type: 'string', enum: [...courseLevelEnum] },
    language: { type: 'string', enum: ['python', 'javascript'] },
    coverUrl: { type: 'string' },
    status: { type: 'string', enum: [...courseStatusEnum] },
    estimatedHours: { type: 'integer', minimum: 0 },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 160 },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title'],
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 160 },
                summary: { type: 'string', maxLength: 280 },
                type: { type: 'string', enum: [...lessonTypeEnum] },
                durationMin: { type: 'integer', minimum: 0 },
              },
            },
          },
        },
      },
    },
  },
} as const;

const contentBlockKindEnum = ['text', 'code', 'video', 'image', 'quiz', 'callout'] as const;

export const lessonDetailSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    summary: { type: 'string', nullable: true },
    order: { type: 'integer' },
    type: { type: 'string', enum: [...lessonTypeEnum] },
    durationMin: { type: 'integer', nullable: true },
    course: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        slug: { type: 'string' },
        title: { type: 'string' },
        level: { type: 'string', enum: [...courseLevelEnum] },
        language: { type: 'string', enum: ['python', 'javascript'] },
        teacherName: { type: 'string', nullable: true },
      },
      required: ['id', 'slug', 'title', 'level', 'language'],
    },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          order: { type: 'integer' },
          kind: { type: 'string', enum: [...contentBlockKindEnum] },
          data: { type: 'object', additionalProperties: true },
        },
        required: ['id', 'order', 'kind', 'data'],
      },
    },
    materials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          format: { type: 'string' },
          sizeBytes: { type: 'integer', nullable: true },
          url: { type: 'string' },
        },
        required: ['id', 'title', 'format', 'url'],
      },
    },
    siblings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          order: { type: 'integer' },
        },
        required: ['id', 'title', 'order'],
      },
    },
  },
  required: ['id', 'title', 'order', 'type', 'course', 'blocks', 'materials', 'siblings'],
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
