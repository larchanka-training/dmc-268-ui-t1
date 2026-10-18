import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  {
    // openapi.json и schema.d.ts кладёт pnpm api:sync из контракта бэкенда; правятся
    // только перегенерацией, поэтому линтер их не проверяет.
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'src/shared/api/contract/openapi.json',
      'src/shared/api/contract/schema.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Даты и числа — через Intl и общий форматтер: один формат и один пояс на всё приложение.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['dayjs', 'dayjs/*', 'moment', 'moment/*', 'date-fns', 'date-fns/*', 'luxon'],
              message: 'Даты форматируем через Intl: formatDateTime из @/shared/lib.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  prettierConfig,
)
