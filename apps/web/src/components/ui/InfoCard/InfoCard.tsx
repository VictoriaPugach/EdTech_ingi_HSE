import type { ReactNode } from 'react';
import styles from './InfoCard.module.scss';

interface InfoCardProps {
  /** Иконка в цветном бейдже слева. */
  icon: ReactNode;
  /** Верхняя подпись (приглушённая). */
  label: string;
  /** Основное значение. */
  value: ReactNode;
  className?: string;
}

/**
 * Компактная карточка «иконка + подпись + значение» (Figma «Info_card»).
 * Используется на странице курса/урока для метаданных (тема, длительность и т. п.).
 */
export function InfoCard({ icon, label, value, className }: InfoCardProps) {
  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      <span className={styles.badge}>{icon}</span>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
    </div>
  );
}
