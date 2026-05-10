import { Card } from '../../ui/Card';
import { ChevronRightIcon } from '../../ui/icons';
import styles from './ScheduleList.module.scss';

export interface ScheduleEntry {
  /** Время в формате "HH:MM". */
  time: string;
  title: string;
  type: string;
}

export interface ScheduleDay {
  /** Дата вверху группы, напр. «16 мая, сегодня». */
  label: string;
  entries: ScheduleEntry[];
}

interface ScheduleListProps {
  days: ScheduleDay[];
  onSeeAll: () => void;
}

/**
 * Расписание рядом с карточкой ближайшего занятия.
 * Группирует уроки по дням, в конце ссылка «Все занятия и расписание».
 */
export function ScheduleList({ days, onSeeAll }: ScheduleListProps) {
  return (
    <Card padding="lg" radius="xl" className={styles.card}>
      <div className={styles.list}>
        {days.map((day) => (
          <section key={day.label} className={styles.day}>
            <h4 className={styles.dayLabel}>{day.label}</h4>
            <div className={styles.entries}>
              {day.entries.map((e, i) => (
                <div key={`${day.label}-${i}`} className={styles.entry}>
                  <span className={styles.time}>{e.time}</span>
                  <div className={styles.entryText}>
                    <span className={styles.entryTitle}>{e.title}</span>
                    <span className={styles.entryType}>{e.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <button type="button" className={styles.seeAll} onClick={onSeeAll}>
        Все занятия и расписание
        <ChevronRightIcon width={14} height={14} />
      </button>
    </Card>
  );
}
