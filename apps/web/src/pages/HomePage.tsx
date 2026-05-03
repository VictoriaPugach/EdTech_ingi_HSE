import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Главная страница (MVP).
 * Пока без реальной авторизации — генерирует случайный sessionId
 * и кидает в редактор. На следующей итерации:
 *   - login / register;
 *   - создание сессии через API Gateway (/api/sessions);
 *   - список «Мои сессии» (ФТ-13).
 */
export function HomePage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState('');

  const createDemoSession = () => {
    const id = Math.random().toString(36).slice(2, 10);
    navigate(`/s/${id}`);
  };

  const joinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionId.trim()) navigate(`/s/${sessionId.trim()}`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-12 text-center">
      <h1 className="mb-4 text-4xl font-extrabold text-brand-700">
        Привет! Давай писать код вместе
      </h1>
      <p className="mb-10 max-w-xl text-lg text-slate-600">
        Платформа для совместного программирования с подсказками, понятными ребёнку.
        Создай новую сессию или подключись по коду от учителя.
      </p>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <button
          onClick={createDemoSession}
          className="rounded-2xl bg-brand-500 px-6 py-8 text-xl font-bold text-white shadow-md transition hover:scale-[1.02] hover:bg-brand-600"
        >
          🚀 Создать сессию
        </button>

        <form
          onSubmit={joinSession}
          className="flex flex-col gap-3 rounded-2xl bg-white px-6 py-8 shadow-md"
        >
          <label className="text-left text-sm font-semibold text-slate-700">
            Подключиться по коду
          </label>
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Например: abc12345"
            className="rounded-lg border border-slate-300 px-3 py-2 font-mono focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-200 px-4 py-2 font-semibold text-brand-700 transition hover:bg-brand-400 hover:text-white"
          >
            Войти →
          </button>
        </form>
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Это базовая версия. Скоро появятся: вход, проекты, видеосвязь, геймификация.
      </p>
    </div>
  );
}
