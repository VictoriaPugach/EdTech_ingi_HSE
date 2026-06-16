// =============================================================================
//  Mock-данные для страницы «Мои курсы».
//  Заглушка до подключения API каталога/прогресса курсов.
// =============================================================================

import heroCoding from '../../assets/images/illustrations/hero-coding.png';
import prjctSpace from '../../assets/images/illustrations/prjct-space.png';
import prjctTravel from '../../assets/images/illustrations/prjct-travel.png';
import prize1 from '../../assets/images/illustrations/prize1.png';
import calendar from '../../assets/images/illustrations/calendar.png';

import type { CourseCardData } from '../../components/features/courses';

export const COURSES: CourseCardData[] = [
  {
    id: 'python-basics',
    title: 'Python Basics',
    description: 'Изучаем основы Python с нуля: синтаксис, переменные, условия и циклы.',
    coverSrc: heroCoding,
    status: 'in-progress',
    level: 'Для начинающих',
    progress: { current: 18, total: 24, percent: 70 },
  },
  {
    id: 'java-basics',
    title: 'Java для начинающих',
    description: 'Основы программирования на Java: переменные, классы, объекты.',
    coverSrc: prjctTravel,
    status: 'in-progress',
    level: 'Для начинающих',
    progress: { current: 6, total: 20, percent: 30 },
  },
  {
    id: 'react-web',
    title: 'Веб-разработка на React',
    description: 'Создаём современные веб-приложения с помощью React и Redux.',
    coverSrc: prize1,
    status: 'in-progress',
    level: 'Для продвинутых',
    progress: { current: 2, total: 16, percent: 12 },
  },
  {
    id: 'pygame',
    title: 'Разработка игр на Python',
    description: 'Создаём простые 2D-игры с помощью Pygame и изучаем игровую логику.',
    coverSrc: prjctSpace,
    status: 'in-progress',
    level: 'Новый',
    progress: { current: 0, total: 18, percent: 0 },
  },
  {
    id: 'data-python',
    title: 'Анализ данных с Python',
    description: 'Работаем с данными: Pandas, визуализация, статистика и реальные кейсы.',
    coverSrc: prjctSpace,
    status: 'completed',
    level: 'Для продвинутых',
  },
  {
    id: 'scratch-intro',
    title: 'Scratch: первые шаги',
    description: 'Знакомимся с программированием через визуальные блоки Scratch.',
    coverSrc: calendar,
    status: 'archived',
    level: 'Для начинающих',
  },
];
