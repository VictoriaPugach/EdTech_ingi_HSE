import type {
  CourseDetailDto,
  CourseSummaryDto,
  CreateCourseInput,
  LessonDetailDto,
} from '@edtech/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const COURSES_BASE = `${API_BASE}/api/courses`;

class CoursesApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CoursesApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;

  let code = 'UnknownError';
  let message = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    code = body.error ?? code;
    message = body.message ?? message;
  } catch {
    // ignore parse errors
  }
  throw new CoursesApiError(code, message, res.status);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const coursesApi = {
  /** Каталог опубликованных курсов либо (mine=true) курсы текущего автора. */
  async list(token: string, opts: { mine?: boolean } = {}): Promise<CourseSummaryDto[]> {
    const query = opts.mine ? '?mine=true' : '';
    const res = await fetch(`${COURSES_BASE}${query}`, { headers: authHeaders(token) });
    return handleResponse<CourseSummaryDto[]>(res);
  },

  /** Детальный курс по id или slug. */
  async get(token: string, idOrSlug: string): Promise<CourseDetailDto> {
    const res = await fetch(`${COURSES_BASE}/${encodeURIComponent(idOrSlug)}`, {
      headers: authHeaders(token),
    });
    return handleResponse<CourseDetailDto>(res);
  },

  /** Детальный урок по id. */
  async getLesson(token: string, id: string): Promise<LessonDetailDto> {
    const res = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(id)}`, {
      headers: authHeaders(token),
    });
    return handleResponse<LessonDetailDto>(res);
  },

  /** Создать курс (teacher/admin). */
  async create(token: string, input: CreateCourseInput): Promise<CourseDetailDto> {
    const res = await fetch(COURSES_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(input),
    });
    return handleResponse<CourseDetailDto>(res);
  },
};

export { CoursesApiError };
