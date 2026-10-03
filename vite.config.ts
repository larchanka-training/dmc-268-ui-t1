/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    open: true,
  },
  test: {
    environment: 'jsdom',
    // Интеграционные тесты экрана рендерят настоящий diff viewer на сотнях строк:
    // локально самый тяжёлый идёт ~1.7 с, на раннере CI втрое дольше, и дефолтные 5 с
    // срабатывают как ложный провал, а не как сигнал.
    testTimeout: 15000,
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/setup.ts',
        'src/main.tsx',
        '**/*.config.{ts,js}',
        'coverage/',
      ],
    },
  },
})
