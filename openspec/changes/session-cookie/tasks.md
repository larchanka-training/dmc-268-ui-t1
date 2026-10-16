## 1. Спеки

- [x] 1.1 Архив `cabinet-mock-oauth`: требования #16 в `openspec/specs/`
- [x] 1.2 В `landing-page` задача 4.1 помечена как перенесённая сюда

## 2. Сессия

- [x] 2.1 `entities/session`: тип `CurrentUser`, разбор ответа `/auth/me` из `unknown`, `fetchCurrentUser`, `logout`; токены, `tokenStorage`, `restoreSession`, `mockAuthApi` удалены
- [x] 2.2 Общий `fetch` к API: `credentials: 'include'`, без `Authorization`; `401` → `/login?redirect=<путь>`
- [x] 2.3 `features/auth`: `AuthProvider` на TanStack Query, `RequireAuth` без собственного `/login`, `logout`; `oauth.ts` удалён

## 3. Приложение

- [x] 3.1 Роутер под `basename="/app"`; `LoginPage`, `OAuthCallbackPage` и их маршруты удалены
- [x] 3.2 Шапка и обзор: профиль из `/auth/me`, кнопка «Выйти»
- [x] 3.3 Dev-сервер: мок `/api/v1/auth/me` и `/logout` по cookie `session`; `VITE_OAUTH_REDIRECT_URI` удалён

## 4. Проверка

- [x] 4.1 Тесты: `401` → `/login?redirect`, профиль из `/auth/me`, ответ вне схемы, выход и сбой выхода, отсутствие `Authorization`
- [x] 4.2 README: локальный вход — cookie `session` с любым значением
- [ ] 4.3 Стенд: вход через GitHub, кабинет открывается, выход уводит на `/`
