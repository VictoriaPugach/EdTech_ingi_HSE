// =============================================================================
//  Auth domain types — frontend
// =============================================================================

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  /** Аватар (data URL). Пока хранится только на клиенте — см. ProfilePage. */
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher';
  ageYears?: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
