import type { ReactNode } from 'react';
import { Button } from '../../../ui/Button';
import styles from './RoleCard.module.scss';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function RoleCard({ icon, title, description, selected, onSelect }: RoleCardProps) {
  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onSelect() : undefined}
    >
      <div className={styles.iconWrap}>{icon}</div>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
      <Button
        variant={selected ? 'primary' : 'outline'}
        size="sm"
        fullWidth
        className={styles.selectBtn}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        Выбрать
      </Button>
    </div>
  );
}
