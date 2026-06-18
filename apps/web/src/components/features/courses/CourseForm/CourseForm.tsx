import { useState, type FormEvent } from 'react';
import type { CourseLevel, CourseStatus, CreateCourseInput, LessonType } from '@edtech/shared';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { PlusIcon } from '../../../ui/icons';
import styles from './CourseForm.module.scss';

interface LessonDraft {
  title: string;
  type: LessonType;
  durationMin: string;
}

interface ModuleDraft {
  title: string;
  lessons: LessonDraft[];
}

interface CourseFormProps {
  onSubmit: (input: CreateCourseInput) => void;
  submitting: boolean;
  error?: string | null;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Для начинающих' },
  { value: 'intermediate', label: 'Средний уровень' },
  { value: 'advanced', label: 'Для продвинутых' },
];
const LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'published', label: 'Опубликован' },
];
const LESSON_TYPE_OPTIONS = [
  { value: 'reading', label: 'Чтение' },
  { value: 'video', label: 'Видео' },
  { value: 'practice', label: 'Практика' },
  { value: 'quiz', label: 'Тест' },
  { value: 'live_coding', label: 'Совместное кодирование' },
];

const emptyLesson = (): LessonDraft => ({ title: '', type: 'reading', durationMin: '' });
const emptyModule = (): ModuleDraft => ({ title: '', lessons: [emptyLesson()] });

/**
 * Форма создания курса (метаданные + модули и уроки). Управляет своим состоянием
 * и отдаёт готовый CreateCourseInput наружу через onSubmit.
 */
export function CourseForm({ onSubmit, submitting, error }: CourseFormProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<CourseLevel>('beginner');
  const [language, setLanguage] = useState('python');
  const [status, setStatus] = useState<CourseStatus>('draft');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [modules, setModules] = useState<ModuleDraft[]>([emptyModule()]);

  const updateModule = (mi: number, patch: Partial<ModuleDraft>) =>
    setModules((prev) => prev.map((m, i) => (i === mi ? { ...m, ...patch } : m)));

  const updateLesson = (mi: number, li: number, patch: Partial<LessonDraft>) =>
    setModules((prev) =>
      prev.map((m, i) =>
        i === mi
          ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) }
          : m,
      ),
    );

  const addModule = () => setModules((prev) => [...prev, emptyModule()]);
  const removeModule = (mi: number) => setModules((prev) => prev.filter((_, i) => i !== mi));
  const addLesson = (mi: number) =>
    setModules((prev) =>
      prev.map((m, i) => (i === mi ? { ...m, lessons: [...m.lessons, emptyLesson()] } : m)),
    );
  const removeLesson = (mi: number, li: number) =>
    setModules((prev) =>
      prev.map((m, i) =>
        i === mi ? { ...m, lessons: m.lessons.filter((_, j) => j !== li) } : m,
      ),
    );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: CreateCourseInput = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      description: description.trim() || undefined,
      level,
      language: language as CreateCourseInput['language'],
      status,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      modules: modules
        .filter((m) => m.title.trim())
        .map((m) => ({
          title: m.title.trim(),
          lessons: m.lessons
            .filter((l) => l.title.trim())
            .map((l) => ({
              title: l.title.trim(),
              type: l.type,
              durationMin: l.durationMin ? Number(l.durationMin) : undefined,
            })),
        })),
    };
    onSubmit(input);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Card padding="lg" radius="xl">
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Основное</h2>
          <Input
            label="Название курса"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Python Basics"
            required
          />
          <Input
            label="Краткое описание"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Одна строка для карточки каталога"
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="course-description">
              Полное описание
            </label>
            <textarea
              id="course-description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Подробное описание курса (поддерживается Markdown)"
            />
          </div>
          <div className={styles.row}>
            <Select
              label="Сложность"
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(e) => setLevel(e.target.value as CourseLevel)}
            />
            <Select
              label="Язык"
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
            <Select
              label="Статус"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as CourseStatus)}
            />
            <Input
              label="Часов"
              type="number"
              min={0}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="24"
            />
          </div>
        </div>
      </Card>

      {modules.map((module, mi) => (
        <Card key={mi} padding="lg" radius="xl">
          <div className={styles.section}>
            <div className={styles.moduleHead}>
              <Input
                label={`Модуль ${mi + 1}`}
                value={module.title}
                onChange={(e) => updateModule(mi, { title: e.target.value })}
                placeholder="Название модуля"
                className={styles.grow}
              />
              {modules.length > 1 && (
                <Button type="button" variant="ghost" onClick={() => removeModule(mi)}>
                  Удалить
                </Button>
              )}
            </div>

            {module.lessons.map((lesson, li) => (
              <div key={li} className={styles.lessonRow}>
                <Input
                  label={`Урок ${li + 1}`}
                  value={lesson.title}
                  onChange={(e) => updateLesson(mi, li, { title: e.target.value })}
                  placeholder="Название урока"
                  className={styles.grow}
                />
                <Select
                  label="Тип"
                  options={LESSON_TYPE_OPTIONS}
                  value={lesson.type}
                  onChange={(e) => updateLesson(mi, li, { type: e.target.value as LessonType })}
                />
                <Input
                  label="Мин"
                  type="number"
                  min={0}
                  value={lesson.durationMin}
                  onChange={(e) => updateLesson(mi, li, { durationMin: e.target.value })}
                  placeholder="20"
                  className={styles.minutes}
                />
                {module.lessons.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => removeLesson(mi, li)}>
                    ✕
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              leftIcon={<PlusIcon width={16} height={16} />}
              onClick={() => addLesson(mi)}
            >
              Добавить урок
            </Button>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        leftIcon={<PlusIcon width={16} height={16} />}
        onClick={addModule}
      >
        Добавить модуль
      </Button>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button type="submit" loading={submitting} disabled={!title.trim()}>
          Создать курс
        </Button>
      </div>
    </form>
  );
}
