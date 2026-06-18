import type { ReactNode } from 'react';
import { Avatar } from '../../../ui/Avatar';
import styles from './Members.module.scss';

export interface MemberData {
  id: string;
  name: string;
  /** Роль/подпись, например «Ведущий» или «Ученик». */
  role: string;
  avatarSrc?: string;
  /** Преподаватель выделяется акцентной рамкой. */
  isTeacher?: boolean;
}

interface MemberItemProps {
  member: MemberData;
  /** Действие/иконка справа (например, статус микрофона). */
  trailing?: ReactNode;
}

/**
 * Строка участника занятия (Figma «Member»): аватар, имя и роль.
 */
export function MemberItem({ member, trailing }: MemberItemProps) {
  const { name, role, avatarSrc, isTeacher } = member;

  return (
    <div className={[styles.item, isTeacher ? styles.teacher : ''].filter(Boolean).join(' ')}>
      <Avatar src={avatarSrc} name={name} size="sm" />
      <span className={styles.meta}>
        <span className={styles.name}>{name}</span>
        <span className={styles.role}>{role}</span>
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
    </div>
  );
}
