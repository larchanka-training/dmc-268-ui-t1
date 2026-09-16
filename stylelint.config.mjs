/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**', 'node_modules/**', 'pnpm-lock.yaml', 'coverage/**'],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'theme',
          'utility',
          'layer',
          'container',
        ],
      },
    ],
    'import-notation': null,
    'no-descending-specificity': null,
  },
}
