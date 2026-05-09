import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Хук для доступа к контексту авторизации.
 * Использовать только внутри <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
