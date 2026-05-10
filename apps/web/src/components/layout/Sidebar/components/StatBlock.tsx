import type { ReactNode } from 'react';
import { ProgressBar } from '../../../ui/ProgressBar';
import styles from './StatBlock.module.scss';

type StatTone = 'primary' | 'success';

interface StatBlockProps {
  /** Заголовок секции выше карточки, например «ТЕКУЩИЙ УРОВЕНЬ». */
  caption: string;
  /** Главный текст в карточке («Уровень 12», «Реши 3 задачи»). */
  title: string;
  /** Подпись под главным текстом («850/1200 XP», «2/3»). */
  subtitle: string;
  /** Иконка в правом углу. */
  icon: ReactNode;
  /** 0..100 — заполнение progress bar. */
  progress: number;
  /** Цветовой тон. primary = фиолетовый, success = зелёный. */
  tone?: StatTone;
}

/**
 * Карточка статистики на боковой панели — переиспользуется для блоков
 * «Текущий уровень» и «Ежедневная цель» (отличаются tone и иконкой).
 */
export function StatBlock({
  caption,
  title,
  subtitle,
  icon,
  progress,
  tone = 'primary',
}: StatBlockProps) {
  return (
    <section className={styles.section}>
      <p className={styles.caption}>{caption}</p>

      <div className={[styles.card, styles[`tone-${tone}`]].join(' ')}>
        <div className={styles.row}>
          <div className={styles.text}>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{subtitle}</span>
          </div>
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        </div>

        <ProgressBar value={progress} tone={tone} ariaLabel={caption} />
      </div>
    </section>
  );
}
