import { Card } from '../../ui/Card';
import { SectionHeader } from '../../ui/SectionHeader';
import { ChevronRightIcon, PlusIcon } from '../../ui/icons';
import styles from './ProjectsSection.module.scss';

export interface ProjectItem {
  id: string;
  title: string;
  /** Подпись «Обновлён сегодня» / «Обновлён вчера» и т. д. */
  updatedLabel: string;
  /** URL картинки-обложки. */
  coverSrc: string;
}

interface ProjectsSectionProps {
  projects: ProjectItem[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onSeeAll: () => void;
}

/**
 * Секция «Мои проекты»: горизонтальный ряд карточек проектов
 * + плитка-инициатор «Создать проект».
 */
export function ProjectsSection({ projects, onOpen, onCreate, onSeeAll }: ProjectsSectionProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionHeader
        title="Мои проекты"
        action={
          <button type="button" onClick={onSeeAll}>
            Все проекты
            <ChevronRightIcon width={14} height={14} />
          </button>
        }
      />

      <div className={styles.grid}>
        {projects.map((p) => (
          <ProjectTile key={p.id} project={p} onClick={() => onOpen(p.id)} />
        ))}
        <CreateTile onClick={onCreate} />
      </div>
    </Card>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProjectTile({ project, onClick }: { project: ProjectItem; onClick: () => void }) {
  return (
    <button type="button" className={styles.tile} onClick={onClick}>
      <div className={styles.cover}>
        <img src={project.coverSrc} alt="" />
      </div>
      <span className={styles.tileTitle}>{project.title}</span>
      <span className={styles.tileMeta}>{project.updatedLabel}</span>
    </button>
  );
}

function CreateTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={`${styles.tile} ${styles.createTile}`} onClick={onClick}>
      <div className={`${styles.cover} ${styles.createCover}`}>
        <PlusIcon width={28} height={28} />
      </div>
      <span className={styles.tileTitle}>Создать проект</span>
      <span className={styles.tileMeta}>Начни новый крутой проект</span>
    </button>
  );
}
