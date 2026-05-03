/**
 * Корневая конфигурация ESLint для всех TypeScript-пакетов монорепо.
 * Базовые правила; пакеты с особенностями (web — React) переопределяют сверху.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '*.cjs',
    '*.config.js',
    '*.config.ts',
    'apps/api-gateway/prisma/**',
    'apps/hint-service/**',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off',
  },
};
