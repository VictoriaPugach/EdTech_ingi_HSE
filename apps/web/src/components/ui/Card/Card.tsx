import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.scss';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardRadius  = 'md' | 'lg' | 'xl';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  radius?: CardRadius;
  bordered?: boolean;
  hoverable?: boolean;
  children: ReactNode;
}

/**
 * Универсальная поверхность-карточка.
 * Используется как контейнер для любых блоков на дашборде, чтобы
 * не дублировать стили (radius / padding / border / shadow).
 */
export function Card({
  padding = 'md',
  radius = 'lg',
  bordered = true,
  hoverable = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[`pad-${padding}`],
    styles[`radius-${radius}`],
    bordered  ? styles.bordered  : '',
    hoverable ? styles.hoverable : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
