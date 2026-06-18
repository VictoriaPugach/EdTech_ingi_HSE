import { Card } from '../../../ui/Card';
import { SectionHeader } from '../../../ui/SectionHeader';
import { ProgramItem, type ProgramLesson } from './ProgramItem';
import styles from './CourseProgram.module.scss';

interface CourseProgramProps {
  lessons: ProgramLesson[];
  title?: string;
  onOpenLesson?: (id: string) => void;
}

/**
 * Блок «Программа курса» (Figma «Программа курса» + «Menu_point»):
 * заголовок и список уроков со статусами.
 */
export function CourseProgram({ lessons, title = 'Программа курса', onOpenLesson }: CourseProgramProps) {
  return (
    <Card padding="lg" radius="xl">
      <SectionHeader title={title} />
      <div className={styles.list}>
        {lessons.map((lesson) => (
          <ProgramItem key={lesson.id} lesson={lesson} onOpen={onOpenLesson} />
        ))}
      </div>
    </Card>
  );
}
