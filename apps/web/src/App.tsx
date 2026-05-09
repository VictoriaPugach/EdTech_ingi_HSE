import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage }   from './pages/LoginPage';
import { HomePage }    from './pages/HomePage';
import { SessionPage } from './pages/SessionPage';
import { PrivateRoute } from './router/PrivateRoute';
import { useAuth }      from './hooks/useAuth';

export function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span>Загрузка…</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell>
              <HomePage />
            </AppShell>
          </PrivateRoute>
        }
      />
      <Route
        path="/s/:sessionId"
        element={
          <PrivateRoute>
            <AppShell fullHeight>
              <SessionPage />
            </AppShell>
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── App shell with header ────────────────────────────────────────────────────

import { Link } from 'react-router-dom';

function AppShell({ children, fullHeight }: { children: React.ReactNode; fullHeight?: boolean }) {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header
        style={{
          background: '#7B5BF4',
          color: 'white',
          boxShadow: '0 2px 8px rgba(123,91,244,0.3)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
          }}
        >
          <Link
            to="/"
            style={{
              color: 'white',
              fontWeight: 800,
              fontSize: '1.1rem',
              textDecoration: 'none',
              letterSpacing: '-0.3px',
            }}
          >
            {'</>'} EdTech Collab
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {user && (
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                {user.name} · {user.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
              </span>
            )}
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, overflow: fullHeight ? 'hidden' : 'auto' }}>
        {children}
      </main>
    </div>
  );
}
