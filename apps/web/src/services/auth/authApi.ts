import type { AuthTokens, LoginCredentials, RegisterCredentials, User } from '../../types/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const AUTH_BASE = `${API_BASE}/api/auth`;

class AuthApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
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
  throw new AuthApiError(code, message, res.status);
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const res = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
    return handleResponse<AuthTokens>(res);
  },

  async register(credentials: RegisterCredentials): Promise<User> {
    const res = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<User>(res);
  },

  async me(token: string): Promise<User> {
    const res = await fetch(`${AUTH_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<User>(res);
  },
};

export { AuthApiError };
