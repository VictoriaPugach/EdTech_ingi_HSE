import { Card } from '../../ui/Card';
import { SectionHeader } from '../../ui/SectionHeader';
import { ProgressBar } from '../../ui/ProgressBar';
import { ChevronRightIcon, LockIcon } from '../../ui/icons';
import styles from './AchievementsSection.module.scss';

export type AchievementStatus = 'earned' | 'in-progress' | 'locked';

export interface AchievementItem {
  id: string;
  title: string;
  /** URL картинки бейджа. */
  iconSrc: string;
  status: AchievementStatus;
  /** 0..100, обязательный для status === 'in-progress'. */
  progress?: number;
}

interface AchievementsSectionProps {
  items: AchievementItem[];
  onSeeAll: () => void;
}

/**
 * Секция «Достижения»: список бейджей разных состояний
 * (получено / в процессе / заблокировано).
 */
export function AchievementsSection({ items, onSeeAll }: AchievementsSectionProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionHeader
        title="Достижения"
        action={
          <button type="button" onClick={onSeeAll}>
            Все
            <ChevronRightIcon width={14} height={14} />
          </button>
        }
      />

      <div className={styles.grid}>
        {items.map((it) => (
          <AchievementBadge key={it.id} item={it} />
        ))}
      </div>
    </Card>
  );
}

function AchievementBadge({ item }: { item: AchievementItem }) {
  const isLocked = item.status === 'locked';
  const isInProgress = item.status === 'in-progress';

  const statusLabel =
      item.status === 'earned'      ? 'Получено'
    : item.status === 'in-progress' ? 'В процессе'
    :                                 'Заблокировано';

  return (
    <div className={[styles.badge, styles[`status-${item.status}`]].join(' ')}>
      <div className={styles.icon}>
        <img src={item.iconSrc} alt="" />
        {isLocked && (
          <span className={styles.lockOverlay} aria-hidden="true">
            <LockIcon width={16} height={16} />
          </span>
        )}
      </div>

      <span className={styles.title}>{item.title}</span>
      <span className={styles.statusLabel}>{statusLabel}</span>

      {isInProgress && typeof item.progress === 'number' && (
        <div className={styles.progress}>
          <ProgressBar value={item.progress} tone="primary" />
          <span className={styles.progressValue}>{item.progress}%</span>
        </div>
      )}
    </div>
  );
}
