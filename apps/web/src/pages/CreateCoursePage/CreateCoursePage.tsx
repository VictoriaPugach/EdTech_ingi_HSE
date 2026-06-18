import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { CreateCourseInput } from '@edtech/shared';
import { PageHeader } from '../../components/layout/PageHeader';
import { CourseForm } from '../../components/features/courses';
import { useAuth } from '../../hooks/useAuth';
import { coursesApi, CoursesApiError } from '../../services/courses/coursesApi';
import styles from './CreateCoursePage.module.scss';

/**
 * Создание курса (Figma-флоу для преподавателя/админа).
 * Доступ только ролям teacher/admin; иначе — редирект в каталог.
 */
export function CreateCoursePage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isManager = user?.role === 'teacher' || user?.role === 'admin';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isManager) return <Navigate to="/courses" replace />;

  const handleSubmit = async (input: CreateCourseInput) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const course = await coursesApi.create(token, input);
      navigate(`/courses/${course.slug}`);
    } catch (e) {
      const message =
        e instanceof CoursesApiError && e.status === 403
          ? 'Недостаточно прав для создания курса.'
          : 'Не удалось создать курс. Проверьте поля и попробуйте снова.';
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Новый курс" subtitle="Заполните программу: модули и уроки" />
      <CourseForm onSubmit={handleSubmit} submitting={submitting} error={error} />
    </div>
  );
}
