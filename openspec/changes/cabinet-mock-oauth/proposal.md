# Proposal

## Why

Нужен клиентский кабинет с mock OAuth (GitHub/GitLab), списком и подключением репозиториев до готовности бэкенда. Реализация уже есть в PR #16, но без OpenSpec-change и с отклонениями от `AGENTS.md` (FSD, TanStack Query, валидация границ). Change фиксирует требования и план доработок по ревью.

## What Changes

- Mock OAuth: редирект, callback, хранение сессии, автообновление access-токена (мок).
- App shell: sidebar, header, навигация, статус авторизации, светлая/тёмная тема.
- Страницы: обзор, список подключённых репозиториев, подключение нового репозитория.
- Рефакторинг под FSD (`app` → `pages` → `widgets` → `features` → `entities` → `shared`).
- Серверные (мок) данные репозиториев через TanStack Query.
- Валидация сессии из `localStorage` как `unknown` (блокирующее замечание ревью).
- Тесты на границу сессии и ключевые сценарии auth/репозиториев.
- UI на Ant Design (учебный кабинет; отдельный change на Tailwind-only — вне scope).

## Capabilities

### New Capabilities

- `cabinet-auth`: mock OAuth, сессия, защита маршрутов, валидация persisted session.
- `cabinet-shell`: провайдеры приложения, маршрутизация в слое `app`, layout кабинета.
- `cabinet-repositories`: список подключённых и подключение доступных репозиториев (mock API + Query).

### Modified Capabilities

Нет — в `openspec/specs/` пока нет опубликованных capability для кабинета.

## Impact

- Зависимости: `antd`, `@ant-design/icons`, `react-router-dom`, `dayjs`, `@tanstack/react-query`.
- Структура `src/`: переезд с плоских `api/`, `auth/`, `routes/` на FSD-слои.
- `README.md`: раздел кабинета и переменные `VITE_*`.
- PR #16: после merge — `Closes #<номер задачи>` (номер issue уточнить в трекере команды).
