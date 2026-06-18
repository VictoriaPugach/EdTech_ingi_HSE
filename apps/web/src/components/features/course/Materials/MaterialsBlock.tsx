import { Card } from '../../../ui/Card';
import { SectionHeader } from '../../../ui/SectionHeader';
import { MaterialItem, type MaterialData } from './MaterialItem';
import styles from './Materials.module.scss';

interface MaterialsBlockProps {
  items: MaterialData[];
  title?: string;
  onDownload?: (id: string) => void;
}

/**
 * Блок «Материалы» (Figma «Materials_block»): заголовок + список файлов.
 */
export function MaterialsBlock({ items, title = 'Материалы', onDownload }: MaterialsBlockProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionHeader title={title} />
      <div className={styles.list}>
        {items.map((material) => (
          <MaterialItem key={material.id} material={material} onDownload={onDownload} />
        ))}
      </div>
    </Card>
  );
}
