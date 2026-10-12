# Spec Delta

## ADDED Requirements

### Requirement: CI выполняет проверки качества

CI SHALL на каждом пул-реквесте и пуше в `main` и `develop` выполнять проверку типов, ESLint, Stylelint, `prettier --check` по проекту, тесты и `openspec validate --all --strict`. Падение любой проверки SHALL делать прогон CI красным. Версия openspec SHALL быть закреплена в `package.json`.

#### Scenario: Коммит в обход хуков

- **WHEN** в пул-реквест попал файл, отформатированный не по Prettier, закоммиченный с `--no-verify`
- **THEN** CI падает на `format:check`

#### Scenario: Требование без сценария

- **WHEN** в change добавлено требование без `#### Scenario:`
- **THEN** CI падает на проверке спек, не дожидаясь архива change
