# Spec Delta

## MODIFIED Requirements

### Requirement: Фиксация версии pnpm

Версия pnpm SHALL быть зафиксирована в `package.json` через поле `packageManager`. Поле `engines.pnpm` в `package.json` SHALL указывать минимальную совместимую версию.

pnpm SHALL предоставляться Corepack из состава Node.js — локально, в CI и в образе. Отдельная установка pnpm (глобальный `npm install -g`, сторонние action, скрипты установки) SHALL NOT использоваться.

#### Scenario: Совместимость версии pnpm

- **WHEN** разработчик выполняет `pnpm install`
- **THEN** используется версия pnpm из поля `packageManager`
- **AND** если версия pnpm ниже указанной в `engines.pnpm`, установка прерывается с ошибкой

#### Scenario: pnpm в CI

- **WHEN** job CI устанавливает зависимости
- **THEN** pnpm запускается через Corepack той версии, что указана в `packageManager`, без отдельного шага установки pnpm
