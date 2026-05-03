/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Дружелюбная детская палитра (НФТ-4)
        brand: {
          50: '#eef9ff',
          100: '#d9f0ff',
          200: '#bce4ff',
          400: '#52b6ff',
          500: '#1f9aff',
          600: '#0c7be0',
          700: '#0e63b3',
        },
      },
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
