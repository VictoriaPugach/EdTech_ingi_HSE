import type { ReactNode } from 'react';
import { Button } from '../../ui/Button';
import { ProgressBar } from '../../ui/ProgressBar';
import { StarIcon } from '../../ui/icons';
import pythonLogo from '../../../assets/icons/ui/python-logo.svg';
import styles from './QuickActions.module.scss';

// =============================================================================
//  QuickActions — верхний ряд из 4 карточек на дашборде.
//  Каждая карточка — самостоятельный переиспользуемый блок:
//    • LessonProgressCard
//    • NextLessonCard
//    • PracticeCard
//    • ProjectInProgressCard
//  Все они шарят общий контейнер `ActionCard`, чтобы единообразно
//  выглядеть и легко тянуться по высоте в grid-row.
// =============================================================================

export function QuickActionsRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

// ─── Общий каркас карточки ────────────────────────────────────────────────────

interface ActionCardProps {
  caption: string;
  captionTone?: 'primary' | 'muted';
  title: string;
  description?: string;
  illustration?: ReactNode;
  /** Низ карточки: либо кнопка, либо progress bar. */
  footer: ReactNode;
}

function ActionCard({
  caption,
  captionTone = 'muted',
  title,
  description,
  illustration,
  footer,
}: ActionCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={[styles.caption, styles[`caption-${captionTone}`]].join(' ')}>
            {caption}
          </span>
          <h4 className={styles.title}>{title}</h4>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {illustration && (
          <div className={styles.illustration} aria-hidden="true">
            {illustration}
          </div>
        )}
      </div>

      <div className={styles.footer}>{footer}</div>
    </article>
  );
}

// ─── Composition wrappers ────────────────────────────────────────────────────

interface LessonProgressCardProps {
  current: number;
  total: number;
  title: string;
}

export function LessonProgressCard({ current, total, title }: LessonProgressCardProps) {
  const progress = Math.round((current / total) * 100);

  return (
    <ActionCard
      caption={`Урок ${current} из ${total}`}
      captionTone="primary"
      title={title}
      description={`Урок ${current} из ${total}`}
      illustration={<img src={pythonLogo} alt="" className={styles.iconImg} />}
      footer={
        <div className={styles.progressRow}>
          <ProgressBar value={progress} tone="primary" />
          <span className={styles.progressValue}>{progress}%</span>
        </div>
      }
    />
  );
}

interface NextLessonCardProps {
  title: string;
  topic: string;
  onContinue: () => void;
}

export function NextLessonCard({ title, topic, onContinue }: NextLessonCardProps) {
  return (
    <ActionCard
      caption="Следующий урок"
      title={title}
      description={topic}
      footer={
        <Button variant="secondary" size="sm" fullWidth onClick={onContinue}>
          Продолжить
        </Button>
      }
    />
  );
}

interface PracticeCardProps {
  title: string;
  reward: string;
  onSolve: () => void;
}

export function PracticeCard({ title, reward, onSolve }: PracticeCardProps) {
  return (
    <ActionCard
      caption="Практика дня"
      title={title}
      description={reward}
      footer={
        <Button
          size="sm"
          fullWidth
          onClick={onSolve}
          className={styles.solveBtn}
          rightIcon={<StarIcon width={16} height={16} />}
        >
          Решить
        </Button>
      }
    />
  );
}

interface ProjectInProgressCardProps {
  title: string;
  status: string;
  onContinue: () => void;
}

export function ProjectInProgressCard({ title, status, onContinue }: ProjectInProgressCardProps) {
  return (
    <ActionCard
      caption="Проект"
      title={title}
      description={status}
      footer={
        <Button variant="secondary" size="sm" fullWidth onClick={onContinue}>
          Продолжить
        </Button>
      }
    />
  );
}
