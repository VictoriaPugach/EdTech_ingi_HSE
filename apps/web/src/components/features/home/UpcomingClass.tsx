import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { SectionHeader } from '../../ui/SectionHeader';
import { CalendarIcon, ClockIcon, UserIcon, CameraIcon, ChevronRightIcon } from '../../ui/icons';
import calendarIllustration from '../../../assets/images/illustrations/calendar.png';
import styles from './UpcomingClass.module.scss';

interface UpcomingClassCardProps {
  /** Дата в человекочитаемом виде, напр. «Сегодня, 16 мая». */
  dateLabel: string;
  /** Подсказка о времени до начала, напр. «Через 1 ч 30 мин». */
  startsInLabel: string;
  /** Тема занятия. */
  title: string;
  /** Время начала и конца. */
  timeLabel: string;
  /** Имя преподавателя. */
  teacherName: string;
  /** Платформа («Онлайн в *LOGO*»). */
  platformLabel: string;
  onJoin: () => void;
  onRemind: () => void;
  onOpenCalendar: () => void;
}

/**
 * Большая карточка «Ближайшее занятие». Содержит детали урока и
 * 2 действия: войти в онлайн-класс / напомнить.
 */
export function UpcomingClassCard({
  dateLabel,
  startsInLabel,
  title,
  timeLabel,
  teacherName,
  platformLabel,
  onJoin,
  onRemind,
  onOpenCalendar,
}: UpcomingClassCardProps) {
  return (
    <Card padding="lg" radius="xl" className={styles.card}>
      <SectionHeader
        title="Ближайшее занятие"
        action={
          <button type="button" onClick={onOpenCalendar} className={styles.calendarLink}>
            <CalendarIcon width={16} height={16} />
            <span>Календарь</span>
            <ChevronRightIcon width={14} height={14} />
          </button>
        }
      />

      <div className={styles.body}>
        <img
          src={calendarIllustration}
          alt=""
          className={styles.illustration}
          aria-hidden="true"
        />

        <div className={styles.info}>
          <div className={styles.dateRow}>
            <span className={styles.date}>{dateLabel}</span>
            <span className={styles.startsIn}>{startsInLabel}</span>
          </div>

          <h3 className={styles.title}>{title}</h3>

          <ul className={styles.meta}>
            <li>
              <ClockIcon width={14} height={14} />
              <span>{timeLabel}</span>
            </li>
            <li>
              <UserIcon width={14} height={14} />
              <span>
                Преподаватель: <strong>{teacherName}</strong>
              </span>
            </li>
            <li>
              <CameraIcon width={14} height={14} />
              <span>{platformLabel}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.actions}>
        <Button onClick={onJoin} fullWidth leftIcon={<CameraIcon width={18} height={18} />}>
          В онлайн класс
        </Button>
        <Button variant="secondary" onClick={onRemind} fullWidth>
          Напомнить
        </Button>
      </div>
    </Card>
  );
}
