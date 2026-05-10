import { useNavigate } from 'react-router-dom';
import logoSvg from '../../../assets/icons/logo/logo.svg';
import {
  HomeIcon,
  CameraIcon,
  BookIcon,
  FolderIcon,
  TrophyIcon,
  StarIcon,
  TargetIcon,
} from '../../ui/icons';
import { NavItem } from './components/NavItem';
import { StatBlock } from './components/StatBlock';
import { UserProfileCard } from './components/UserProfileCard';
import styles from './Sidebar.module.scss';

interface SidebarProps {
  user: {
    name: string;
    roleLabel: string;
    avatarSrc?: string;
  };
  /** Прогресс уровня и ежедневной цели. */
  level:       { title: string; subtitle: string; progress: number };
  dailyGoal:   { title: string; subtitle: string; progress: number };
}

const NAV_ITEMS = [
  { to: '/',             label: 'Главная',     icon: <HomeIcon />,    end: true  },
  { to: '/class',        label: 'Онлайн класс', icon: <CameraIcon />               },
  { to: '/courses',      label: 'Мои курсы',    icon: <BookIcon />                 },
  { to: '/projects',     label: 'Проекты',      icon: <FolderIcon />               },
  { to: '/achievements', label: 'Достижения',   icon: <TrophyIcon />               },
];

/**
 * Левая фиксированная панель приложения.
 * Содержит логотип, основную навигацию, прогресс-блоки и карточку пользователя.
 * Переиспользуется на всех экранах внутри AppLayout.
 */
export function Sidebar({ user, level, dailyGoal }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className={styles.sidebar} aria-label="Основная навигация">
      <div className={styles.logo}>
        <img src={logoSvg} alt="LOGO" className={styles.logoImg} />
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((it) => (
          <NavItem key={it.to} {...it} />
        ))}
      </nav>

      <div className={styles.stats}>
        <StatBlock
          caption="ТЕКУЩИЙ УРОВЕНЬ"
          title={level.title}
          subtitle={level.subtitle}
          progress={level.progress}
          icon={<StarIcon />}
          tone="primary"
        />
        <StatBlock
          caption="ЕЖЕДНЕВНАЯ ЦЕЛЬ"
          title={dailyGoal.title}
          subtitle={dailyGoal.subtitle}
          progress={dailyGoal.progress}
          icon={<TargetIcon />}
          tone="success"
        />
      </div>

      <UserProfileCard
        name={user.name}
        roleLabel={user.roleLabel}
        avatarSrc={user.avatarSrc}
        onOpenProfile={() => navigate('/profile')}
      />
    </aside>
  );
}
