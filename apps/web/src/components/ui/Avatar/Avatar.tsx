import styles from './Avatar.module.scss';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * Круглый аватар пользователя.
 * Если src не передан — отображает инициалы на цветном фоне.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const classes = [styles.avatar, styles[`s-${size}`], className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} aria-hidden={!src}>
      {src ? (
        <img src={src} alt={name} className={styles.img} />
      ) : (
        <span className={styles.initials}>{initials || '?'}</span>
      )}
    </div>
  );
}
