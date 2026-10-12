# Spec Delta

## MODIFIED Requirements

### Requirement: Фиксация версии Node.js

Версия Node.js SHALL быть зафиксирована в файле `.nvmrc` и в поле `engines.node` файла `package.json`. Используется мажорная версия `24` (Node 24 LTS). Мажорная версия SHALL поставлять Corepack: через него приходит pnpm.

#### Scenario: Переключение версии Node через nvm

- **WHEN** разработчик выполняет `nvm use` в корне проекта
- **THEN** активируется последняя LTS-версия Node.js 24.x

#### Scenario: Проверка engine-strict

- **WHEN** разработчик с версией Node.js ниже 24 выполняет `pnpm install`
- **THEN** установка прерывается с ошибкой engine mismatch

### Requirement: pnpm-workspace конфигурация

Файл `pnpm-workspace.yaml` SHALL содержать `onlyBuiltDependencies` с перечислением пакетов, которым разрешена сборка нативных бинарников (например, `esbuild`).

Настройки pnpm SHALL задаваться в `pnpm-workspace.yaml`: pnpm 12 не читает из `.npmrc` ничего, кроме авторизации. Файл SHALL содержать `engineStrict: true` и `autoInstallPeers: true`.

#### Scenario: Сборка esbuild

- **WHEN** выполняется `pnpm install`
- **THEN** esbuild собирается для текущей платформы
- **AND** `pnpm build` завершается без ошибки «You installed esbuild for another platform»

#### Scenario: Автоматическая установка peer-зависимостей

- **WHEN** выполняется `pnpm install`
- **THEN** peer-зависимости устанавливаются автоматически без ручного вмешательства

## REMOVED Requirements

### Requirement: Конфигурация .npmrc

**Reason**: pnpm 12 не читает `engine-strict` и `auto-install-peers` из `.npmrc`: `pnpm config get engine-strict` возвращает `undefined`, и установка на Node ниже `engines.node` проходила без ошибки. Требование описывало настройку, которая не действовала.

**Migration**: те же настройки задаются в `pnpm-workspace.yaml` как `engineStrict: true` и `autoInstallPeers: true` (требование «pnpm-workspace конфигурация»); `.npmrc` удаляется.
