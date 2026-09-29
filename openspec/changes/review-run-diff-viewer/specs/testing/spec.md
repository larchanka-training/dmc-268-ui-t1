## MODIFIED Requirements

### Requirement: Smoke-тест App

Интеграционный тест `src/pages/review-run/ui/ReviewRunPage.test.tsx` SHALL рендерить страницу прогона с подменённым транспортом данных и проверять её наблюдаемое поведение через `@testing-library/user-event`. Сетевой слой SHALL подменяться на уровне `ApiTransport`, а не `fetch`.

#### Scenario: Рендер страницы прогона

- **WHEN** страница прогона рендерится в тесте с подменённым транспортом
- **THEN** заголовок «Прогон ревью» присутствует в документе

#### Scenario: Выбор файла пользователем

- **WHEN** пользователь выбирает другой файл в списке изменённых файлов
- **THEN** показывается дифф выбранного файла

### Requirement: Co-location тестов

Тестовые файлы SHALL располагаться рядом с тестируемым модулем: `Foo.tsx` → `Foo.test.tsx`. Глобальный setup SHALL быть единственным в `src/test/setup.ts`. Фабрики тестовых данных SHALL располагаться в `src/test/factories.ts`.

#### Scenario: Структура тестовых файлов

- **WHEN** проверяется структура `src/`
- **THEN** тест `ReviewRunPage.test.tsx` находится рядом с `ReviewRunPage.tsx`
- **AND** единственный setup-файл находится в `src/test/setup.ts`
