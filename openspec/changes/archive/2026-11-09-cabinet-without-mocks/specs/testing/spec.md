## MODIFIED Requirements

### Requirement: Smoke-тест экрана прогона

Интеграционный тест `src/pages/review-run/ui/ReviewRunView.test.tsx` SHALL рендерить экран прогона с фейком `ApiTransport` и проверять её наблюдаемое поведение через `@testing-library/user-event`. Данные SHALL подменяться на уровне `ApiTransport`, а не `fetch`.

#### Scenario: Рендер экрана прогона

- **WHEN** экран прогона рендерится в тесте с фейком `ApiTransport`
- **THEN** заголовок «Прогон ревью» присутствует в документе

#### Scenario: Выбор файла пользователем

- **WHEN** пользователь выбирает другой файл в списке изменённых файлов
- **THEN** показывается дифф выбранного файла
