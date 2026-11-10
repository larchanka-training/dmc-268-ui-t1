# Proposal

## Why

Задача [#109](https://github.com/larchanka-training/dmc-268-ui-t1/issues/109), frontend-половина
родителя larchanka-training/dmc-268-api-t1#281. Бэкенд отдаёт агрегаты `GET /api/v1/analytics`, а
в кабинете их негде посмотреть: нет ни динамики замечаний по категориям, ни длительности
прогонов по репозиториям.

## What Changes

- Контракт API синхронизирован с `develop` бэкенда (`pnpm api:sync`): ручка `getAnalytics` и схемы
  `AnalyticsResponse`. Тем же контрактом в `UserResponse` пришло поле `id`: схема профиля его
  разбирает, кабинет не использует.
- Страница «Аналитика» (`/analytics`) и пункт меню: фильтры репозитория, периода (7, 30, 90 и
  180 дней) и важности замечаний; итоги по прогонам, диаграмма замечаний по UTC-дням и
  категориям, таблица по репозиториям.
- Зависимость `@ant-design/charts` 2.6.7 для диаграммы.
- «Повторить» после сбоя ленивой диаграммы и просмотрщика диффа (`widgets/review-workspace`)
  перезагружает страницу: `React.lazy` запоминает упавшую загрузку чанка, а после деплоя старого
  чанка нет вовсе.

**Не входит**: произвольный диапазон дат (RangePicker тянет `dayjs`, запрещённый правилом
репозитория), диаграмма длительности по репозиториям, выгрузка данных.

## Capabilities

### New Capabilities

- `cabinet-analytics`: страница аналитики кабинета.

### Modified Capabilities

Нет.

## Impact

- Код: `src/shared/api/contract/*` (генерация), `src/entities/analytics`, `src/pages/analytics`, `src/entities/session`
  (поле `id`), `src/app/router`, `src/widgets/app-shell`, `src/widgets/review-workspace`
  (повтор просмотрщика диффа), `src/shared/lib` (`navigation.reload`, `formatShortUtcDay`).
- Зависимости: `@ant-design/charts` 2.6.7.
