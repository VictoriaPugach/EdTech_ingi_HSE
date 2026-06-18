import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../ui/Button';
import { useAuth } from '../../../../hooks/useAuth';
import { sessionsApi } from '../../../../services/sessions';
import styles from './StartClassButton.module.scss';

interface StartClassButtonProps {
  /** Заголовок занятия. По умолчанию — «Занятие <дата>». */
  title?: string;
  /** Привязать живое занятие к уроку курса (необязательно). */
  lessonId?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Кнопка «Создать занятие» для преподавателя/админа. Создаёт групповую сессию
 * и переходит на неё; ученики подключаются по ссылке к тому же групповому звонку
 * (видео + код + чат). У студентов не отображается.
 */
export function StartClassButton({
  title,
  lessonId,
  fullWidth = false,
  size = 'md',
}: StartClassButtonProps) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) return null;

  async function start() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const defaultTitle = `Занятие ${new Date().toLocaleDateString('ru-RU')}`;
      const session = await sessionsApi.create(token, {
        title: title?.trim() || defaultTitle,
        mode: 'group',
        lessonId,
      });
      navigate(`/s/${session.id}`);
    } catch {
      setError('Не удалось создать занятие. Попробуйте ещё раз.');
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size={size} fullWidth={fullWidth} loading={loading} onClick={start}>
        📹 Создать занятие
      </Button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
