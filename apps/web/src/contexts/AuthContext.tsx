import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, AuthApiError } from '../services/auth/authApi';
import type { AuthState, LoginCredentials, RegisterCredentials, User } from '../types/auth';

// Storage keys
const TOKEN_KEY = 'edtech_access_token';
const USER_KEY  = 'edtech_user';

export interface AuthContextValue extends AuthState {
  login:    (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout:   () => void;
  /** Обновляет профиль локально (имя/аватар) и сохраняет в активном хранилище. */
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatarUrl'>>) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(token: string, user: User, remember: boolean): void {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

/** Перезаписывает только профиль в том хранилище, где лежит активная сессия. */
function persistUser(user: User): void {
  const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function restoreSession(): { token: string; user: User } | null {
  const token =
    localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  const raw =
    localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);

  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as User };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const session = restoreSession();
    return {
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: !!session,
      isLoading: !!session, // will verify token on mount
    };
  });

  // Verify persisted token on mount
  useEffect(() => {
    const session = restoreSession();
    if (!session) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    authApi
      .me(session.token)
      .then((user) => {
        setState({ user, token: session.token, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        clearSession();
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const data = await authApi.login(credentials);
    persistSession(data.accessToken, data.user, credentials.rememberMe ?? false);
    setState({
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    await authApi.register(credentials);
    // Auto-login after registration
    await login({ email: credentials.email, password: credentials.password });
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateProfile = useCallback((patch: Partial<Pick<User, 'name' | 'avatarUrl'>>) => {
    setState((s) => {
      if (!s.user) return s;
      const updated = { ...s.user, ...patch };
      persistUser(updated);
      return { ...s, user: updated };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, updateProfile }),
    [state, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthApiError };
