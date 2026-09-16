## Purpose

Управление зависимостями проекта через pnpm с фиксацией версий Node.js и pnpm для воспроизводимого окружения.

## ADDED Requirements

### Requirement: Package manager — pnpm

Проект SHALL использовать pnpm как единственный package manager. Файл `pnpm-lock.yaml` SHALL быть закоммичен в репозиторий. Файл `package-lock.json` SHALL отсутствовать.

#### Scenario: Установка зависимостей через pnpm

- **WHEN** разработчик выполняет `pnpm install` в свежем клоне репозитория
- **THEN** зависимости устанавливаются из `pnpm-lock.yaml` без ошибок
- **AND** файл `pnpm-lock.yaml` присутствует и актуален

#### Scenario: Отсутствие npm lock-файла

- **WHEN** проверяется содержимое репозитория
- **THEN** файл `package-lock.json` отсутствует

### Requirement: Фиксация версии pnpm

Версия pnpm SHALL быть зафиксирована в `package.json` через поле `packageManager`. Поле `engines.pnpm` в `package.json` SHALL указывать минимальную совместимую версию.

#### Scenario: Совместимость версии pnpm

- **WHEN** разработчик выполняет `pnpm install`
- **THEN** используется версия pnpm из поля `packageManager`
- **AND** если версия pnpm ниже указанной в `engines.pnpm`, установка прерывается с ошибкой

### Requirement: Фиксация версии Node.js

Версия Node.js SHALL быть зафиксирована в файле `.nvmrc` и в поле `engines.node` файла `package.json`. Используется мажорная версия `22` (Node 22 LTS).

#### Scenario: Переключение версии Node через nvm

- **WHEN** разработчик выполняет `nvm use` в корне проекта
- **THEN** активируется последняя LTS-версия Node.js 22.x

#### Scenario: Проверка engine-strict

- **WHEN** разработчик с версией Node.js ниже 22 выполняет `pnpm install`
- **THEN** установка прерывается с ошибкой engine mismatch

### Requirement: Конфигурация .npmrc

Файл `.npmrc` в корне проекта SHALL содержать `auto-install-peers=true` и `engine-strict=true`.

#### Scenario: Автоматическая установка peer-зависимостей

- **WHEN** выполняется `pnpm install`
- **THEN** peer-зависимости устанавливаются автоматически без ручного вмешательства

### Requirement: pnpm-workspace конфигурация

Файл `pnpm-workspace.yaml` SHALL содержать `onlyBuiltDependencies` с перечислением пакетов, которым разрешена сборка нативных бинарников (например, `esbuild`).

#### Scenario: Сборка esbuild

- **WHEN** выполняется `pnpm install`
- **THEN** esbuild собирается для текущей платформы
- **AND** `pnpm build` завершается без ошибки «You installed esbuild for another platform»
