import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button }   from '../../components/ui/Button';
import { Input }    from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Tabs }     from '../../components/ui/Tabs';
import { RoleCard } from '../../components/features/auth/RoleCard';
import { useAuth }  from '../../hooks/useAuth';
import { AuthApiError } from '../../contexts/AuthContext';
import styles from './LoginPage.module.scss';

// --- Статические импорты через Vite (файлы в src/assets) --------------------
import logoSvg           from '../../assets/icons/logo/logo.svg';
import teacherCardIcon   from '../../assets/icons/features/teacher-card.svg';
import studentCardIcon   from '../../assets/icons/features/student-card.svg';
import ftTogetherIcon    from '../../assets/icons/features/ft-together.svg';
import ftHintIcon        from '../../assets/icons/features/ft-hint.svg';
import ftProgressIcon    from '../../assets/icons/features/ft-progress.svg';
import ftSafetyIcon      from '../../assets/icons/features/ft-safety.svg';
import ftOnlineIcon      from '../../assets/icons/features/ft-online.svg';
import heroCodingImg     from '../../assets/images/illustrations/hero-coding.svg';

type Tab = 'login' | 'register';

// ─── Inline SVG-иконки для полей форм ────────────────────────────────────────

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ─── Блок выбора роли (переиспользуется в обеих формах) ──────────────────────

function RoleSelector({
  role,
  onRoleChange,
}: {
  role: 'student' | 'teacher';
  onRoleChange: (r: 'student' | 'teacher') => void;
}) {
  return (
    <div className={styles.roleSection}>
      <p className={styles.roleSectionTitle}>Выберите роль в платформе</p>
      <div className={styles.roleGrid}>
        <RoleCard
          icon={<img src={teacherCardIcon} alt="" />}
          title="Я — преподаватель"
          description="Создавайте курсы, проводите занятия и отслеживайте прогресс учеников"
          selected={role === 'teacher'}
          onSelect={() => onRoleChange('teacher')}
        />
        <RoleCard
          icon={<img src={studentCardIcon} alt="" />}
          title="Я — ученик"
          description="Учитесь программировать, выполняйте задания и получайте подсказки"
          selected={role === 'student'}
          onSelect={() => onRoleChange('student')}
        />
      </div>
    </div>
  );
}

// ─── LoginForm ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: email.trim(), password: password.trim(), rememberMe: remember });
      onSuccess();
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(
          err.code === 'InvalidCredentials'
            ? 'Неверный email или пароль'
            : 'Произошла ошибка. Попробуйте позже.',
        );
      } else {
        setError('Нет соединения с сервером');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {error && (
        <div className={styles.errorAlert} role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      <Input
        type="email"
        placeholder="Электронная почта"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<EmailIcon />}
        required
        autoComplete="email"
      />

      <Input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<LockIcon />}
        required
        autoComplete="current-password"
      />

      <div className={styles.formRow}>
        <Checkbox
          label="Запомнить меня"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <button type="button" className={styles.forgotLink}>
          Забыли пароль?
        </button>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        Войти
      </Button>
    </form>
  );
}

// ─── RegisterForm ─────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register } = useAuth();
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState<'student' | 'teacher'>('student');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    setLoading(true);
    try {
      await register({ email: email.trim(), password: password.trim(), name: name.trim(), role });
      onSuccess();
    } catch (err) {
      if (err instanceof AuthApiError) {
        setError(
          err.code === 'EmailAlreadyExists'
            ? 'Пользователь с таким email уже существует'
            : 'Произошла ошибка. Попробуйте позже.',
        );
      } else {
        setError('Нет соединения с сервером');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {error && (
        <div className={styles.errorAlert} role="alert">
          <span>⚠️</span> {error}
        </div>
      )}

      <Input
        type="text"
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        leftIcon={<UserIcon />}
        required
        autoComplete="name"
      />

      <Input
        type="email"
        placeholder="Электронная почта"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<EmailIcon />}
        required
        autoComplete="email"
      />

      <Input
        type="password"
        placeholder="Пароль (минимум 8 символов)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<LockIcon />}
        required
        autoComplete="new-password"
      />

      <RoleSelector role={role} onRoleChange={setRole} />

      <Button type="submit" fullWidth loading={loading}>
        Зарегистрироваться
      </Button>
    </form>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('register');

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
  const handleSuccess = () => navigate(from, { replace: true });

  const tabs = [
    { id: 'login',    label: 'Вход',         content: <LoginForm    onSuccess={handleSuccess} /> },
    { id: 'register', label: 'Регистрация',   content: <RegisterForm onSuccess={handleSuccess} /> },
  ];

  return (
    <div className={styles.page}>
      {/* Фиксированный мобильный хедер: бренд виден при скролле (на десктопе скрыт,
          там логотип живёт в hero-панели). */}
      <header className={styles.mobileHeader}>
        <img src={logoSvg} alt="EdTech Collab" className={styles.mobileHeaderLogo} />
      </header>

      <div className={styles.content}>
        {/* ── Левая: hero-панель ───────────────────────────────────────── */}
        <section className={styles.hero}>

        {/* Логотип */}
        <div className={styles.logo}>
          <img src={logoSvg} alt="EdTech Collab" className={styles.logoImg} />
        </div>

        {/* Заголовок */}
        <div className={styles.heroHeadline}>
          <span className={styles.headlineMain}>Учись программировать.</span>
          <span className={styles.headlineAccent}>Создавай будущее.</span>
        </div>

        <p className={styles.heroSubtitle}>
          Платформа для совместного обучения программированию детей от 7 до 17 лет.
        </p>

        {/* Фичи */}
        <div className={styles.features}>
          <FeatureItem iconSrc={ftTogetherIcon}  colorMod="purple" title="Учись вместе"
            desc="Работайте над кодом в реальном времени с одноклассниками и преподавателем" />
          <FeatureItem iconSrc={ftHintIcon}      colorMod="green"  title="Умные подсказки"
            desc="Получайте подсказки и объяснения, когда это действительно нужно" />
          <FeatureItem iconSrc={ftProgressIcon}  colorMod="blue"   title="Достижения и прогресс"
            desc="Выполняйте задания, получайте достижения и отслеживайте свой прогресс" />
        </div>

        {/* Нижние бейджи */}
        <div className={styles.badges}>
          <BadgeItem iconSrc={ftSafetyIcon} title="Безопасная среда" desc="Ваши данные защищены" />
          <BadgeItem iconSrc={ftOnlineIcon} title="Онлайн обучение"  desc="Живые занятия" />
        </div>
        </section>

        {/* Плавающая hero-иллюстрация под контентом обеих колонок */}
        <div className={styles.floatingIllustration} aria-hidden="true">
          <img
            src={heroCodingImg}
            alt=""
            className={styles.heroImg}
          />
        </div>

        {/* ── Правая: карточка авторизации ────────────────────────────── */}
        <section className={styles.authPanel}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h1 className={styles.cardTitle}>Добро пожаловать!</h1>
              <p className={styles.cardSubtitle}>Войдите в свой аккаунт или создайте новый</p>
            </div>

            <Tabs tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as Tab)} />
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Вспомогательные sub-компоненты ──────────────────────────────────────────

function FeatureItem({
  iconSrc, colorMod, title, desc,
}: {
  iconSrc: string;
  colorMod: 'purple' | 'green' | 'blue';
  title: string;
  desc: string;
}) {
  return (
    <div className={styles.featureItem}>
      <div className={`${styles.featureIconBox} ${styles[`featureIconBox--${colorMod}`]}`}>
        <img src={iconSrc} alt="" className={styles.featureIconImg} />
      </div>
      <div className={styles.featureText}>
        <span className={styles.featureTitle}>{title}</span>
        <span className={styles.featureDesc}>{desc}</span>
      </div>
    </div>
  );
}

function BadgeItem({ iconSrc, title, desc }: { iconSrc: string; title: string; desc: string }) {
  return (
    <div className={styles.badge}>
      <div className={styles.badgeIcon}>
        <img src={iconSrc} alt="" />
      </div>
      <div className={styles.badgeText}>
        <span className={styles.badgeTitle}>{title}</span>
        <span className={styles.badgeDesc}>{desc}</span>
      </div>
    </div>
  );
}
