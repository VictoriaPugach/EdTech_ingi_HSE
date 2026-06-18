import { Button } from '../../../ui/Button';
import { PlusIcon } from '../../../ui/icons';
import styles from './AddCourseCard.module.scss';

interface AddCourseCardProps {
  onClick: () => void;
}

/**
 * Плитка-инициатор «Добавить курс» (Figma «Course_card / Dummy»):
 * ведёт в каталог курсов.
 */
export function AddCourseCard({ onClick }: AddCourseCardProps) {
  return (
    <article className={styles.card}>
      <span className={styles.badge}>
        <PlusIcon width={28} height={28} />
      </span>
      <h3 className={styles.title}>Добавить курс</h3>
      <p className={styles.subtitle}>Найдите новый курс и начните обучение</p>
      <Button variant="outline" onClick={onClick}>
        В каталог
      </Button>
    </article>
  );
}
