import { existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function run(cmd, title) {
  console.log(`\n▶ ${title}`);
  execSync(cmd, { stdio: 'inherit' });
}

function runQuiet(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForService(serviceName, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const services = runQuiet('docker compose ps --services --filter status=running')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (services.includes(serviceName)) {
      console.log(`✓ Сервис ${serviceName} запущен`);
      return;
    }

    await sleep(2000);
  }

  throw new Error(`Сервис ${serviceName} не запустился за ${timeoutMs / 1000}с`);
}

async function main() {
  try {
    run('docker info >NUL', 'Проверка Docker Engine');
  } catch {
    console.error('\n✗ Docker Engine недоступен. Запусти Docker Desktop и повтори команду.');
    process.exit(1);
  }

  if (!existsSync('.env') && existsSync('.env.example')) {
    copyFileSync('.env.example', '.env');
    console.log('✓ Создан .env из .env.example');
  }

  run('docker compose up -d --build', 'Сборка и запуск контейнеров');
  await waitForService('api-gateway');

  // В контейнере используем migrate deploy, чтобы не создавать shadow DB
  // (иначе возможна ошибка P3006 для расширения citext).
  run('docker compose exec -T api-gateway npx prisma migrate deploy', 'Применение миграций Prisma');
  run('docker compose exec -T api-gateway npm run db:seed', 'Создание тестовых пользователей');

  console.log('\n✅ Готово. Сервисы запущены и БД подготовлена.');
  console.log('   Web:          http://localhost:5173');
  console.log('   API docs:     http://localhost:4000/docs');
  console.log('   Realtime:     ws://localhost:4001/ws');
  console.log('   Hint docs:    http://localhost:4002/docs');
  console.log('\nТестовые аккаунты:');
  console.log('  - teacher@test.com / Teacher123!');
  console.log('  - student@test.com / Student123!');
}

main().catch((err) => {
  console.error('\n✗ Ошибка запуска:\n', err.message || err);
  process.exit(1);
});

