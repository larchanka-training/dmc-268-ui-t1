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

## 5. Доработки по ревью

- [x] 5.1 `/reviews/:reviewId` под `RequireAuth`; тест: гость на `/app/reviews/42` уходит на `/login?redirect=/app/reviews/42`
- [x] 5.2 Профиль `['auth','me']` перезапрашивается при возврате в вкладку (`staleTime` 30 с, `refetchOnWindowFocus`; при монтировании не перезапрашивается): выход в другой вкладке замечается без перезагрузки
- [x] 5.3 Выход при `401`/`403` на `/auth/logout` — одна навигация на `/`: опция `redirectOn401: false` у `apiFetch`
- [x] 5.4 `vite.config.ts` читает `VITE_USE_MOCK_API` и `PUBLIC_ORIGIN` через `loadEnv` (файлы `.env*` и оболочка)
- [x] 5.5 Приветствие и аватар при пустом `name`/`avatar_url` берут логин (`||`)
- [x] 5.6 `CURRENT_USER_KEY` убран из публичного входа `features/auth`
- [x] 5.7 Тесты: `/app/unknown`, глубокая ссылка и гость на `/app/repositories` на уровне `App`, `RequireAuth` при сбое сети и 5xx
- [x] 5.8 CI: job `build`: сборка проходит, и в `dist` нет фикстуры мока входа (защита от импорта `src/build/mockAuth.ts` в код приложения)
- [x] 5.9 Единый сетевой вход в `shared/api`: `ApiError` в `errors.ts` с полем `code` из тела `{code, message}`; `createHttpTransport()` построен на `apiFetch`, чтобы реальный транспорт не обошёл обработку `401`; `403 ORIGIN_FORBIDDEN` на `/login` не уводит. Кабинет по-прежнему работает на mock adapter
- [x] 5.10 Профиль запрашивает один `RequireAuth` в корне маршрутов; шапка и обзор берут его из кэша через `useCurrentUser()` без `null`, выход — `useLogout()`
