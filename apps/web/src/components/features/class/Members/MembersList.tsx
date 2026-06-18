import { Card } from '../../../ui/Card';
import { SectionHeader } from '../../../ui/SectionHeader';
import { MemberItem, type MemberData } from './MemberItem';
import styles from './Members.module.scss';

interface MembersListProps {
  members: MemberData[];
  title?: string;
}

/**
 * Блок «Участники» (Figma «Lesson_members»): заголовок + список участников.
 */
export function MembersList({ members, title = 'Участники' }: MembersListProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionHeader title={`${title} · ${members.length}`} />
      <div className={styles.list}>
        {members.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))}
      </div>
    </Card>
  );
}
