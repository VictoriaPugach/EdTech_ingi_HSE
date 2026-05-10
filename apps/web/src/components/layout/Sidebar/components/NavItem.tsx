import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './NavItem.module.scss';

export interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  /** Совпадение строго по пути (для «Главная» = "/"). */
  end?: boolean;
}

/**
 * Один пункт боковой навигации с активным состоянием по текущему URL.
 */
export function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [styles.item, isActive ? styles.active : ''].filter(Boolean).join(' ')
      }
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}
