import type { ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  title: string;
  /** Опциональная ссылка в правом углу. */
  action?: ReactNode;
  className?: string;
}

/**
 * Заголовок секции с опциональным правым действием:
 *   [Заголовок]                       [Все →]
 * Используется поверх блоков «Мои проекты», «Достижения», «Расписание».
 */
export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={[styles.row, className ?? ''].filter(Boolean).join(' ')}>
      <h3 className={styles.title}>{title}</h3>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
