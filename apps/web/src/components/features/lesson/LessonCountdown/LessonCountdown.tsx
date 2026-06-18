import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../../../ui/Button';
import { TimeCard } from '../../course/TimeCard';
import styles from './LessonCountdown.module.scss';

interface LessonCountdownProps {
  /** Время начала занятия. */
  targetAt: Date;
  onJoin: () => void;
  joinLabel?: string;
  joinIcon?: ReactNode;
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

function remaining(target: number) {
  const totalSec = Math.max(0, Math.floor((target - Date.now()) / 1000));
  return {
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

/**
 * Таймер обратного отсчёта до начала занятия (Figma «До начала урока»):
 * Time_cards Часов/Минут/Секунд + зелёная кнопка подключения.
 */
export function LessonCountdown({ targetAt, onJoin, joinLabel = 'Подключиться к звонку', joinIcon }: LessonCountdownProps) {
  const target = targetAt.getTime();
  const [time, setTime] = useState(() => remaining(target));

  useEffect(() => {
    const id = setInterval(() => setTime(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className={styles.countdown}>
      <span className={styles.label}>До начала урока</span>
      <div className={styles.timer}>
        <TimeCard value={pad(time.hours)} label="Часов" />
        <span className={styles.colon}>:</span>
        <TimeCard value={pad(time.minutes)} label="Минут" />
        <span className={styles.colon}>:</span>
        <TimeCard value={pad(time.seconds)} label="Секунд" />
      </div>
      <Button variant="success" leftIcon={joinIcon} onClick={onJoin}>
        {joinLabel}
      </Button>
    </div>
  );
}
