# Design

## Контекст

Кабинет строится на стеке `develop` (Vite 8, React 19, pnpm, Vitest). Бэкенд OAuth пока недоступен — mock-адаптеры с той же границей, что будущий HTTP-клиент.

## Решения

### FSD-раскладка

| Было                            | Станет                                            |
| ------------------------------- | ------------------------------------------------- |
| `src/routes/AppRouter.tsx`      | `src/app/router/AppRouter.tsx`                    |
| `src/auth/*`, `src/theme/*`     | `src/features/auth`, `src/features/theme`         |
| `src/components/layout/*`       | `src/widgets/app-shell`                           |
| `src/types/*`, `src/api/mock/*` | `src/entities/session`, `src/entities/repository` |
| `src/config`, `src/i18n`        | `src/shared/config`, `src/shared/lib`             |
| `src/pages/*`                   | `src/pages/<route>/ui` + `index.ts`               |

Публичный API слайса — только через `index.ts`. Импорты между слоями — сверху вниз.

### Сессия и localStorage

- **Мок:** сессия в `localStorage` допустима для демо; refresh/access короткоживущие.
- **Граница:** `loadSession()` парсит JSON как `unknown`, валидирует форму `AuthSession`; при ошибке — `clearSession()` и `null` (без падения в `useState`).
- **Прод:** refresh в httpOnly-cookie, access в памяти вкладки — контракт с API (`dmc-268-api-t1`); в design зафиксировано, не блокирует мок-PR.

### Данные репозиториев

- `@tanstack/react-query`: `useConnectedRepositories`, `useAvailableRepositories`, `useConnectRepository` (mutation + invalidate).
- Mock-реализация в `entities/repository/api` (или `shared/api/mock` с реэкспортом в entity).

### Провайдеры (`app/providers`)

Порядок: `QueryClientProvider` → `ThemeProvider` → `AuthProvider` → `ConfigProvider` (antd, `ru_RU`) → router.

### Тестирование

- Unit: `parseAuthSession` / `loadSession` — битые записи в storage.
- Component: экран входа (уже есть), `RequireAuth` редирект, OAuth callback (state mismatch) — с `MemoryRouter` и моками.

## Риски

- Объём переноса файлов — один PR с полным FSD-первым шагом для кабинета.
- Ant Design vs правило «без UI-китов» в `frontend.md` — согласовано для учебного кабинета в proposal; унификация на Tailwind — отдельный change.
