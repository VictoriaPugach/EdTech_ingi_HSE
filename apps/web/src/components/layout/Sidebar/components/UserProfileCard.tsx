import { Avatar } from '../../../ui/Avatar';
import { Button } from '../../../ui/Button';
import styles from './UserProfileCard.module.scss';

interface UserProfileCardProps {
  name: string;
  /** Подпись (например «Ученик» или «Преподаватель»). */
  roleLabel: string;
  avatarSrc?: string;
  onOpenProfile?: () => void;
}

/**
 * Нижняя карточка пользователя в сайдбаре: аватар, имя, роль и
 * переход в профиль. Внешний вид одинаковый для ученика и преподавателя.
 */
export function UserProfileCard({
  name,
  roleLabel,
  avatarSrc,
  onOpenProfile,
}: UserProfileCardProps) {
  return (
    <div className={styles.card}>
      <Avatar src={avatarSrc} name={name} size="md" />
      <div className={styles.text}>
        <span className={styles.name}>{name}</span>
        <span className={styles.role}>{roleLabel}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        fullWidth
        onClick={onOpenProfile}
        className={styles.btn}
      >
        Мой профиль
      </Button>
    </div>
  );
}
