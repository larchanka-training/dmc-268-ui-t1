## MODIFIED Requirements

### Requirement: Smoke-тест App

Интеграционный тест `src/pages/review-run/ui/ReviewRunView.test.tsx` SHALL рендерить экран прогона с подменённым adapter данных и проверять её наблюдаемое поведение через `@testing-library/user-event`. Данные SHALL подменяться на уровне `ApiTransport`, а не `fetch`.

#### Scenario: Рендер экрана прогона

- **WHEN** экран прогона рендерится в тесте с подменённым adapter
- **THEN** заголовок «Прогон ревью» присутствует в документе

#### Scenario: Выбор файла пользователем

- **WHEN** пользователь выбирает другой файл в списке изменённых файлов
- **THEN** показывается дифф выбранного файла

### Requirement: Co-location тестов

Тестовые файлы SHALL располагаться рядом с тестируемым модулем: `Foo.tsx` → `Foo.test.tsx`. Глобальный setup SHALL быть единственным в `src/test/setup.ts`. Фабрики тестовых данных SHALL располагаться в `src/test/factories.ts`.

#### Scenario: Структура тестовых файлов

- **WHEN** проверяется структура `src/`
- **THEN** тест `ReviewRunView.test.tsx` находится рядом с `ReviewRunView.tsx`
- **AND** единственный setup-файл находится в `src/test/setup.ts`
