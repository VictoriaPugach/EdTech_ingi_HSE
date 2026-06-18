import { CheckCircleIcon, LockIcon, PlayIcon } from '../../../ui/icons';
import styles from './CourseProgram.module.scss';

export type LessonStatus = 'done' | 'current' | 'locked';

export interface ProgramLesson {
  id: string;
  title: string;
  /** Порядковый номер урока. */
  index: number;
  status: LessonStatus;
  /** Подпись справа, например «18:00 · 45 мин». */
  meta?: string;
}

interface ProgramItemProps {
  lesson: ProgramLesson;
  onOpen?: (id: string) => void;
}

const STATUS_ICON = {
  done: CheckCircleIcon,
  current: PlayIcon,
  locked: LockIcon,
} as const;

/**
 * Пункт программы курса (Figma «Menu_point»): статус-иконка,
 * номер и название урока, опциональная мета. Заблокированные — некликабельны.
 */
export function ProgramItem({ lesson, onOpen }: ProgramItemProps) {
  const { id, title, index, status, meta } = lesson;
  const StatusIcon = STATUS_ICON[status];
  const locked = status === 'locked';

  return (
    <button
      type="button"
      className={[styles.item, styles[status]].join(' ')}
      onClick={() => !locked && onOpen?.(id)}
      disabled={locked}
    >
      <span className={styles.status}>
        <StatusIcon width={18} height={18} />
      </span>

      <span className={styles.body}>
        <span className={styles.index}>Урок {index}</span>
        <span className={styles.title}>{title}</span>
      </span>

      {meta && <span className={styles.meta}>{meta}</span>}
    </button>
  );
}
