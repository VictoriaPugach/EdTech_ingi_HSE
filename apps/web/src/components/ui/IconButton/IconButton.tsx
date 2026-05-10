import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.scss';

type IconButtonVariant = 'surface' | 'soft' | 'ghost';
type IconButtonSize    = 'sm' | 'md';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** SVG / ReactNode иконка. */
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Доступное имя для скрин-ридеров (рекомендуется). */
  'aria-label': string;
}

/**
 * Кнопка с иконкой (скруглённый квадрат / squircle с фоном по макету).
 * Используется в шапке и везде, где нужна компактная иконка-действие.
 */
export function IconButton({
  variant = 'surface',
  size = 'md',
  className,
  children,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.btn,
    styles[`v-${variant}`],
    styles[`s-${size}`],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} {...rest}>
      <span className={styles.icon} aria-hidden="true">
        {children}
      </span>
    </button>
  );
}
