import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CoursesPage } from './pages/CoursesPage';
import { SessionPage } from './pages/SessionPage';
import { PrivateRoute } from './router/PrivateRoute';
import { AppLayout } from './layouts/AppLayout';
import { useAuth } from './hooks/useAuth';

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
            <AppLayout>
              <HomePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <PrivateRoute>
            <AppLayout>
              <CoursesPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/s/:sessionId"
        element={
          <PrivateRoute>
            <AppLayout fullHeight>
              <SessionPage />
            </AppLayout>
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
