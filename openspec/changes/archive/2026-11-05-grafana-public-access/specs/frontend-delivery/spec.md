## ADDED Requirements

### Requirement: Публичный вход проксирует Grafana стенда

Интерфейс SHALL перенаправлять запросы под `/grafana/` в Grafana стенда внутри серверного сетевого окружения, а `/grafana` — на `/grafana/`. Путь SHALL доходить до Grafana с префиксом `/grafana/`: Grafana отдаёт себя из подпути сама. Grafana SHALL получать адрес стенда из запроса, адрес клиента и схему. Переход на WebSocket SHALL проходить. Без Grafana интерфейс SHALL запускаться и работать.

#### Scenario: Открытие Grafana

- **WHEN** браузер открывает `/grafana/login` по адресу стенда
- **THEN** Grafana получает запрос на `/grafana/login` и отдаёт страницу входа, а её статика под `/grafana/public/` загружается

#### Scenario: Адрес без слеша

- **WHEN** браузер открывает `/grafana`
- **THEN** ответ — `301` на `/grafana/`

#### Scenario: Grafana Live

- **WHEN** браузер открывает WebSocket на `/grafana/api/live/ws`
- **THEN** соединение переходит на WebSocket с Grafana

#### Scenario: Grafana недоступна

- **WHEN** контейнера Grafana нет или он не отвечает
- **THEN** `/grafana/` отвечает 502, остальные маршруты работают

### Requirement: Вход в Grafana — по личной учётной записи

Доступ к Grafana под `/grafana/` SHALL решать сама Grafana по личной учётной записи: cookie сессии кабинета для `/grafana/` SHALL NOT проверяться. Частота попыток входа `POST /grafana/login` с одного адреса SHALL быть ограничена; открытие страницы входа (`GET`) в лимит SHALL NOT засчитываться.

#### Scenario: Гость кабинета открывает Grafana

- **WHEN** клиент без cookie сессии кабинета открывает `/grafana/login`
- **THEN** он получает страницу входа Grafana, а не редирект на `/login` кабинета

#### Scenario: Перебор пароля

- **WHEN** попытки входа `POST /grafana/login` с одного адреса превышают лимит частоты
- **THEN** ответ 429, Grafana запроса не получает

### Requirement: Ответы Grafana несут свои заголовки безопасности

Ответы под `/grafana/` SHALL содержать `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` и `Content-Security-Policy`, запрещающую встраивание во фрейм, а по HTTPS — ещё `Strict-Transport-Security` и `Alt-Svc`. Политика содержимого кабинета на них SHALL NOT распространяться: под ней Grafana не работает.

#### Scenario: Заголовки ответа Grafana

- **WHEN** приходит ответ под `/grafana/`, в том числе 502
- **THEN** в нём `X-Content-Type-Options`, `Referrer-Policy` и `Content-Security-Policy` с `frame-ancestors 'none'`, но без `script-src` кабинета

#### Scenario: Ответ Grafana по HTTPS

- **WHEN** ответ под `/grafana/` идёт по HTTPS
- **THEN** в нём есть `Strict-Transport-Security` с `max-age` и `Alt-Svc` с `h3`
