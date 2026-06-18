import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CoursesPage } from './pages/CoursesPage';
import { CreateCoursePage } from './pages/CreateCoursePage';
import { CoursePage } from './pages/CoursePage';
import { LessonPage } from './pages/LessonPage';
import { SessionPage } from './pages/SessionPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
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
        path="/courses/new"
        element={
          <PrivateRoute>
            <AppLayout>
              <CreateCoursePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:idOrSlug"
        element={
          <PrivateRoute>
            <AppLayout>
              <CoursePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/courses/:idOrSlug/lessons/:lessonId"
        element={
          <PrivateRoute>
            <AppLayout>
              <LessonPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <AppLayout>
              <SettingsPage />
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
