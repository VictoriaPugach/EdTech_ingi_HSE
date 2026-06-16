/**
 * Курсы (BC-3 LMS). Реальное создание и чтение учебного контента.
 *
 * Ролевая модель (три роли):
 *   - TEACHER  — создаёт/читает свои курсы;
 *   - ADMIN    — то же для любых курсов;
 *   - STUDENT  — только чтение опубликованных курсов (создание запрещено).
 *
 * Доменная модель: docs/database-architecture.md
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type {
  CourseDetailDto,
  CourseLevel,
  CourseStatus,
  CourseSummaryDto,
  LessonType,
} from '@edtech/shared';
import {
  courseDetailSchema,
  courseSummarySchema,
  createCourseBodySchema,
  simpleErrorSchema,
  validationErrorSchema,
} from '../openapi/schemas.js';

// --- Валидация тела (zod, зеркалит createCourseBodySchema) -------------------

const lessonTypeZ = z.enum(['reading', 'video', 'practice', 'quiz', 'live_coding']);

const createCourseZ = z.object({
  title: z.string().min(1).max(160),
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  summary: z.string().max(280).optional(),
  description: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  language: z.enum(['python', 'javascript']).default('python'),
  coverUrl: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  estimatedHours: z.number().int().min(0).optional(),
  modules: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        lessons: z
          .array(
            z.object({
              title: z.string().min(1).max(160),
              summary: z.string().max(280).optional(),
              type: lessonTypeZ.default('reading'),
              durationMin: z.number().int().min(0).optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

// --- Маппинг enum БД (UPPER) <-> DTO (lower) --------------------------------

const up = <T extends string>(v: T) => v.toUpperCase();
const lvl = (v: string) => v.toLowerCase() as CourseLevel;
const st = (v: string) => v.toLowerCase() as CourseStatus;
const ltype = (v: string) => v.toLowerCase() as LessonType;
const lang = (v: string) => v.toLowerCase() as CourseSummaryDto['language'];

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // Кириллические/пустые заголовки → стабильный fallback.
  return base || `course-${randomBytes(3).toString('hex')}`;
}

function isManager(role: string): boolean {
  return role === 'teacher' || role === 'admin';
}

// --- DTO-мапперы -------------------------------------------------------------

type ModuleWithCount = { _count: { lessons: number } };

function toSummary(c: {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string;
  language: string;
  coverUrl: string | null;
  status: string;
  authorId: string | null;
  estimatedHours: number | null;
  createdAt: Date;
  modules: ModuleWithCount[];
}): CourseSummaryDto {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    level: lvl(c.level),
    language: lang(c.language),
    coverUrl: c.coverUrl,
    status: st(c.status),
    authorId: c.authorId,
    estimatedHours: c.estimatedHours,
    lessonsCount: c.modules.reduce((acc, m) => acc + m._count.lessons, 0),
    createdAt: c.createdAt.toISOString(),
  };
}

export async function coursesRoutes(app: FastifyInstance): Promise<void> {
  // ── Создать курс (teacher/admin) ───────────────────────────────────────────
  app.post(
    '/courses',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Courses'],
        summary: 'Создать курс',
        description: 'Создаёт курс с модулями и уроками. Доступно ролям teacher и admin.',
        security: [{ bearerAuth: [] }],
        body: createCourseBodySchema,
        response: {
          201: courseDetailSchema,
          400: validationErrorSchema,
          401: simpleErrorSchema,
          403: simpleErrorSchema,
          409: simpleErrorSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!isManager(req.user.role)) {
        return reply.code(403).send({ error: 'Forbidden: only teacher or admin can create courses' });
      }

      const parsed = createCourseZ.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'ValidationError', details: parsed.error.flatten() });
      }
      const input = parsed.data;

      let slug = input.slug ?? slugify(input.title);
      if (await app.prisma.course.findUnique({ where: { slug } })) {
        slug = `${slug}-${randomBytes(2).toString('hex')}`;
      }

      const created = await app.prisma.course.create({
        data: {
          slug,
          title: input.title,
          summary: input.summary,
          description: input.description,
          level: up(input.level) as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
          language: up(input.language) as 'PYTHON' | 'JAVASCRIPT',
          coverUrl: input.coverUrl,
          status: up(input.status) as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
          estimatedHours: input.estimatedHours,
          authorId: req.user.sub,
          modules: {
            create: (input.modules ?? []).map((m, mi) => ({
              title: m.title,
              order: mi,
              lessons: {
                create: (m.lessons ?? []).map((l, li) => ({
                  title: l.title,
                  summary: l.summary,
                  type: up(l.type) as 'READING' | 'VIDEO' | 'PRACTICE' | 'QUIZ' | 'LIVE_CODING',
                  durationMin: l.durationMin,
                  order: li,
                })),
              },
            })),
          },
        },
      });

      const detail = await loadDetail(app, created.id);
      return reply.code(201).send(detail);
    },
  );

  // ── Список курсов ──────────────────────────────────────────────────────────
  app.get(
    '/courses',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Courses'],
        summary: 'Список курсов',
        description:
          '`?mine=true` — курсы текущего автора (teacher/admin). Иначе — каталог опубликованных курсов.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: { mine: { type: 'boolean' } },
        },
        response: {
          200: { type: 'array', items: courseSummarySchema },
          401: simpleErrorSchema,
        },
      },
    },
    async (req: FastifyRequest) => {
      const { mine } = req.query as { mine?: boolean };
      const where =
        mine && isManager(req.user.role)
          ? { authorId: req.user.sub }
          : { status: 'PUBLISHED' as const };

      const list = await app.prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { modules: { select: { _count: { select: { lessons: true } } } } },
      });
      return list.map(toSummary);
    },
  );

  // ── Детальный курс по id или slug ──────────────────────────────────────────
  app.get(
    '/courses/:idOrSlug',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Courses'],
        summary: 'Курс по id или slug',
        description: 'Полная программа курса. Черновики/архив видны только автору или админу.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['idOrSlug'],
          properties: { idOrSlug: { type: 'string', minLength: 1 } },
        },
        response: {
          200: courseDetailSchema,
          401: simpleErrorSchema,
          403: simpleErrorSchema,
          404: simpleErrorSchema,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { idOrSlug } = req.params as { idOrSlug: string };
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      const course = await app.prisma.course.findFirst({
        where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      });
      if (!course) return reply.code(404).send({ error: 'CourseNotFound' });

      const isOwner = course.authorId === req.user.sub;
      if (course.status !== 'PUBLISHED' && !isOwner && req.user.role !== 'admin') {
        return reply.code(403).send({ error: 'Forbidden: course is not published' });
      }

      const detail = await loadDetail(app, course.id);
      return reply.send(detail);
    },
  );
}

// --- Загрузка детального DTO -------------------------------------------------

async function loadDetail(app: FastifyInstance, id: string): Promise<CourseDetailDto> {
  const c = await app.prisma.course.findUniqueOrThrow({
    where: { id },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
      materials: { where: { lessonId: null }, orderBy: { createdAt: 'asc' } },
    },
  });

  const lessonsCount = c.modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    description: c.description,
    level: lvl(c.level),
    language: lang(c.language),
    coverUrl: c.coverUrl,
    status: st(c.status),
    authorId: c.authorId,
    estimatedHours: c.estimatedHours,
    lessonsCount,
    createdAt: c.createdAt.toISOString(),
    modules: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        order: l.order,
        type: ltype(l.type),
        durationMin: l.durationMin,
      })),
    })),
    materials: c.materials.map((mat) => ({
      id: mat.id,
      title: mat.title,
      format: mat.format,
      sizeBytes: mat.sizeBytes,
      url: mat.url,
    })),
  };
}
