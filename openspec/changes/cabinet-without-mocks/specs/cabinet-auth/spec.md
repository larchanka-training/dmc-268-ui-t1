## REMOVED Requirements

### Requirement: Мок сессии в dev-сервере

**Reason**: бэкенд реализует вход и все ручки кабинета; мок стал второй реализацией контракта без пользы (ui#107).
**Migration**: локальный запуск — против бэкенда (`make run-local` в `dmc-268-api-t1`) со своей GitHub App; dev-сервер проксирует `/api` на него — требование «Dev-сервер проксирует API».

## ADDED Requirements

### Requirement: Dev-сервер проксирует API

В режиме разработки dev-сервер Vite SHALL проксировать `/api` на `VITE_API_PROXY_TARGET` (по умолчанию `http://localhost:8000`) без переписывания пути, пропуская cookie, и SHALL NOT отвечать на `/api` сам. Код экранов SHALL NOT зависеть от того, запущен ли он в dev-сервере.

#### Scenario: Локальный запуск против бэкенда

- **WHEN** dev-сервер запущен, и приложение запросило `GET /api/v1/auth/me`
- **THEN** запрос уходит на `VITE_API_PROXY_TARGET` по тому же пути `/api/v1/auth/me` вместе с cookie `session`

#### Scenario: Локальный запуск без сессии

- **WHEN** разработчик открыл `/app/` в dev-сервере без cookie `session`, а бэкенд ответил на `GET /api/v1/auth/me` `401`
- **THEN** приложение уводит на `/login`
