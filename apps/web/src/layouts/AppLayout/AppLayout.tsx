import { useState, type ReactNode } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { MenuIcon } from '../../components/ui/icons';
import profileAnton from '../../assets/images/illustrations/profile-anton.png';
import styles from './AppLayout.module.scss';

const COLLAPSE_KEY = 'sidebarCollapsed';

interface AppLayoutProps {
  children: ReactNode;
  /**
   * Если true, контент занимает всю высоту окна (без скролла страницы).
   * Используется на экране совместного редактирования кода.
   */
  fullHeight?: boolean;
}

/**
 * Базовый макет авторизованного приложения: фиксированный сайдбар слева
 * + основная область с контентом страницы. Прогресс-блоки и данные пользователя
 * пробрасываются в Sidebar (пока используются заглушки — позже подменятся
 * данными из API геймификации, ФТ-08/ФТ-13).
 */
export function AppLayout({ children, fullHeight = false }: AppLayoutProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  const toggleSidebar = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  const displayName = user?.name ?? 'Гость';
  const roleLabel =
    user?.role === 'teacher' ? 'Преподаватель'
    : user?.role === 'admin' ? 'Администратор'
    : 'Ученик';

  return (
    <div className={[styles.layout, fullHeight ? styles.fullHeight : ''].filter(Boolean).join(' ')}>
      {collapsed ? (
        <button className={styles.reopen} onClick={toggleSidebar} aria-label="Показать меню">
          <MenuIcon width={22} height={22} />
        </button>
      ) : (
        <Sidebar
          user={{ name: displayName, roleLabel, avatarSrc: profileAnton }}
          level={{ title: 'Уровень 12', subtitle: '850/1200 XP', progress: 71 }}
          dailyGoal={{ title: 'Реши 3 задачи', subtitle: '2/3', progress: 66 }}
          onCollapse={toggleSidebar}
        />
      )}

      <main className={styles.main}>{children}</main>
    </div>
  );
}
