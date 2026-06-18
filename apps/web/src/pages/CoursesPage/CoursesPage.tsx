import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CourseLevel, CourseSummaryDto } from '@edtech/shared';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { PlusIcon } from '../../components/ui/icons';
import {
  AddCourseCard,
  CourseCard,
  type CourseCardData,
} from '../../components/features/courses';
import { useAuth } from '../../hooks/useAuth';
import { coursesApi } from '../../services/courses/coursesApi';
import coverFallback from '../../assets/images/illustrations/hero-coding.png';
import styles from './CoursesPage.module.scss';

const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: 'Для начинающих',
  intermediate: 'Средний уровень',
  advanced: 'Для продвинутых',
};

/** DTO курса → пропсы карточки каталога. Прогресс появится с записями (enrollment). */
function toCard(c: CourseSummaryDto): CourseCardData {
  return {
    id: c.slug,
    title: c.title,
    description: c.summary ?? '',
    coverSrc: c.coverUrl ?? coverFallback,
    status: c.status === 'archived' ? 'archived' : 'in-progress',
    level: LEVEL_LABEL[c.level],
  };
}

/**
 * Страница «Мои курсы» (Figma «My_Courses»).
 * Преподаватель/админ видят свои курсы и могут создать новый; ученик — каталог
 * опубликованных. Данные приходят из api-gateway (BC-3 LMS).
 */
export function CoursesPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const isManager = user?.role === 'teacher' || user?.role === 'admin';

  const [courses, setCourses] = useState<CourseSummaryDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatus('loading');
    coursesApi
      .list(token, { mine: isManager })
      .then((list) => {
        if (cancelled) return;
        setCourses(list);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token, isManager]);

  const openCourse = (slug: string) => navigate(`/courses/${slug}`);
  const createCourse = () => navigate('/courses/new');

  const active = useMemo(() => courses.filter((c) => c.status !== 'archived'), [courses]);
  const archived = useMemo(() => courses.filter((c) => c.status === 'archived'), [courses]);

  const tabs: TabItem[] = [
    {
      id: 'active',
      label: isManager ? 'Активные' : 'Все курсы',
      content: (
        <CourseGrid
          courses={active.map(toCard)}
          onOpen={openCourse}
          onAdd={isManager ? createCourse : undefined}
        />
      ),
    },
    {
      id: 'archived',
      label: 'Архив',
      content: <CourseGrid courses={archived.map(toCard)} onOpen={openCourse} />,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={isManager ? 'Мои курсы' : 'Курсы'}
        subtitle={
          isManager
            ? 'Управляйте своими курсами и создавайте новые'
            : 'Выбирайте курс и начинайте обучение'
        }
      />

      {isManager && (
        <div className={styles.toolbar}>
          <Button leftIcon={<PlusIcon width={18} height={18} />} onClick={createCourse}>
            Создать курс
          </Button>
        </div>
      )}

      {status === 'loading' && <p className={styles.note}>Загрузка курсов…</p>}
      {status === 'error' && (
        <p className={styles.note}>Не удалось загрузить курсы. Попробуйте обновить страницу.</p>
      )}
      {status === 'ready' && (
        <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CourseGridProps {
  courses: CourseCardData[];
  onOpen: (slug: string) => void;
  /** Если передан — в конце сетки показывается плитка «Добавить курс». */
  onAdd?: () => void;
}

function CourseGrid({ courses, onOpen, onAdd }: CourseGridProps) {
  if (courses.length === 0 && !onAdd) {
    return <p className={styles.note}>Здесь пока пусто.</p>;
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
