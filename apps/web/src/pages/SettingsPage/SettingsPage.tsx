import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import styles from './SettingsPage.module.scss';

export function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Настройки" subtitle="Параметры аккаунта и приложения" />

      <section className={styles.placeholder}>
        <span className={styles.emoji} aria-hidden="true">🚧</span>
        <p className={styles.placeholderText}>Экран в доработке</p>
        <p className={styles.placeholderHint}>
          Здесь появятся смена пароля, язык интерфейса и уведомления.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.accountText}>
          <h2 className={styles.accountTitle}>Аккаунт</h2>
          <p className={styles.accountHint}>Завершить текущую сессию на этом устройстве.</p>
        </div>
        <Button variant="danger" onClick={handleLogout}>
          Выйти из профиля
        </Button>
      </section>
    </div>
  );
}
