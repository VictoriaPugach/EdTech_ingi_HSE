import { Button } from '../../../ui/Button';
import { ProgressBar } from '../../../ui/ProgressBar';
import { Tag } from '../../../ui/Tag';
import { ChevronRightIcon } from '../../../ui/icons';
import styles from './CourseCard.module.scss';

export type CourseStatus = 'in-progress' | 'completed' | 'archived';

export interface CourseProgress {
  current: number;
  total: number;
  percent: number;
}

export interface CourseCardData {
  id: string;
  title: string;
  description: string;
  coverSrc: string;
  status: CourseStatus;
  /** Уровень курса, например «Для начинающих». */
  level?: string;
  progress?: CourseProgress;
}

interface CourseCardProps {
  course: CourseCardData;
  onOpen: (id: string) => void;
}

const STATUS_TAG: Record<CourseStatus, { label: string; tone: 'success' | 'neutral' } | null> = {
  'in-progress': null,
  completed: { label: 'Завершён', tone: 'success' },
  archived: { label: 'В архиве', tone: 'neutral' },
};

const STATUS_ACTION: Record<CourseStatus, string> = {
  'in-progress': 'Перейти к курсу',
  completed: 'Посмотреть сертификат',
  archived: 'Перейти к курсу',
};

/**
 * Карточка курса (Figma «Course_card») для каталога «Мои курсы».
 * Обложка + статус-теги, описание, прогресс и кнопка действия.
 */
export function CourseCard({ course, onOpen }: CourseCardProps) {
  const { id, title, description, coverSrc, status, level, progress } = course;
  const statusTag = STATUS_TAG[status];

  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        <img src={coverSrc} alt="" />
        <div className={styles.tags}>
          {level && <Tag tone="primary">{level}</Tag>}
          {statusTag && <Tag tone={statusTag.tone}>{statusTag.label}</Tag>}
        </div>
      </div>

      <div className={styles.content}>
        <header className={styles.heading}>
          <h3 className={styles.title}>{title}</h3>
          <ChevronRightIcon className={styles.chevron} width={16} height={16} />
        </header>

        <p className={styles.description}>{description}</p>

        {progress && (
          <div className={styles.progress}>
            <div className={styles.progressMeta}>
              <span>
                Урок {progress.current} из {progress.total}
              </span>
              <span>{progress.percent}%</span>
            </div>
            <ProgressBar value={progress.percent} />
          </div>
        )}

        <Button
          variant={status === 'in-progress' ? 'primary' : 'secondary'}
          fullWidth
          onClick={() => onOpen(id)}
        >
          {STATUS_ACTION[status]}
        </Button>
      </div>
    </article>
  );
}
