import styles from './TimeCard.module.scss';

interface TimeCardProps {
  /** Значение (например «00» или число). */
  value: string | number;
  /** Подпись под значением, например «Часов». */
  label: string;
  className?: string;
}

/**
 * Карточка единицы времени (Figma «Time_card»): крупное значение + подпись.
 * Из нескольких карточек собирается таймер обратного отсчёта до занятия.
 */
export function TimeCard({ value, label, className }: TimeCardProps) {
  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
