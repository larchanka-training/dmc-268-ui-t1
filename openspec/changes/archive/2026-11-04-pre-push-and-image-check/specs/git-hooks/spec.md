## MODIFIED Requirements

### Requirement: pre-push хук — полные проверки

Хук `.githooks/pre-push` SHALL запускать `pnpm test && pnpm build`; типы проверяет `tsc` внутри `pnpm build`. Хук SHALL блокировать push при падении любой из проверок.

#### Scenario: Успешный push

- **WHEN** тесты проходят, типы корректны, сборка успешна
- **THEN** pre-push хук завершается успешно
- **AND** push выполняется

#### Scenario: Блокировка push при падении тестов

- **WHEN** хотя бы один тест падает
- **THEN** pre-push хук прерывается на этапе `pnpm test`
- **AND** push не выполняется
