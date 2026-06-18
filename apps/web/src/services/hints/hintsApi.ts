import type { HintResponseDto, SessionLanguage } from '@edtech/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/**
 * Запрос подсказок по коду к Hint Service (через шлюз, с JWT).
 * Используется линтером редактора (debounce) для показа тултипов у места ошибки.
 */
export async function analyzeCode(
  token: string,
  code: string,
  language: SessionLanguage,
  userAge?: number,
): Promise<HintResponseDto> {
  const res = await fetch(`${API_BASE}/api/hints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, language, userAge }),
  });
  if (!res.ok) throw new Error(`Hints HTTP ${res.status}`);
  return res.json() as Promise<HintResponseDto>;
}
