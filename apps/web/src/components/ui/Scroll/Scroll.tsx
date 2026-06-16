import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Scroll.module.scss';

interface ScrollProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Прокручиваемый контейнер с тонкой кастомной полосой (Figma «Scroll (vertical)»).
 * Высоту/максимальную высоту задаёт родитель через className.
 */
export function Scroll({ children, className, ...rest }: ScrollProps) {
  return (
    <div className={[styles.scroll, className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
