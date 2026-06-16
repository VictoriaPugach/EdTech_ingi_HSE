import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { CourseDetailDto } from '@edtech/shared';
import { PageHeader } from '../../components/layout/PageHeader';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { InfoCard } from '../../components/ui/InfoCard';
import { BookIcon, ClockIcon, CodeIcon, StarIcon } from '../../components/ui/icons';
import { CourseProgram, type ProgramLesson } from '../../components/features/course/CourseProgram';
import { MaterialsBlock, type MaterialData } from '../../components/features/course/Materials';
import { useAuth } from '../../hooks/useAuth';
import { coursesApi } from '../../services/courses/coursesApi';
import styles from './CoursePage.module.scss';

const LEVEL_LABEL = {
  beginner: 'Для начинающих',
  intermediate: 'Средний уровень',
  advanced: 'Для продвинутых',
} as const;

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toMaterials(course: CourseDetailDto): MaterialData[] {
  return course.materials.map((m) => ({
    id: m.id,
    name: m.title,
    format: m.format.toUpperCase(),
    size: formatSize(m.sizeBytes),
  }));
}

/** Уроки модуля → пункты программы. Прогресс появится с записями (enrollment). */
function toProgram(lessons: CourseDetailDto['modules'][number]['lessons'], offset: number): ProgramLesson[] {
  return lessons.map((l, i) => ({
    id: l.id,
    title: l.title,
    index: offset + i + 1,
    status: 'current',
    meta: l.durationMin ? `${l.durationMin} мин` : undefined,
  }));
}

/**
 * Страница курса (Figma «Course_Page»): шапка, ключевые метаданные и табы
 * «Программа» / «Материалы». Программа рендерится по модулям курса.
 */
export function CoursePage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { token } = useAuth();

  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState('program');

  useEffect(() => {
    if (!token || !idOrSlug) return;
    let cancelled = false;
    setStatus('loading');
    coursesApi
      .get(token, idOrSlug)
      .then((data) => {
        if (cancelled) return;
        setCourse(data);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token, idOrSlug]);

  if (status === 'loading') return <p className={styles.note}>Загрузка курса…</p>;
  if (status === 'error' || !course) return <p className={styles.note}>Курс не найден.</p>;

  // Сквозная нумерация уроков по всем модулям.
  let offset = 0;
  const program = course.modules.map((m) => {
    const lessons = toProgram(m.lessons, offset);
    offset += m.lessons.length;
    return { module: m, lessons };
  });

  const tabs: TabItem[] = [
    {
      id: 'program',
      label: 'Программа',
      content: (
        <div className={styles.stack}>
          {program.map(({ module, lessons }) => (
            <CourseProgram key={module.id} title={module.title} lessons={lessons} />
          ))}
        </div>
      ),
    },
    {
      id: 'materials',
      label: 'Материалы',
      content: <MaterialsBlock items={toMaterials(course)} />,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title={course.title} subtitle={course.summary ?? undefined} />

      <div className={styles.info}>
        <InfoCard icon={<StarIcon />} label="Уровень" value={LEVEL_LABEL[course.level]} />
        <InfoCard icon={<BookIcon />} label="Уроков" value={course.lessonsCount} />
        <InfoCard
          icon={<ClockIcon />}
          label="Длительность"
          value={course.estimatedHours ? `${course.estimatedHours} ч` : '—'}
        />
        <InfoCard
          icon={<CodeIcon />}
          label="Язык"
          value={course.language === 'python' ? 'Python' : 'JavaScript'}
        />
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
    </div>
  );
}
