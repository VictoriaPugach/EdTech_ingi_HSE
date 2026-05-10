// =============================================================================
//  Mock-данные для главной страницы.
//  Используем как заглушку, пока нет API геймификации/расписания/проектов.
//  Реальные данные приедут с бекенда (см. ФТ-08, ФТ-13).
// =============================================================================

import prjctTravel from '../../assets/images/illustrations/prjct-travel.png';
import prjctSpace  from '../../assets/images/illustrations/prjct-space.png';
import prize1 from '../../assets/images/illustrations/prize1.png';
import prize2 from '../../assets/images/illustrations/prize2.png';
import prize3 from '../../assets/images/illustrations/prize3.png';

import type { ScheduleDay } from '../../components/features/home/ScheduleList';
import type { ProjectItem } from '../../components/features/home/ProjectsSection';
import type { AchievementItem } from '../../components/features/home/AchievementsSection';

export const SCHEDULE_DAYS: ScheduleDay[] = [
  {
    label: '16 мая, сегодня',
    entries: [
      { time: '17:00', title: 'Python: Функции и параметры', type: 'Практика' },
    ],
  },
  {
    label: '18 мая',
    entries: [
      { time: '17:00', title: 'Python: Функции и параметры', type: 'Практика' },
    ],
  },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: 'travel',
    title: 'Игра: Путешествие',
    updatedLabel: 'Обновлён сегодня',
    coverSrc: prjctTravel,
  },
  {
    id: 'space',
    title: 'Сайт: Космос',
    updatedLabel: 'Обновлён вчера',
    coverSrc: prjctSpace,
  },
];

export const ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'first-1',
    title: 'Первая программа',
    iconSrc: prize1,
    status: 'earned',
  },
  {
    id: 'first-2',
    title: 'Первая программа',
    iconSrc: prize2,
    status: 'in-progress',
    progress: 80,
  },
  {
    id: 'first-3',
    title: 'Первая программа',
    iconSrc: prize3,
    status: 'locked',
  },
];

export const UPCOMING_CLASS = {
  dateLabel: 'Сегодня, 16 мая',
  startsInLabel: 'Через 1 ч 30 мин',
  title: 'Python: Функции и параметры',
  timeLabel: '17:00 – 18:30 (МСК)',
  teacherName: 'Анна Сергеевна',
  platformLabel: 'Онлайн в *LOGO*',
};

export const QUICK_ACTIONS = {
  lesson: { current: 18, total: 24, title: 'Python Basics' },
  next:    { title: 'Циклы в Python',    topic: 'Условия и операторы' },
  practice:{ title: 'Сумма чисел',       reward: 'Решить задачу и получить +20XP' },
  project: { title: 'Игра: Путешествие', status: 'Продолжить работу' },
};
