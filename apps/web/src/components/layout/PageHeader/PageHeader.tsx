import type { ReactNode } from 'react';
import { IconButton } from '../../ui/IconButton';
import bellSvg     from '../../../assets/icons/ui/ui-notification.svg';
import settingsSvg from '../../../assets/icons/ui/ui-settings.svg';
import profileSvg  from '../../../assets/icons/ui/ui-profile.svg';
import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  /** Главная строка ("Привет, Антон!") — может содержать эмодзи/иконки. */
  title: ReactNode;
  /** Подзаголовок (по желанию). */
  subtitle?: string;
  /**
   * Дополнительные действия в правой части шапки.
   * Если не передано — отрисует стандартный набор (профиль/настройки/уведомления).
   */
  actions?: ReactNode;
}

/**
 * Шапка страницы: приветствие + иконки в правом углу.
 * Переиспользуется на любом экране внутри AppLayout.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>{actions ?? <DefaultActions />}</div>
    </header>
  );
}

function DefaultActions() {
  return (
    <>
      <IconButton aria-label="Профиль">
        <img src={profileSvg} alt="" />
      </IconButton>
      <IconButton aria-label="Настройки">
        <img src={settingsSvg} alt="" />
      </IconButton>
      <IconButton aria-label="Уведомления">
        <img src={bellSvg} alt="" />
      </IconButton>
    </>
  );
}

