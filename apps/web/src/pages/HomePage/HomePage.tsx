import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import {
  QuickActionsRow,
  LessonProgressCard,
  NextLessonCard,
  PracticeCard,
  ProjectInProgressCard,
  UpcomingClassCard,
  ScheduleList,
  ProjectsSection,
  AchievementsSection,
} from '../../components/features/home';
import { useAuth } from '../../hooks/useAuth';
import {
  ACHIEVEMENTS,
  PROJECTS,
  QUICK_ACTIONS,
  SCHEDULE_DAYS,
  UPCOMING_CLASS,
} from './mockData';
import styles from './HomePage.module.scss';

/**
 * Главная страница (дашборд ученика).
 * Композиция переиспользуемых блоков: PageHeader + QuickActions + расписание +
 * проекты + достижения. Все данные пока приходят из mockData; позже подменятся
 * вызовами API.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const firstName = (user?.name ?? 'Ученик').split(' ')[0];

  return (
    <div className={styles.page}>
      <PageHeader
        title={
          <>
            Привет, {firstName}! <span aria-hidden="true">👋</span>
          </>
        }
        subtitle="Продолжай обучение и создавай крутые проекты!"
      />

      {/* ── Быстрые действия (4 карточки) ─────────────────────────────────── */}
      <QuickActionsRow>
        <LessonProgressCard
          current={QUICK_ACTIONS.lesson.current}
          total={QUICK_ACTIONS.lesson.total}
          title={QUICK_ACTIONS.lesson.title}
        />
        <NextLessonCard
          title={QUICK_ACTIONS.next.title}
          topic={QUICK_ACTIONS.next.topic}
          onContinue={() => navigate('/courses')}
        />
        <PracticeCard
          title={QUICK_ACTIONS.practice.title}
          reward={QUICK_ACTIONS.practice.reward}
          onSolve={() => navigate('/practice')}
        />
        <ProjectInProgressCard
          title={QUICK_ACTIONS.project.title}
          status={QUICK_ACTIONS.project.status}
          onContinue={() => navigate('/projects')}
        />
      </QuickActionsRow>

      {/* ── Ближайшее занятие + расписание ────────────────────────────────── */}
      <section className={styles.lessonSection}>
        <UpcomingClassCard
          {...UPCOMING_CLASS}
          onJoin={() => navigate('/class')}
          onRemind={() => { /* TODO: подключить нотификации */ }}
          onOpenCalendar={() => navigate('/schedule')}
        />
        <ScheduleList days={SCHEDULE_DAYS} onSeeAll={() => navigate('/schedule')} />
      </section>

      {/* ── Проекты + Достижения ──────────────────────────────────────────── */}
      <section className={styles.bottomSection}>
        <ProjectsSection
          projects={PROJECTS}
          onOpen={(id) => navigate(`/projects/${id}`)}
          onCreate={() => navigate('/projects/new')}
          onSeeAll={() => navigate('/projects')}
        />
        <AchievementsSection
          items={ACHIEVEMENTS}
          onSeeAll={() => navigate('/achievements')}
        />
      </section>
    </div>
  );
}
