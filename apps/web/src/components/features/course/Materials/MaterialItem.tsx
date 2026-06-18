import { DownloadIcon, FileIcon } from '../../../ui/icons';
import styles from './Materials.module.scss';

export interface MaterialData {
  id: string;
  /** Название файла, например «Программа курса». */
  name: string;
  /** Формат: PDF, DOCX и т. п. */
  format: string;
  /** Человекочитаемый размер, например «245 KB». */
  size: string;
}

interface MaterialItemProps {
  material: MaterialData;
  onDownload?: (id: string) => void;
}

/**
 * Строка учебного материала (Figma «Materials»): иконка файла,
 * название, формат и размер + кнопка скачивания.
 */
export function MaterialItem({ material, onDownload }: MaterialItemProps) {
  const { id, name, format, size } = material;

  return (
    <div className={styles.item}>
      <span className={styles.fileBadge}>
        <FileIcon width={18} height={18} />
      </span>

      <span className={styles.meta}>
        <span className={styles.name}>{name}</span>
        <span className={styles.sub}>
          {format} · {size}
        </span>
      </span>

      <button
        type="button"
        className={styles.download}
        onClick={() => onDownload?.(id)}
        aria-label={`Скачать «${name}»`}
      >
        <DownloadIcon width={18} height={18} />
      </button>
    </div>
  );
}
