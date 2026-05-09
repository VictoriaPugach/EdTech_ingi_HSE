/**
 * Seed-скрипт: тестовые пользователи для локальной разработки.
 *
 * Запуск:
 *   npx tsx prisma/seed.ts
 *   — или через package.json: npm run db:seed
 *
 * Тестовые аккаунты:
 *   👩‍🏫 Преподаватель: teacher@test.com  / Teacher123!
 *   👦  Ученик:         student@test.com  / Student123!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const testUsers = [
  {
    email:    'teacher@test.com',
    password: 'Teacher123!',
    name:     'Анна Преподавателева',
    role:     'TEACHER' as const,
  },
  {
    email:    'student@test.com',
    password: 'Student123!',
    name:     'Иван Студентов',
    role:     'STUDENT' as const,
    ageYears: 14,
  },
] satisfies Array<{
  email: string;
  password: string;
  name: string;
  role: 'TEACHER' | 'STUDENT';
  ageYears?: number;
}>;

async function main() {
  console.log('🌱 Запуск seed-скрипта...\n');

  for (const u of testUsers) {
    const passwordHash = bcrypt.hashSync(u.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash, name: u.name },
      create: {
        email: u.email,
        passwordHash,
        name:     u.name,
        role:     u.role,
        ageYears: 'ageYears' in u ? u.ageYears : undefined,
      },
    });

    const roleLabel = u.role === 'TEACHER' ? '👩‍🏫 Преподаватель' : '👦 Ученик';
    console.log(`  ${roleLabel}  ${user.email}  (id: ${user.id})`);
  }

  console.log('\n✅ Seed выполнен успешно.');
  console.log('\n📋 Тестовые учётные данные:');
  console.log('   👩‍🏫  teacher@test.com  /  Teacher123!');
  console.log('   👦   student@test.com   /  Student123!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
