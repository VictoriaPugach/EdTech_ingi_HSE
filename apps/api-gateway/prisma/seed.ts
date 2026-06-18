/**
 * Seed-скрипт: тестовые пользователи для локальной разработки.
 *
 * Запуск:
 *   npx tsx prisma/seed.ts
 *   — или через package.json: npm run db:seed
 *
 * Тестовые аккаунты:
 *   🛡️  Администратор:  admin@test.com    / Admin123!
 *   👩‍🏫 Преподаватель: teacher@test.com  / Teacher123!
 *   👦  Ученик:         student@test.com  / Student123!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const testUsers = [
  {
    email:    'admin@test.com',
    password: 'Admin123!',
    name:     'Мария Администраторова',
    role:     'ADMIN' as const,
  },
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
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
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

    const roleLabel =
      u.role === 'ADMIN' ? '🛡️ Администратор'
      : u.role === 'TEACHER' ? '👩‍🏫 Преподаватель'
      : '👦 Ученик';
    console.log(`  ${roleLabel}  ${user.email}  (id: ${user.id})`);
  }

  await seedDemoCourse();

  console.log('\n✅ Seed выполнен успешно.');
  console.log('\n📋 Тестовые учётные данные:');
  console.log('   🛡️   admin@test.com     /  Admin123!');
  console.log('   👩‍🏫  teacher@test.com  /  Teacher123!');
  console.log('   👦   student@test.com   /  Student123!');
}

/**
 * Демо-курс «Python Basics» с модулями, уроками, контент-блоками и материалами.
 * Идемпотентно: удаляем существующий курс по slug и создаём заново.
 */
async function seedDemoCourse() {
  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@test.com' } });
  if (!teacher) return;

  const slug = 'python-basics';
  await prisma.course.deleteMany({ where: { slug } });

  await prisma.course.create({
    data: {
      slug,
      title: 'Python Basics',
      summary: 'Изучаем основы Python с нуля: синтаксис, переменные, условия и циклы.',
      description:
        'Базовый курс программирования на Python для начинающих. Разберём синтаксис, типы данных, условия, циклы и функции на практических примерах.',
      level: 'BEGINNER',
      language: 'PYTHON',
      status: 'PUBLISHED',
      estimatedHours: 24,
      authorId: teacher.id,
      modules: {
        create: [
          {
            title: 'Введение',
            order: 0,
            lessons: {
              create: [
                {
                  title: 'Что такое Python',
                  summary: 'Знакомство с языком и его возможностями.',
                  type: 'READING',
                  durationMin: 15,
                  order: 0,
                  blocks: {
                    create: [
                      {
                        order: 0,
                        kind: 'TEXT',
                        data: {
                          markdown:
                            'Python — высокоуровневый язык программирования. Он простой в изучении и применяется в вебе, анализе данных и автоматизации.',
                        },
                      },
                      {
                        order: 1,
                        kind: 'CODE',
                        data: { language: 'python', code: 'print("Hello, world!")', runnable: true },
                      },
                    ],
                  },
                  materials: {
                    create: [
                      { title: 'Конспект урока', format: 'pdf', sizeBytes: 250880, url: 'https://example.com/intro.pdf' },
                    ],
                  },
                },
                {
                  title: 'Первая программа',
                  summary: 'Пишем и запускаем первый скрипт.',
                  type: 'PRACTICE',
                  durationMin: 30,
                  order: 1,
                },
              ],
            },
          },
          {
            title: 'Функции и параметры',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Функции и параметры в Python',
                  summary: 'Функция — это блок кода, который выполняет определённую задачу.',
                  type: 'LIVE_CODING',
                  durationMin: 90,
                  order: 0,
                  blocks: {
                    create: [
                      {
                        order: 0,
                        kind: 'TEXT',
                        data: {
                          markdown:
                            'На уроке разберём создание функций, передачу параметров и возврат значений.',
                        },
                      },
                      {
                        order: 1,
                        kind: 'CODE',
                        data: {
                          language: 'python',
                          code: 'def greet(name):\n    return f"Привет, {name}!"\n\nprint(greet("Антон"))',
                          runnable: true,
                        },
                      },
                      {
                        order: 2,
                        kind: 'CALLOUT',
                        data: { tone: 'info', markdown: 'Параметры по умолчанию делают функции гибче.' },
                      },
                    ],
                  },
                  materials: {
                    create: [
                      { title: 'Слайды занятия', format: 'pdf', sizeBytes: 250880, url: 'https://example.com/functions.pdf' },
                      { title: 'Домашнее задание', format: 'pdf', sizeBytes: 128000, url: 'https://example.com/hw.pdf' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('\n📚 Демо-курс «Python Basics» создан (slug: python-basics).');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
