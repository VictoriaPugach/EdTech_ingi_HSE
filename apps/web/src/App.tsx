import { Route, Routes, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';

export function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="bg-brand-500 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            EdTech Collab
          </Link>
          <span className="text-sm opacity-80">
            Учимся программировать вместе · MVP 0.1
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/s/:sessionId" element={<SessionPage />} />
        </Routes>
      </main>
    </div>
  );
}
