# Spec Delta

## ADDED Requirements

### Requirement: Даты и числа через Intl

Даты, время и числа SHALL форматироваться через `Intl` и общий форматтер `shared/lib/format.ts`, с одним форматом и одним часовым поясом на всё приложение. Импорт библиотек дат (`dayjs`, `moment`, `date-fns`, `luxon`) SHALL запрещаться правилом ESLint.

#### Scenario: Импорт библиотеки дат

- **WHEN** в файле `src/` появляется `import dayjs from 'dayjs'`
- **THEN** `pnpm lint` падает с подсказкой использовать `formatDateTime` из `@/shared/lib`

#### Scenario: Одно событие на разных экранах

- **WHEN** время одного прогона показано в списке и на экране прогона
- **THEN** оба экрана выводят его в одном формате и одном поясе
