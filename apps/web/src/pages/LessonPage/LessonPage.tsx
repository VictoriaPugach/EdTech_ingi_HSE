import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { LessonDetailDto, LessonType } from '@edtech/shared';
import { Banner } from '../../components/layout/Banner';
import { Tabs, type TabItem } from '../../components/ui/Tabs';
import { InfoCard } from '../../components/ui/InfoCard';
import { BookIcon, ClockIcon, CodeIcon, StarIcon, CameraIcon } from '../../components/ui/icons';
import { LessonContent } from '../../components/features/lesson/LessonContent';
import { LessonCountdown } from '../../components/features/lesson/LessonCountdown';
import { MaterialsBlock, type MaterialData } from '../../components/features/course/Materials';
import { MembersList, type MemberData } from '../../components/features/class/Members';
import { CourseProgram, type ProgramLesson } from '../../components/features/course/CourseProgram';
import { useAuth } from '../../hooks/useAuth';
import { coursesApi } from '../../services/courses/coursesApi';
import lessonBanner from '../../assets/images/banners/lesson-banner.png';
import styles from './LessonPage.module.scss';

const LEVEL_LABEL = {
  beginner: 'Для начинающих',
  intermediate: 'Средний уровень',
  advanced: 'Для продвинутых',
} as const;

const TYPE_LABEL: Record<LessonType, string> = {
  reading: 'Чтение',
  video: 'Видео',
  practice: 'Практика',
  quiz: 'Тест',
  live_coding: 'Онлайн-урок',
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toMaterials(lesson: LessonDetailDto): MaterialData[] {
  return lesson.materials.map((m) => ({
    id: m.id,
    name: m.title,
    format: m.format.toUpperCase(),
    size: formatSize(m.sizeBytes),
  }));
}

/**
 * Страница урока (Figma «Lesson_page»): наполнение и материалы урока в основной
 * колонке + подключение к занятию, преподаватель и программа курса в сайдбаре.
 */
export function LessonPage() {
  const { idOrSlug, lessonId } = useParams<{ idOrSlug: string; lessonId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<LessonDetailDto | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState('overview');
  // Время начала занятия (заглушка ~20 мин): расписание занятий — backlog,
  // см. docs/database-architecture.md §6.
  const [classStartsAt] = useState(() => new Date(Date.now() + 20 * 60 * 1000));

  useEffect(() => {
    if (!token || !lessonId) return;
    let cancelled = false;
    setStatus('loading');
    coursesApi
      .getLesson(token, lessonId)
      .then((data) => {
        if (cancelled) return;
        setLesson(data);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [token, lessonId]);

  if (status === 'loading') return <p className={styles.note}>Загрузка урока…</p>;
  if (status === 'error' || !lesson) return <p className={styles.note}>Урок не найден.</p>;

  const courseSlug = idOrSlug ?? lesson.course.slug;

  // Все уроки программы кликабельны; активный помечаем «текущим».
  const program: ProgramLesson[] = lesson.siblings.map((s) => ({
    id: s.id,
    title: s.title,
    index: s.order + 1,
    status: 'current',
    meta: s.id === lesson.id ? 'сейчас' : undefined,
  }));

  const teacher: MemberData[] = lesson.course.teacherName
    ? [{ id: 'teacher', name: lesson.course.teacherName, role: 'Преподаватель', isTeacher: true }]
    : [];

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Обзор', content: <LessonContent blocks={lesson.blocks} /> },
    { id: 'materials', label: 'Материалы', content: <MaterialsBlock items={toMaterials(lesson)} /> },
  ];

  return (
    <div className={styles.page}>
      <Link to={`/courses/${courseSlug}`} className={styles.back}>
        ← Назад к курсу «{lesson.course.title}»
      </Link>

      <Banner
        title={lesson.title}
        backgroundSrc={lessonBanner}
        description={lesson.summary ?? undefined}
        meta={
          <>
            <span>{TYPE_LABEL[lesson.type]}</span>
            {lesson.durationMin && <span>· {lesson.durationMin} минут</span>}
            <span>· Онлайн в LOGO</span>
          </>
        }
      >
        {lesson.type === 'live_coding' && (
          <LessonCountdown
            targetAt={classStartsAt}
            joinIcon={<CameraIcon width={18} height={18} />}
            onJoin={() => navigate(`/s/lesson-${lesson.id}`)}
          />
        )}
      </Banner>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.info}>
            <InfoCard icon={<StarIcon />} label="Тип урока" value={TYPE_LABEL[lesson.type]} />
            <InfoCard
              icon={<ClockIcon />}
              label="Длительность"
              value={lesson.durationMin ? `${lesson.durationMin} мин` : '—'}
            />
            <InfoCard icon={<BookIcon />} label="Уровень" value={LEVEL_LABEL[lesson.course.level]} />
            <InfoCard
              icon={<CodeIcon />}
              label="Язык"
              value={lesson.course.language === 'python' ? 'Python' : 'JavaScript'}
            />
          </div>

          <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
        </div>

        <aside className={styles.sidebar}>
          {teacher.length > 0 && <MembersList members={teacher} title="Преподаватель" />}
          <CourseProgram
            title="Программа курса"
            lessons={program}
            onOpenLesson={(id) => navigate(`/courses/${courseSlug}/lessons/${id}`)}
          />
        </aside>
      </div>
    </div>
  );
}
