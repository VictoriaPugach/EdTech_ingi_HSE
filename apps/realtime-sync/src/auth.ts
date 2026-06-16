/**
 * Верификация сессионного JWT (HS256), выпущенного API Gateway.
 *
 * Реализовано на встроенном `crypto`, без зависимости от jsonwebtoken,
 * чтобы не тянуть пакет и не пересобирать образ. Алгоритм — HS256
 * (совпадает с @fastify/jwt по умолчанию).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

export type ParticipantRole = 'HOST' | 'EDITOR' | 'VIEWER';

export interface SessionClaims {
  sub: string;
  role?: string; // глобальная роль пользователя (student/teacher/admin)
  name?: string;
  sessionId?: string;
  sessionRole?: ParticipantRole;
  mode?: 'GROUP' | 'SINGLE';
  exp?: number;
}

export interface ConnectionIdentity {
  userId: string;
  name?: string;
  role: ParticipantRole;
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Возвращает payload при валидной подписи и сроке, иначе null. */
export function verifyToken(token: string): SessionClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expected = createHmac('sha256', config.JWT_SECRET).update(`${header}.${payload}`).digest();
  const given = b64urlDecode(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const claims = JSON.parse(b64urlDecode(payload).toString('utf8')) as SessionClaims;
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}
