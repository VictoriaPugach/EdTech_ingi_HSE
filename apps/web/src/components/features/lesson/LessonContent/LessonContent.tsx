import type { LessonContentBlockDto } from '@edtech/shared';
import styles from './LessonContent.module.scss';

interface LessonContentProps {
  blocks: LessonContentBlockDto[];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Рендер наполнения урока (Figma «Обзор»). Маппит контент-блоки на разметку
 * по их типу. Формы данных описаны в docs/database-architecture.md §2.5.
 */
export function LessonContent({ blocks }: LessonContentProps) {
  if (blocks.length === 0) {
    return <p className={styles.empty}>Материалы урока пока готовятся.</p>;
  }

  return (
    <div className={styles.content}>
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: LessonContentBlockDto }) {
  const { kind, data } = block;

  switch (kind) {
    case 'text':
      return <p className={styles.text}>{str(data.markdown)}</p>;

    case 'callout':
      return (
        <div className={[styles.callout, styles[`tone-${str(data.tone) || 'info'}`]].join(' ')}>
          {str(data.markdown)}
        </div>
      );

    case 'code':
      return (
        <figure className={styles.code}>
          {str(data.language) && <figcaption className={styles.codeLang}>{str(data.language)}</figcaption>}
          <pre>
            <code>{str(data.code)}</code>
          </pre>
        </figure>
      );

    case 'image':
      return <img className={styles.image} src={str(data.url)} alt={str(data.alt)} />;

    case 'video':
      return (
        <a className={styles.video} href={str(data.url)} target="_blank" rel="noreferrer">
          ▶ Смотреть видео
        </a>
      );

    case 'quiz':
      return (
        <div className={styles.quiz}>
          <p className={styles.quizQuestion}>{str(data.question)}</p>
          {Array.isArray(data.options) && (
            <ul className={styles.quizOptions}>
              {(data.options as unknown[]).map((opt, i) => (
                <li key={i}>{str(opt)}</li>
              ))}
            </ul>
          )}
        </div>
      );

    default:
      return null;
  }
}
