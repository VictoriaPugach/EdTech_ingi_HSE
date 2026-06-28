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
import { StartClassButton } from '../../components/features/class/StartClassButton';
import { Button } from '../../components/ui/Button';
import {
  ACHIEVEMENTS,
  PROJECTS,
  QUICK_ACTIONS,
  SCHEDULE_DAYS,
  UPCOMING_CLASS,
} from './mockData';
import styles from './HomePage.module.scss';

// Демо-аккаунты из сидов (apps/api-gateway/prisma/seed.ts): для них дашборд
// показывает примеры (прогресс, расписание, проекты). Реальные новые пользователи
// видят чистый экран без фейковых данных. Чтобы оставить примеры и другим
// демо-аккаунтам — добавьте их email сюда.
const DEMO_EMAILS = new Set(['teacher@test.com']);

// ⚠️ ВРЕМЕННО (для защиты): общий урок с фиксированным id комнаты. Все участники,
// зайдя по этой ссылке, попадают в один и тот же онлайн-класс (редактор + чат).
// Сессии с таким id нет в БД → SessionPage подключается в анонимном режиме к
// общей realtime-комнате. После защиты этот блок и кнопку можно удалить.
const DEFENSE_SESSION_ID = 'defense';

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
  const isManager = user?.role === 'teacher' || user?.role === 'admin';
  // Примеры на дашборде — только для демо-аккаунтов; новым пользователям показываем
  // чистый экран без фейкового прогресса.
  const showDemoData = !!user && DEMO_EMAILS.has(user.email.toLowerCase());

  return (
    <div className={styles.page}>
      <PageHeader
        title={
          <>
            Привет, {firstName}! <span aria-hidden="true">👋</span>
          </>
        }
        subtitle={
          showDemoData
            ? 'Продолжай обучение и создавай крутые проекты!'
            : 'Добро пожаловать на платформу!'
        }
      />

      {/* ⚠️ ВРЕМЕННО (для защиты): общий урок для всех участников. Удалить после. */}
      <div className={styles.defense}>
        <span className={styles.defenseIcon} aria-hidden="true">🎓</span>
        <div className={styles.defenseText}>
          <h2 className={styles.defenseTitle}>Занятие «Защита»</h2>
          <p className={styles.defenseSubtitle}>
            Общий онлайн-класс для всех участников — заходите одновременно в одну комнату.
          </p>
        </div>
        <Button className={styles.defenseBtn} onClick={() => navigate(`/s/${DEFENSE_SESSION_ID}`)}>
          Присоединиться
        </Button>
      </div>

      {/* ── CTA преподавателя: создать живое занятие (у студентов скрыто) ──── */}
      <StartClassButton size="md" />

      {!showDemoData ? (
        <EmptyDashboard
          isManager={isManager}
          onBrowse={() => navigate('/courses')}
          onCreate={() => navigate('/courses/new')}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// ─── Пустой дашборд для новых пользователей ──────────────────────────────────

interface EmptyDashboardProps {
  isManager: boolean;
  onBrowse: () => void;
  onCreate: () => void;
}

/**
 * Чистый экран для только что зарегистрировавшихся пользователей: без фейкового
 * прогресса и расписания, с приглашением сделать первый шаг.
 */
function EmptyDashboard({ isManager, onBrowse, onCreate }: EmptyDashboardProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyEmoji} aria-hidden="true">🚀</span>
      <h2 className={styles.emptyTitle}>
        {isManager ? 'Создайте свой первый курс' : 'Начните обучение'}
      </h2>
      <p className={styles.emptyText}>
        {isManager
          ? 'Здесь появятся ваши курсы, занятия и прогресс учеников.'
          : 'Здесь появятся ваши уроки, достижения и прогресс. Выберите курс, чтобы сделать первый шаг.'}
      </p>
      <Button onClick={isManager ? onCreate : onBrowse}>
        {isManager ? 'Создать курс' : 'Выбрать курс'}
      </Button>
    </div>
  );
}
