import styles from './ProgressBar.module.scss';

type ProgressTone = 'primary' | 'success';
type ProgressSize = 'sm' | 'md';

interface ProgressBarProps {
  /** 0..100 */
  value: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  className?: string;
  ariaLabel?: string;
}

/**
 * Тонкий горизонтальный progress bar.
 * Используется в карточке урока, в блоках уровня и ежедневной цели.
 */
export function ProgressBar({
  value,
  tone = 'primary',
  size = 'sm',
  className,
  ariaLabel,
}: ProgressBarProps) {
  const safe = Math.min(100, Math.max(0, value));

  return (
    <div
      className={[styles.track, styles[`size-${size}`], className ?? '']
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safe}
      aria-label={ariaLabel}
    >
      <span
        className={[styles.fill, styles[`tone-${tone}`]].join(' ')}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}
