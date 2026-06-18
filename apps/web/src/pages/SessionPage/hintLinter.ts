import { linter, type Diagnostic } from '@codemirror/lint';
import type { SessionLanguage } from '@edtech/shared';
import { analyzeCode } from '../../services/hints/hintsApi';

/**
 * Линтер CodeMirror, который подсвечивает место ошибки и показывает рядом тултип
 * с дружелюбной подсказкой из Hint Service (ФТ-9). Запускается с задержкой после
 * остановки ввода (debounce) — анализ не дёргается на каждый символ.
 */
export function hintLinter(getToken: () => string | null, language: SessionLanguage) {
  return linter(
    async (view) => {
      const token = getToken();
      const code = view.state.doc.toString();
      if (!token || code.trim().length === 0) return [];

      let hints;
      try {
        const resp = await analyzeCode(token, code, language);
        hints = resp.hints;
      } catch {
        return []; // подсказки недоступны — не мешаем редактированию
      }

      const doc = view.state.doc;
      return hints.map<Diagnostic>((h) => {
        const lineNo = Math.min(Math.max(h.location.line, 1), doc.lines);
        const line = doc.line(lineNo);
        const from = Math.min(line.from + Math.max(h.location.column - 1, 0), line.to);
        const to = Math.max(line.to, from + 1);
        return {
          from,
          to,
          severity: 'warning',
          source: 'Подсказка',
          message: h.message,
        };
      });
    },
    { delay: 800 },
  );
}
