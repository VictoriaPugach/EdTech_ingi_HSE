import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { AddCourseCard, CourseCard, type CourseCardData } from '../../components/features/courses';
import { COURSES } from './mockData';
import styles from './CoursesPage.module.scss';

/**
 * Страница «Мои курсы» (Figma «My_Courses»).
 * Фильтрация по статусу через табы + сетка карточек курсов и плитка
 * добавления. Данные пока из mockData — позже заменятся вызовом API.
 */
export function CoursesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');

  const openCourse = (id: string) => navigate(`/courses/${id}`);
  const goToCatalog = () => navigate('/catalog');

  const active = useMemo(() => COURSES.filter((c) => c.status !== 'archived'), []);
  const archived = useMemo(() => COURSES.filter((c) => c.status === 'archived'), []);

  const tabs: TabItem[] = [
    {
      id: 'active',
      label: 'Все курсы',
      content: <CourseGrid courses={active} onOpen={openCourse} onAdd={goToCatalog} />,
    },
    {
      id: 'archived',
      label: 'Архив',
      content: <CourseGrid courses={archived} onOpen={openCourse} />,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Мои курсы" subtitle="Продолжай обучение и осваивай новые темы" />
      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CourseGridProps {
  courses: CourseCardData[];
  onOpen: (id: string) => void;
  /** Если передан — в конце сетки показывается плитка «Добавить курс». */
  onAdd?: () => void;
}

function CourseGrid({ courses, onOpen, onAdd }: CourseGridProps) {
  if (courses.length === 0 && !onAdd) {
    return <p className={styles.empty}>Здесь пока пусто.</p>;
  }

  return (
    <div className={styles.grid}>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onOpen={onOpen} />
      ))}
      {onAdd && <AddCourseCard onClick={onAdd} />}
    </div>
  );
}
