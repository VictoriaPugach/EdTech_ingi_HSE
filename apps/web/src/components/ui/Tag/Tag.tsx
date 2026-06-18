import type { ReactNode } from 'react';
import styles from './Tag.module.scss';

type TagTone = 'primary' | 'success' | 'neutral' | 'warning';

interface TagProps {
  children: ReactNode;
  tone?: TagTone;
  /** Необязательная иконка слева от текста. */
  icon?: ReactNode;
  className?: string;
}

/**
 * Pill-тег (Figma «Time_Tag»). Используется для статусов курса/урока
 * («Завершён», «Для начинающих», «В архиве») и временных меток.
 */
export function Tag({ children, tone = 'primary', icon, className }: TagProps) {
  const classes = [styles.tag, styles[`tone-${tone}`], className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}
