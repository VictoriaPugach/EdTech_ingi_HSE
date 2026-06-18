import type { ReactNode } from 'react';
import styles from './Banner.module.scss';

interface BannerProps {
  title: ReactNode;
  /** Строка метаданных под заголовком (чипы: уровень, кол-во уроков и т. п.). */
  meta?: ReactNode;
  description?: string;
  /** Иллюстрация-фон баннера (выгружается из Figma). */
  backgroundSrc: string;
  /** Доп. контент в нижней части (CTA-кнопка, таймер обратного отсчёта). */
  children?: ReactNode;
}

/**
 * Hero-баннер страницы (Figma «Banner»): фиолетовый блок с иллюстрацией справа,
 * заголовком, метаданными и слотом для действия/таймера. Переиспользуется на
 * страницах курса и урока.
 */
export function Banner({ title, meta, description, backgroundSrc, children }: BannerProps) {
  return (
    <section
      className={styles.banner}
      style={{ backgroundImage: `url(${backgroundSrc})` }}
    >
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {meta && <div className={styles.meta}>{meta}</div>}
        {description && <p className={styles.description}>{description}</p>}
        {children && <div className={styles.extra}>{children}</div>}
      </div>
    </section>
  );
}
