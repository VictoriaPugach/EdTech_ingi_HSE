import type { User } from '../../types/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const USERS_BASE = `${API_BASE}/api/users`;

export interface UpdateProfilePatch {
  name?: string;
  /** null — убрать аватар. */
  avatarUrl?: string | null;
}

class UsersApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UsersApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let code = 'UnknownError';
  try {
    const body = await res.json();
    code = body.error ?? code;
  } catch {
    // ignore parse errors
  }
  throw new UsersApiError(code, `HTTP ${res.status}`, res.status);
}

export const usersApi = {
  async updateMe(token: string, patch: UpdateProfilePatch): Promise<User> {
    const res = await fetch(`${USERS_BASE}/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    return handleResponse<User>(res);
  },
};

export { UsersApiError };
