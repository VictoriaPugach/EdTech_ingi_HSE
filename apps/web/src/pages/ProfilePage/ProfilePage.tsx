import { useRef, useState, type ChangeEvent } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import type { UpdateProfilePatch } from '../../services/users/usersApi';
import styles from './ProfilePage.module.scss';

const MAX_AVATAR_PX = 256;
const ROLE_LABEL: Record<string, string> = {
  teacher: 'Преподаватель',
  admin: 'Администратор',
  student: 'Ученик',
};

/**
 * Уменьшает выбранное изображение до квадрата ≤ MAX_AVATAR_PX и отдаёт data URL.
 * Так аватар компактно помещается в БД/localStorage и не упирается в лимиты.
 */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode-failed'));
      img.onload = () => {
        const scale = Math.min(1, MAX_AVATAR_PX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no-canvas'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const currentAvatar = user.avatarUrl ?? null;
  const trimmed = name.trim();
  const dirty = trimmed !== user.name || avatar !== currentAvatar;

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // позволяем выбрать тот же файл повторно
    if (!file) return;
    setError('');
    setSaved(false);
    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения');
      return;
    }
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch {
      setError('Не удалось обработать изображение');
    }
  };

  const handleSave = async () => {
    if (!trimmed) {
      setError('Имя не может быть пустым');
      return;
    }
    const patch: UpdateProfilePatch = {};
    if (trimmed !== user.name) patch.name = trimmed;
    if (avatar !== currentAvatar) patch.avatarUrl = avatar;
    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    setError('');
    try {
      await updateProfile(patch);
      setSaved(true);
    } catch {
      setError('Не удалось сохранить изменения. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName(user.name);
    setAvatar(currentAvatar);
    setError('');
    setSaved(false);
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Профиль" subtitle="Управляйте данными своего аккаунта" />

      <section className={styles.card}>
        <div className={styles.avatarBlock}>
          <Avatar src={avatar ?? undefined} name={trimmed || user.name} size="lg" />
          <div className={styles.avatarActions}>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {avatar ? 'Сменить фото' : 'Загрузить фото'}
            </Button>
            {avatar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatar(null);
                  setSaved(false);
                }}
              >
                Удалить фото
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          </div>
        </div>

        <div className={styles.fields}>
          <Input
            label="Имя"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="Ваше имя"
            maxLength={80}
          />
          <Input label="Электронная почта" value={user.email} disabled readOnly hint="Email пока изменить нельзя" />
          <Input label="Роль" value={ROLE_LABEL[user.role] ?? user.role} disabled readOnly />
        </div>

        {error && (
          <div className={styles.alert} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}
        {saved && !dirty && (
          <div className={styles.success} role="status">
            <span>✅</span> Изменения сохранены
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
            Сохранить
          </Button>
          <Button variant="ghost" onClick={handleReset} disabled={!dirty || saving}>
            Отменить
          </Button>
        </div>
      </section>
    </div>
  );
}
